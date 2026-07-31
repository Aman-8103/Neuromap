"""
NeuroMap v2 — Flask Backend (ONNX Runtime Engine)
=================================================
Ultra-lightweight high-performance brain tumor classification API.
Uses ONNX Runtime instead of PyTorch to stay well under Render Free Tier limits (<100MB RAM vs 512MB limit).

Downloads model weights from Hugging Face Hub (Kushal2114/neuromap-model).

API endpoints:
  GET  /          → serves the main UI
  POST /predict   → upload MRI, returns prediction + Grad-CAM + segmentation mask
  GET  /health    → model status
"""

import os
import io
import base64
import traceback
import numpy as np
import cv2
import onnxruntime as ort
from PIL import Image
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from huggingface_hub import hf_hub_download


# ══════════════════════════════════════════════════════════════════════════════
# NEUROSEG — Hybrid Brain Segmentation Algorithm
# ══════════════════════════════════════════════════════════════════════════════

class NeuroSeg:
    """
    Custom hybrid brain segmentation algorithm for MRI preprocessing.
    """

    def __init__(self, clahe_clip=3.0, clahe_grid=(8, 8),
                 morph_kernel_sz=15, target_size=224):
        self.clahe_clip      = clahe_clip
        self.clahe_grid      = clahe_grid
        self.morph_kernel_sz = morph_kernel_sz
        self.target_size     = target_size

    def _stage1_clahe(self, gray):
        clahe = cv2.createCLAHE(clipLimit=self.clahe_clip, tileGridSize=self.clahe_grid)
        return clahe.apply(gray)

    def _stage2_dual_threshold(self, enhanced):
        blurred  = cv2.GaussianBlur(enhanced, (5, 5), 0)
        _, otsu  = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        adaptive = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                         cv2.THRESH_BINARY, blockSize=35, C=2)
        return cv2.bitwise_and(otsu, adaptive)

    def _stage3_morphological(self, binary_mask):
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (self.morph_kernel_sz, self.morph_kernel_sz))
        opened  = cv2.morphologyEx(binary_mask, cv2.MORPH_OPEN,  kernel)
        closed  = cv2.morphologyEx(opened,      cv2.MORPH_CLOSE, kernel)
        dilated = cv2.dilate(closed, kernel, iterations=1)
        return dilated

    def _stage4_watershed(self, enhanced, morphed):
        dist    = cv2.distanceTransform(morphed, cv2.DIST_L2, 5)
        _, sfg  = cv2.threshold(dist, 0.5 * dist.max(), 255, 0)
        sfg     = sfg.astype(np.uint8)
        sbg     = cv2.dilate(morphed, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (21, 21)), iterations=3)
        unknown = cv2.subtract(sbg, sfg)

        _, markers = cv2.connectedComponents(sfg)
        markers    = markers + 1
        markers[unknown == 255] = 0

        enhanced_3ch = cv2.cvtColor(enhanced, cv2.COLOR_GRAY2BGR)
        cv2.watershed(enhanced_3ch, markers)

        refined = np.zeros_like(morphed)
        refined[markers > 1] = 255
        return refined

    def _stage5_convex_hull(self, refined):
        n, labels, stats, _ = cv2.connectedComponentsWithStats(refined)
        final = np.zeros_like(refined)
        if n > 1:
            lg  = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
            tmp = np.zeros_like(refined)
            tmp[labels == lg] = 255
            cnts, _ = cv2.findContours(tmp, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if cnts:
                hull = cv2.convexHull(max(cnts, key=cv2.contourArea))
                cv2.fillConvexPoly(final, hull, 255)
        else:
            final = refined
        return final

    def segment(self, img_pil):
        img_np = np.array(img_pil.convert('RGB'))

        h, w = img_np.shape[:2]
        if w > h * 1.5:
            img_np = img_np[:, :w // 2]

        gray     = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
        enhanced = self._stage1_clahe(gray)
        binary   = self._stage2_dual_threshold(enhanced)
        morphed  = self._stage3_morphological(binary)
        refined  = self._stage4_watershed(enhanced, morphed)
        final    = self._stage5_convex_hull(refined)

        masked = cv2.bitwise_and(img_np, img_np, mask=final)
        coords = cv2.findNonZero(final)
        if coords is not None:
            x, y, bw, bh = cv2.boundingRect(coords)
            pad  = int(min(bw, bh) * 0.05)
            x    = max(0, x - pad)
            y    = max(0, y - pad)
            bw   = min(img_np.shape[1] - x, bw + 2 * pad)
            bh   = min(img_np.shape[0] - y, bh + 2 * pad)
            masked = masked[y:y+bh, x:x+bw]
            bbox = (x, y, bw, bh)
        else:
            bbox = (0, 0, img_np.shape[1], img_np.shape[0])

        resized = cv2.resize(masked, (self.target_size, self.target_size), interpolation=cv2.INTER_LINEAR)
        return Image.fromarray(resized), final, bbox


# ══════════════════════════════════════════════════════════════════════════════
# MODEL & INFERENCE — ONNX RUNTIME ENGINE
# ══════════════════════════════════════════════════════════════════════════════

CLASS_NAMES = ['glioma', 'meningioma', 'notumor', 'pituitary']

CLASS_INFO = {
    'glioma':     {'full_name': 'Glioma',           'description': 'Tumors arising from glial cells in the brain or spine.',   'severity': 'critical', 'color': '#E24B4A'},
    'meningioma': {'full_name': 'Meningioma',        'description': 'Usually benign tumors forming on the brain membranes.',    'severity': 'moderate', 'color': '#EF9F27'},
    'pituitary':  {'full_name': 'Pituitary Tumor',   'description': 'Abnormal growths in the pituitary gland, often benign.',  'severity': 'low',      'color': '#378ADD'},
    'notumor':    {'full_name': 'No Tumor Detected', 'description': 'No signs of tumor detected in the MRI scan.',              'severity': 'none',     'color': '#639922'},
}

# Preprocessing transforms (ImageNet normalization)
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD  = np.array([0.229, 0.224, 0.225], dtype=np.float32)

_segmenter = NeuroSeg(target_size=224)

# Global ONNX session and classifier weights
_onnx_session = None
_classifier_weights = None

HF_REPO_ID = os.environ.get('HF_REPO_ID', 'Kushal2114/neuromap-model')
CHECKPOINT_DIR = os.environ.get('MODEL_DIR', './checkpoints')


def load_onnx_engine():
    """Loads ONNX model and classifier weights from local cache or HF Hub."""
    global _onnx_session, _classifier_weights
    if _onnx_session is not None and _classifier_weights is not None:
        return _onnx_session, _classifier_weights

    os.makedirs(CHECKPOINT_DIR, exist_ok=True)
    onnx_path = os.path.join(CHECKPOINT_DIR, 'neuromap_best.onnx')
    weights_path = os.path.join(CHECKPOINT_DIR, 'classifier_weights.npz')

    # Download ONNX model if needed
    if not (os.path.exists(onnx_path) and os.path.getsize(onnx_path) > 1_000_000):
        print(f"⬇ Downloading ONNX model from HF Hub ({HF_REPO_ID})...")
        onnx_path = hf_hub_download(repo_id=HF_REPO_ID, filename='neuromap_best.onnx', local_dir=CHECKPOINT_DIR, local_dir_use_symlinks=False)

    # Download classifier weights if needed
    if not (os.path.exists(weights_path) and os.path.getsize(weights_path) > 10_000):
        print(f"⬇ Downloading classifier weights from HF Hub ({HF_REPO_ID})...")
        weights_path = hf_hub_download(repo_id=HF_REPO_ID, filename='classifier_weights.npz', local_dir=CHECKPOINT_DIR, local_dir_use_symlinks=False)

    print("⚡ Initializing ONNX Runtime Inference Session...")
    opts = ort.SessionOptions()
    opts.intra_op_num_threads = 2
    opts.inter_op_num_threads = 1
    opts.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
    opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

    _onnx_session = ort.InferenceSession(onnx_path, sess_options=opts, providers=['CPUExecutionProvider'])
    _classifier_weights = np.load(weights_path)
    print("✅ ONNX Engine initialized successfully!")
    return _onnx_session, _classifier_weights


def preprocess_image(seg_pil):
    """Normalize image to (1, 3, 224, 224) float32 numpy array."""
    img_np = np.array(seg_pil.resize((224, 224))).astype(np.float32) / 255.0
    img_norm = (img_np - MEAN) / STD
    tensor = np.transpose(img_norm, (2, 0, 1))[np.newaxis, ...]
    return tensor


def generate_gradcam_onnx(logits, features, target_idx, weights_npz):
    """
    Computes class activation map (CAM) directly from ONNX feature maps
    using exact classifier projection vectors.
    """
    fc1_w = weights_npz['fc1_w']
    fc1_b = weights_npz['fc1_b']
    fc2_w = weights_npz['fc2_w']

    feat_map = features[0] # (1536, 7, 7)
    pooled_feat = np.mean(feat_map, axis=(1, 2)) # (1536,)
    h1 = np.maximum(0, fc1_w @ pooled_feat + fc1_b) # (512,)

    # Effective channel weights for target class
    w_channel = (fc2_w[target_idx] * (h1 > 0)) @ fc1_w # (1536,)
    cam = np.sum(w_channel[:, None, None] * feat_map, axis=0)
    cam = np.maximum(cam, 0)
    cam = cv2.resize(cam, (224, 224))
    cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)
    return cam


def run_inference(image_bytes):
    """
    Full pipeline:
      image_bytes → NeuroSeg → ONNX Engine → CAM → overlay → JSON
    """
    session, weights_npz = load_onnx_engine()
    img_pil = Image.open(io.BytesIO(image_bytes)).convert('RGB')

    try:
        seg_pil, seg_mask, bbox = _segmenter.segment(img_pil)
    except Exception as e:
        print(f"NeuroSeg fallback: {e}")
        seg_pil  = img_pil.resize((224, 224))
        seg_mask = np.ones((224, 224), dtype=np.uint8) * 255
        bbox     = (0, 0, 224, 224)

    original_rgb = np.array(seg_pil)
    tensor = preprocess_image(seg_pil)

    # ONNX Inference call
    outputs = session.run(None, {'input': tensor})
    logits, features = outputs[0], outputs[1]

    # Softmax probabilities
    exp_logits = np.exp(logits[0] - np.max(logits[0]))
    probs = exp_logits / np.sum(exp_logits)
    pred_idx = int(np.argmax(probs))

    pred_class = CLASS_NAMES[pred_idx]
    info       = CLASS_INFO[pred_class]
    confidence = float(probs[pred_idx])

    # Encode segmentation mask
    mask_colored = cv2.applyColorMap(seg_mask, cv2.COLORMAP_BONE)
    _, buf       = cv2.imencode('.png', mask_colored)
    mask_b64     = base64.b64encode(buf).decode('utf-8')

    # Grad-CAM overlay
    gradcam_b64 = None
    tumor_area_px = 0
    tumor_area_pct = 0.0
    tumor_area_mm2 = 0.0
    if pred_class != 'notumor':
        heatmap = generate_gradcam_onnx(logits, features, pred_idx, weights_npz)
        hm_uint8   = (heatmap * 255).astype(np.uint8)
        hm_colored = cv2.applyColorMap(hm_uint8, cv2.COLORMAP_JET)
        hm_rgb     = cv2.cvtColor(hm_colored, cv2.COLOR_BGR2RGB)
        overlay    = (original_rgb.astype(float) * 0.55 + hm_rgb.astype(float) * 0.45).astype(np.uint8)

        _, thresh   = cv2.threshold(hm_uint8, int(255 * 0.7), 255, cv2.THRESH_BINARY)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            largest_contour = max(contours, key=cv2.contourArea)
            cv2.drawContours(overlay, [largest_contour], -1, (255, 255, 255), 2)
            tumor_area_px = int(cv2.contourArea(largest_contour))
            total_brain_px = int(cv2.countNonZero(cv2.cvtColor(original_rgb, cv2.COLOR_RGB2GRAY)))
            if total_brain_px > 0:
                tumor_area_pct = round((tumor_area_px / total_brain_px) * 100, 2)
            tumor_area_mm2 = round(tumor_area_px * 1.0, 1)

        _, buf      = cv2.imencode('.png', cv2.cvtColor(overlay, cv2.COLOR_RGB2BGR))
        gradcam_b64 = base64.b64encode(buf).decode('utf-8')

    _, buf   = cv2.imencode('.png', cv2.cvtColor(original_rgb, cv2.COLOR_RGB2BGR))
    orig_b64 = base64.b64encode(buf).decode('utf-8')

    return {
        'prediction':     pred_class,
        'confidence':     round(confidence * 100, 1),
        'full_name':      info['full_name'],
        'description':    info['description'],
        'severity':       info['severity'],
        'color':          info['color'],
        'probabilities':  {CLASS_NAMES[i]: round(float(probs[i]) * 100, 1) for i in range(4)},
        'gradcam_image':  gradcam_b64,
        'original_image': orig_b64,
        'mask_image':     mask_b64,
        'tumor_detected': pred_class != 'notumor',
        'low_confidence': confidence < 0.70,
        'bbox':           list(bbox),
        'tumor_area_px':  tumor_area_px,
        'tumor_area_pct': tumor_area_pct,
        'tumor_area_mm2': tumor_area_mm2,
    }


# ══════════════════════════════════════════════════════════════════════════════
# FLASK APP
# ══════════════════════════════════════════════════════════════════════════════

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'bmp'}


def allowed_file(fname):
    return '.' in fname and fname.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/predict', methods=['POST'])
def predict():
    if 'mri_scan' not in request.files:
        return jsonify({'error': 'No file. Use field name: mri_scan'}), 400
    f = request.files['mri_scan']
    if f.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    if not allowed_file(f.filename):
        return jsonify({'error': f'Unsupported type. Use: {", ".join(ALLOWED_EXTENSIONS)}'}), 400

    try:
        return jsonify(run_inference(f.read()))
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': f'Inference failed: {str(e)}'}), 500


@app.route('/health')
def health():
    try:
        session, _ = load_onnx_engine()
        loaded = session is not None
    except Exception:
        loaded = False
    return jsonify({'status': 'ok', 'engine': 'onnxruntime', 'model_loaded': loaded})


# Pre-initialize ONNX engine when Gunicorn imports app.py
try:
    load_onnx_engine()
except Exception as e:
    print(f"⚠ Engine initialization warning: {e}")


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)
