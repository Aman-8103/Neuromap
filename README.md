<p align="center">
  <img src="https://img.shields.io/badge/Python-3.8+-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/ONNX_Runtime-1.15+-005CED?style=for-the-badge&logo=onnx&logoColor=white" />
  <img src="https://img.shields.io/badge/PyTorch-2.0-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white" />
  <img src="https://img.shields.io/badge/Flask-2.x-000000?style=for-the-badge&logo=flask&logoColor=white" />
  <img src="https://img.shields.io/badge/OpenCV-4.x-5C3EE8?style=for-the-badge&logo=opencv&logoColor=white" />
  <img src="https://img.shields.io/badge/Hugging_Face-Model_Hub-FFD21E?style=for-the-badge&logo=huggingface&logoColor=black" />
</p>

# 🧠 NeuroMap — Brain Tumor Detection & Classification

A high-performance deep learning-powered medical imaging web application that detects and classifies brain tumors from MRI scans. NeuroMap leverages **EfficientNet-B3** coupled with a custom **5-stage hybrid segmentation algorithm (NeuroSeg)**, **Grad-CAM visual explainability**, **severity stratification**, and **tumor area estimation**.

The production backend is powered by **ONNX Runtime Engine** with automatic weight delivery from the **Hugging Face Model Hub**, optimized for ultra-low latency and minimal memory footprint (<100MB RAM) for cloud deployments.

---

## 📌 Table of Contents

- [Features](#-features)
- [NeuroSeg Pipeline](#-neuroseg-pipeline)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Dataset](#-dataset)
- [Model Architecture & Inference](#-model-architecture--inference)
- [Installation & Setup](#-installation--setup)
- [Usage](#-usage)
- [API Endpoints](#-api-endpoints)
- [Screenshots](#-screenshots)
- [Results & Performance](#-results--performance)
- [Contributing](#-contributing)
- [Medical Disclaimer](#-medical-disclaimer)
- [License](#-license)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **4-Class Classification** | Accurately identifies **Glioma**, **Meningioma**, **Pituitary Tumor**, or **No Tumor** |
| **NeuroSeg Algorithm** | Custom 5-stage hybrid skull-stripping & segmentation pipeline (CLAHE → Dual Threshold → Morphology → Watershed → Convex Hull) |
| **Grad-CAM Heatmaps** | Explainable AI (XAI) overlays showing activation maps and key focus regions |
| **Severity Grading** | 4-tier severity assessment — **Critical**, **High**, **Moderate**, **Low** based on confidence and tumor area |
| **Tumor Area Estimation** | Quantifies localized tumor regions in pixel count, brain area percentage, and estimated mm² |
| **Ultra-Lightweight Inference** | Powered by ONNX Runtime to operate effortlessly within constrained environments (e.g. Render free tier <512MB RAM) |
| **Interactive Dashboard** | Cyber-medical dark mode UI with interactive Grad-CAM blend sliders, tabs, and real-time processing indicators |
| **Automated Model Delivery** | Downloads optimized model weights directly from Hugging Face Hub (`Kushal2114/neuromap-model`) |

---

## 🔬 NeuroSeg Pipeline

NeuroSeg is a **custom hybrid brain segmentation algorithm** designed specifically for MRI preprocessing. It isolates relevant cerebral tissue from skull artifacts, ensuring clinical distribution consistency between training and inference.

```
Input MRI Scan ──> [Stage 1: CLAHE] ──> [Stage 2: Dual Threshold] ──> [Stage 3: Morphology]
                         │
                         └──> [Stage 4: Watershed] ──> [Stage 5: Convex Hull] ──> Segmented Brain
```

| Stage | Operation | Purpose |
|-------|-----------|---------|
| **Stage 1** | **CLAHE** | Contrast Limited Adaptive Histogram Equalization to normalize scanner intensities |
| **Stage 2** | **Dual Threshold** | Intersects Otsu & Adaptive Gaussian thresholds to isolate foreground brain tissue |
| **Stage 3** | **Morphology** | Open → Close → Dilate using elliptical kernels to eliminate fine noise and skull edge artifacts |
| **Stage 4** | **Watershed** | Seed-based Euclidean distance transform delineation for boundary separation |
| **Stage 5** | **Convex Hull** | Produces a smooth, anatomically uniform binary mask of the brain cavity |

---

## 🛠 Tech Stack

- **Deep Learning / Frameworks**: PyTorch 2.0 (Model Training), ONNX Runtime (Production Inference)
- **Model Backbone**: EfficientNet-B3 (Transfer Learning with custom classification head)
- **Computer Vision**: OpenCV (CLAHE, Morphological filters, Watershed), Pillow, NumPy
- **Backend**: Flask 2.x, Flask-CORS, Hugging Face Hub Client, Gunicorn
- **Frontend**: HTML5, Vanilla CSS3 (Custom Cyber-Medical Theme), JavaScript (ES6+)
- **Typography & Icons**: Google Fonts (Outfit, Plus Jakarta Sans, JetBrains Mono), Custom SVG

---

## 📁 Project Structure

```
Neuromap/
├── app.py                                  # Flask backend, NeuroSeg engine & ONNX inference
├── requirements.txt                        # Python dependencies
├── Dockerfile                              # Container configuration
├── render.yaml                             # Render cloud deployment specification
├── vercel.json                             # Vercel configuration
├── templates/
│   └── index.html                          # Cyber-medical web dashboard
├── static/
│   ├── css/
│   │   └── style.css                       # Styling and layout theme
│   ├── js/
│   │   └── app.js                          # Client-side file handling, sliders & API requests
│   └── samples/                            # Sample MRI scans for one-click testing
│       ├── glioma.jpg
│       ├── meningioma.jpg
│       ├── pituitary.jpg
│       └── notumor.jpg
├── checkpoints/                            # Local weights directory (optional / auto-downloaded)
│   └── neuromap_best.onnx
├── 01_Model_Architecture_NeuroSeg.ipynb    # Model architecture & development notebook
├── 02_Training_Evaluation (2).ipynb        # Training & evaluation pipeline notebook
├── DEPLOYMENT_PRESENTATION_GUIDE.md        # Deployment and live demo guidelines
└── README.md                               # Project documentation
```

---

## 📊 Dataset

The model was trained on the **Brain Tumor MRI Dataset** containing **7,200 MRI scans** across 4 classes:

| Class | Description | Severity Level |
|-------|-------------|----------------|
| **Glioma** | Tumors originating from glial cells in the brain or spine | Critical |
| **Meningioma** | Typically slow-growing tumors arising from the meninges | Moderate |
| **Pituitary** | Abnormal growths originating in the pituitary gland | Low |
| **No Tumor** | Healthy brain control MRI scans | None |

Data preprocessing applies contrast normalization, NeuroSeg skull extraction, center-cropping, and augmentation (rotations, flips, and affine adjustments).

---

## ⚡ Model Architecture & Inference

1. **Backbone**: EfficientNet-B3 pre-trained on ImageNet.
2. **Fine-Tuning Strategy**: Top 20% layers unfrozen, bottom 80% frozen.
3. **Classifier Head**:
   ```
   Dropout(0.4) → Linear(1536, 512) → ReLU → Dropout(0.2) → Linear(512, 4)
   ```
4. **Production Inference Engine (ONNX Runtime)**:
   - Exported to ONNX for up to **3x faster CPU execution**.
   - Model weights are pulled dynamically on server startup from Hugging Face Hub (`Kushal2114/neuromap-model`).
   - Memory footprint stays under **~95 MB**, eliminating OOM issues on free hosting tiers (e.g. Render).

---

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/Aman-8103/Neuromap.git
cd Neuromap
```

### 2. Create and Activate Virtual Environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the Application
```bash
python app.py
```
Open your browser and navigate to **`http://localhost:5000`**.

> **Note on Model Weights:** The application automatically downloads the optimized model weights (`neuromap_model.onnx`) from Hugging Face on the first run. No manual weight downloading is required.

---

## 💡 Usage

1. **Open the Dashboard** — Navigate to `http://localhost:5000` in your browser.
2. **Upload an MRI Scan** — Drag & drop or browse for an MRI image (PNG, JPG, BMP).
3. **Run Inference** — Click **"EXECUTE CLINICAL INFERENCE"**.
4. **View Comprehensive Analysis**:
   - Predicted tumor class with confidence score.
   - Severity badge (Critical / High / Moderate / Low).
   - Tumor area estimation (pixels, % of brain, approximate mm²).
   - Grad-CAM heatmap overlay showing model focus area.
   - Interactive blend slider to compare original vs. heatmap.
   - Patient-friendly recommendations for clinical next steps.

**Quick Test:** Click any of the 4 preset clinical workload cards to instantly run inference on sample scans.

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Serves the main dashboard UI |
| `POST` | `/predict` | Upload MRI scan, returns prediction + Grad-CAM + tumor area |
| `GET` | `/health` | Returns model status and inference engine health |

### POST `/predict`
* **Payload**: Form-data with image file key: `file` (or `mri_scan`).
* **Response (JSON)**:
```json
{
  "prediction": "Glioma",
  "confidence": 94.2,
  "full_name": "Glioma",
  "description": "Tumors arising from glial cells in the brain or spine.",
  "severity": "critical",
  "color": "#E24B4A",
  "probabilities": {
    "glioma": 94.2,
    "meningioma": 3.1,
    "pituitary": 1.8,
    "notumor": 0.9
  },
  "gradcam_image": "<base64_encoded_png>",
  "original_image": "<base64_encoded_png>",
  "mask_image": "<base64_encoded_png>",
  "tumor_detected": true,
  "tumor_area_px": 1250,
  "tumor_area_pct": 4.82,
  "tumor_area_mm2": 1250.0,
  "bbox": [45, 32, 120, 115]
}
```

---

## 📸 Screenshots

<p align="center">
  <img width="1102" height="537" alt="Dashboard Overview" src="https://github.com/user-attachments/assets/c70bb061-66b4-4937-abc7-856dd36c121d" />
</p>

<p align="center">
  <img width="1104" height="782" alt="Analysis Report" src="https://github.com/user-attachments/assets/711169e6-4443-4130-9dbe-4b7a091b89b2" />
</p>

---

## 📈 Results & Performance

| Metric | Value |
|--------|-------|
| **Test Accuracy** | **~90.2%** |
| **Dataset Size** | 7,200 MRI Scans |
| **Classes** | 4 (Glioma, Meningioma, Pituitary, No Tumor) |
| **Inference Engine** | ONNX Runtime (CPU Optimized) |
| **Memory Footprint** | <100 MB RAM |
| **Input Resolution** | 224 × 224 px |

---

## 🤝 Contributing

Contributions, bug reports, and suggestions are welcome!

1. Fork or clone the repository:
   ```bash
   git clone https://github.com/Aman-8103/Neuromap.git
   ```
2. Create a branch:
   ```bash
   git checkout -b feature/improvement-name
   ```
3. Commit your changes:
   ```bash
   git commit -m "feat: Describe your improvement"
   ```
4. Push to the branch:
   ```bash
   git push origin feature/improvement-name
   ```
5. Open a Pull Request or merge into main.

---

## ⚠️ Medical Disclaimer

> **This is a research and educational prototype.** This software is NOT approved for clinical diagnostic use. All predictions, severity grades, and heatmaps are AI-generated and must be verified by a board-certified radiologist or medical professional. Never make clinical or treatment decisions based solely on this tool's output.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
