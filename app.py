"""
NeuroMap v2 — Flask Backend
============================
Incorporates NeuroSeg: a custom hybrid brain segmentation algorithm
applied during both training (via notebooks) and inference (here).

API endpoints:
  GET  /          → serves the main UI
  POST /predict   → upload MRI, returns prediction + Grad-CAM + segmentation mask
  GET  /health    → model status
"""

import os
import io
import base64
import urllib.request
import traceback
import numpy as np
import cv2
import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models, transforms
from PIL import Image
from flask import Flask, request, jsonify, render_template


# ══════════════════════════════════════════════════════════════════════════════
# NEUROSEG — Proposed Hybrid Brain Segmentation Algorithm
# ══════════════════════════════════════════════════════════════════════════════
# 5-stage pipeline. No pretrained weights, no external models.
# Stage 1 — CLAHE              : adaptive contrast normalization
# Stage 2 — Dual Threshold     : Otsu ∩ Adaptive Gaussian (handles uneven illumination)
# Stage 3 — Morphological Ops  : open → close → dilate (noise removal + hole filling)
# Stage 4 — Watershed          : precise boundary delineation via distance transform
# Stage 5 — Convex Hull        : smooth anatomically consistent final mask

class NeuroSeg:
    """
    Custom hybrid brain segmentation algorithm for MRI preprocessing.
    Runs identically during training (notebooks) and inference (here),
    ensuring the model's training and test distributions match perfectly.
    """

    def __init__(self, clahe_clip=3.0, clahe_grid=(8, 8),
                 morph_kernel_sz=15, target_size=224):
        self.clahe_clip      = clahe_clip
        self.clahe_grid      = clahe_grid
        self.morph_kernel_sz = morph_kernel_sz
        self.target_size     = target_size

    def _stage1_clahe(self, gray):
        """CLAHE: normalize contrast region-by-region to handle scanner variation."""
        clahe = cv2.createCLAHE(clipLimit=self.clahe_clip,
                                 tileGridSize=self.clahe_grid)
        return clahe.apply(gray)

    def _stage2_dual_threshold(self, enhanced):
        """
        Fuse Otsu (global) and Adaptive Gaussian (local) thresholds with bitwise AND.
        Keeps only pixels BOTH methods agree are foreground → fewer false positives.
        """
        blurred  = cv2.GaussianBlur(enhanced, (5, 5), 0)
        _, otsu  = cv2.threshold(blurred, 0, 255,
                                  cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        adaptive = cv2.adaptiveThreshold(blurred, 255,
                       cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                       cv2.THRESH_BINARY, blockSize=35, C=2)
        return cv2.bitwise_and(otsu, adaptive)

    def _stage3_morphological(self, binary_mask):
        """
        Open → Close → Dilate with elliptical kernel.
        Open removes small noise blobs; Close fills internal holes;
        Dilate recovers boundary pixels eroded by opening.
        """
        kernel = cv2.getStructuringElement(
            cv2.MORPH_ELLIPSE,
            (self.morph_kernel_sz, self.morph_kernel_sz)
        )
        opened  = cv2.morphologyEx(binary_mask, cv2.MORPH_OPEN,  kernel)
        closed  = cv2.morphologyEx(opened,      cv2.MORPH_CLOSE, kernel)
        dilated = cv2.dilate(closed, kernel, iterations=1)
        return dilated

    def _stage4_watershed(self, enhanced, morphed):
        """
        Watershed with distance-transform seed selection.
        Sure-foreground seeds = pixels >50% of peak distance from edge.
        Fills the unknown boundary zone by growing from seeds,
        stopping at intensity ridges (skull-brain interface).
        """
        dist    = cv2.distanceTransform(morphed, cv2.DIST_L2, 5)
        _, sfg  = cv2.threshold(dist, 0.5 * dist.max(), 255, 0)
        sfg     = sfg.astype(np.uint8)
        sbg     = cv2.dilate(morphed,
                              cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (21, 21)),
                              iterations=3)
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
        """
        Keep largest connected component (the brain), wrap in convex hull.
        Convex hull fills concavities and produces smooth, anatomically valid mask.
        """
        n, labels, stats, _ = cv2.connectedComponentsWithStats(refined)
        final = np.zeros_like(refined)
        if n > 1:
            lg  = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
            tmp = np.zeros_like(refined)
            tmp[labels == lg] = 255
            cnts, _ = cv2.findContours(tmp, cv2.RETR_EXTERNAL,
                                        cv2.CHAIN_APPROX_SIMPLE)
            if cnts:
                hull = cv2.convexHull(max(cnts, key=cv2.contourArea))
                cv2.fillConvexPoly(final, hull, 255)
        else:
            final = refined
        return final

    def segment(self, img_pil):
        """
        Run the full 5-stage NeuroSeg pipeline.

        Args:
            img_pil : PIL Image (RGB, any size)

        Returns:
            segmented_pil : PIL Image — brain-only crop at target_size × target_size
            final_mask    : (H, W) uint8 binary numpy mask
            bbox          : (x, y, w, h) bounding box of brain region
        """
        img_np = np.array(img_pil.convert('RGB'))

        # Handle side-by-side composite scans (e.g. Google image with two brains)
        h, w = img_np.shape[:2]
        if w > h * 1.5:
            img_np = img_np[:, :w // 2]

        gray     = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
        enhanced = self._stage1_clahe(gray)
        binary   = self._stage2_dual_threshold(enhanced)
        morphed  = self._stage3_morphological(binary)
        refined  = self._stage4_watershed(enhanced, morphed)
        final    = self._stage5_convex_hull(refined)

        # Apply mask and crop to bounding box with 5% padding
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

        resized = cv2.resize(masked, (self.target_size, self.target_size),
                              interpolation=cv2.INTER_LINEAR)
        return Image.fromarray(resized), final, bbox


# ══════════════════════════════════════════════════════════════════════════════
# MODEL — EfficientNet-B3 with Grad-CAM
# ══════════════════════════════════════════════════════════════════════════════

CLASS_NAMES = ['glioma', 'meningioma', 'notumor', 'pituitary']

CLASS_INFO = {
    'glioma':     {'full_name': 'Glioma',           'description': 'Tumors arising from glial cells in the brain or spine.',   'severity': 'critical', 'color': '#E24B4A'},
    'meningioma': {'full_name': 'Meningioma',        'description': 'Usually benign tumors forming on the brain membranes.',    'severity': 'moderate', 'color': '#EF9F27'},
    'pituitary':  {'full_name': 'Pituitary Tumor',   'description': 'Abnormal growths in the pituitary gland, often benign.',  'severity': 'low',      'color': '#378ADD'},
    'notumor':    {'full_name': 'No Tumor Detected', 'description': 'No signs of tumor detected in the MRI scan.',              'severity': 'none',     'color': '#639922'},
}

TRANSFORM = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225])
])


class NeuroMapModel(nn.Module):
    """EfficientNet-B3 fine-tuned for 4-class brain tumor classification."""

    def __init__(self, num_classes=4, dropout_rate=0.4):
        super().__init__()
        self.backbone = models.efficientnet_b3(
            weights=models.EfficientNet_B3_Weights.IMAGENET1K_V1
        )
        total_layers = len(list(self.backbone.features.children()))
        for i, layer in enumerate(self.backbone.features.children()):
            if i < int(total_layers * 0.8):
                for param in layer.parameters():
                    param.requires_grad = False

        in_features = self.backbone.classifier[1].in_features
        self.backbone.classifier = nn.Sequential(
            nn.Dropout(p=dropout_rate, inplace=True),
            nn.Linear(in_features, 512),
            nn.ReLU(),
            nn.Dropout(p=dropout_rate / 2),
            nn.Linear(512, num_classes)
        )
        self.gradients  = None
        self.activations = None
        self._register_hooks()

    def _register_hooks(self):
        def fwd(m, i, o): self.activations = o.detach()
        def bwd(m, gi, go): self.gradients = go[0].detach()
        self.backbone.features[-1].register_forward_hook(fwd)
        self.backbone.features[-1].register_full_backward_hook(bwd)

    def forward(self, x):
        return self.backbone(x)

    def get_gradcam(self, x, class_idx=None):
        self.eval()
        x      = x.clone().requires_grad_(True)
        logits = self.forward(x)
        probs  = F.softmax(logits, dim=1)
        pred   = logits.argmax(dim=1).item()
        target = class_idx if class_idx is not None else pred

        self.backbone.zero_grad()
        one_hot = torch.zeros_like(logits)
        one_hot[0][target] = 1
        logits.backward(gradient=one_hot, retain_graph=True)

        weights = self.gradients.mean(dim=(2, 3), keepdim=True)
        cam     = (weights * self.activations).sum(dim=1).squeeze().cpu().numpy()
        cam     = np.maximum(cam, 0)
        cam     = cv2.resize(cam, (224, 224))
        cam     = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)
        return cam, pred, probs.squeeze().detach().cpu().numpy()


def load_model(checkpoint_path, device='cpu'):
    m = NeuroMapModel().to(device)
    ckpt = torch.load(checkpoint_path, map_location=device)
    m.load_state_dict(ckpt['model_state_dict'])
    m.eval()
    print(f"✅ Model loaded from {checkpoint_path}")
    return m


# ══════════════════════════════════════════════════════════════════════════════
# INFERENCE PIPELINE
# ══════════════════════════════════════════════════════════════════════════════

_segmenter = NeuroSeg(target_size=224)


def run_inference(model, image_bytes, device='cpu'):
    """
    Full pipeline:
      image_bytes → NeuroSeg → EfficientNet-B3 → Grad-CAM → overlay → JSON
    """
    img_pil = Image.open(io.BytesIO(image_bytes)).convert('RGB')

    # ── NeuroSeg preprocessing ────────────────────────────────────────────────
    try:
        seg_pil, seg_mask, bbox = _segmenter.segment(img_pil)
    except Exception as e:
        print(f"NeuroSeg fallback: {e}")
        seg_pil  = img_pil.resize((224, 224))
        seg_mask = np.ones((224, 224), dtype=np.uint8) * 255
        bbox     = (0, 0, 224, 224)

    original_rgb = np.array(seg_pil)   # segmented image for display
    tensor       = TRANSFORM(seg_pil).unsqueeze(0).to(device)

    # ── Prediction + Grad-CAM ────────────────────────────────────────────────
    heatmap, pred_idx, probs = model.get_gradcam(tensor)
    pred_class = CLASS_NAMES[pred_idx]
    info       = CLASS_INFO[pred_class]
    confidence = float(probs[pred_idx])

    # ── Encode segmentation mask for display ─────────────────────────────────
    mask_colored = cv2.applyColorMap(seg_mask, cv2.COLORMAP_BONE)
    _, buf       = cv2.imencode('.png', mask_colored)
    mask_b64     = base64.b64encode(buf).decode('utf-8')

    # ── Grad-CAM overlay (tumor classes only) ────────────────────────────────
    gradcam_b64 = None
    tumor_area_px = 0
    tumor_area_pct = 0.0
    tumor_area_mm2 = 0.0
    if pred_class != 'notumor':
        hm_uint8   = (heatmap * 255).astype(np.uint8)
        hm_colored = cv2.applyColorMap(hm_uint8, cv2.COLORMAP_JET)
        hm_rgb     = cv2.cvtColor(hm_colored, cv2.COLOR_BGR2RGB)
        overlay    = (original_rgb.astype(float) * 0.55 +
                      hm_rgb.astype(float) * 0.45).astype(np.uint8)

        _, thresh   = cv2.threshold(hm_uint8, int(255 * 0.7), 255, cv2.THRESH_BINARY)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            largest_contour = max(contours, key=cv2.contourArea)
            cv2.drawContours(overlay, [largest_contour], -1, (255, 255, 255), 2)

            # ── Compute tumor area ──────────────────────────────────────────
            tumor_area_px = int(cv2.contourArea(largest_contour))
            total_brain_px = int(cv2.countNonZero(
                cv2.cvtColor(original_rgb, cv2.COLOR_RGB2GRAY)
            ))
            if total_brain_px > 0:
                tumor_area_pct = round((tumor_area_px / total_brain_px) * 100, 2)
            # Approximate mm² assuming ~1 mm/px at 224×224 on a typical MRI FOV
            tumor_area_mm2 = round(tumor_area_px * 1.0, 1)

        _, buf      = cv2.imencode('.png', cv2.cvtColor(overlay, cv2.COLOR_RGB2BGR))
        gradcam_b64 = base64.b64encode(buf).decode('utf-8')

    # ── Encode segmented original for display ─────────────────────────────────
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
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'bmp'}
CHECKPOINT_PATH    = os.environ.get('MODEL_PATH', './checkpoints/neuromap_best.pth')
MODEL_URL          = 'https://github.com/Kushalgupta02/Brain-tumour/raw/main/checkpoints/neuromap_best.pth'
DEVICE             = 'cuda' if torch.cuda.is_available() else 'cpu'
model              = None


def download_model_if_needed(path, url):
    """Download model from GitHub if missing or is a tiny LFS pointer file."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    need_download = False
    if not os.path.exists(path):
        print(f"⬇ Model not found at {path}. Downloading...")
        need_download = True
    elif os.path.getsize(path) < 1_000_000:  # <1MB means it's an LFS pointer
        print(f"⬇ Model at {path} is only {os.path.getsize(path)} bytes (LFS pointer). Downloading real file...")
        need_download = True
    if need_download:
        try:
            print(f"⬇ Downloading model from {url} ...")
            urllib.request.urlretrieve(url, path)
            print(f"✅ Model downloaded: {os.path.getsize(path) / 1e6:.1f} MB")
        except Exception as e:
            print(f"❌ Failed to download model: {e}")
            return False
    return True


def get_model():
    global model
    if model is None:
        download_model_if_needed(CHECKPOINT_PATH, MODEL_URL)
        if os.path.exists(CHECKPOINT_PATH) and os.path.getsize(CHECKPOINT_PATH) > 1_000_000:
            model = load_model(CHECKPOINT_PATH, device=DEVICE)
            print(f"Device: {DEVICE}")
        else:
            print(f"⚠ No valid checkpoint at {CHECKPOINT_PATH}.")
    return model


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
    m = get_model()
    if m is None:
        return jsonify({'error': 'Model not loaded. Run training first.'}), 503
    try:
        return jsonify(run_inference(m, f.read(), device=DEVICE))
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': f'Inference failed: {str(e)}'}), 500


@app.route('/health')
def health():
    m = get_model()
    return jsonify({'status': 'ok', 'model_loaded': m is not None, 'device': DEVICE})


if __name__ == '__main__':
    get_model()
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)
