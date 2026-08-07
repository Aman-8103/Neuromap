<p align="center">
  <img src="https://img.shields.io/badge/Python-3.8+-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/PyTorch-2.0-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white" />
  <img src="https://img.shields.io/badge/Flask-2.x-000000?style=for-the-badge&logo=flask&logoColor=white" />
  <img src="https://img.shields.io/badge/OpenCV-4.x-5C3EE8?style=for-the-badge&logo=opencv&logoColor=white" />
</p>

# 🧠 NeuroMap — Brain Tumor Detection & Classification

A deep learning-powered web application that detects and classifies brain tumors from MRI scans using **EfficientNet-B3** with a custom **5-stage hybrid segmentation algorithm (NeuroSeg)**, **Grad-CAM explainability**, **severity classification**, and **tumor area estimation**.

---

## 📌 Table of Contents

- [Features](#-features)
- [NeuroSeg Pipeline](#-neuroseg-pipeline)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Dataset](#-dataset)
- [Model Architecture](#-model-architecture)
- [Installation & Setup](#-installation--setup)
- [Usage](#-usage)
- [API Endpoints](#-api-endpoints)
- [Screenshots](#-screenshots)
- [Results & Performance](#-results--performance)
- [Contributing](#-contributing)
- [Disclaimer](#-disclaimer)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **4-Class Classification** | Detects **Glioma**, **Meningioma**, **Pituitary Tumor**, or **No Tumor** |
| **NeuroSeg Algorithm** | Custom 5-stage hybrid brain segmentation pipeline (CLAHE → Dual Threshold → Morphology → Watershed → Convex Hull) |
| **Grad-CAM Heatmaps** | Visual explainability showing exactly where the model is focusing |
| **Severity Levels** | 4-tier severity classification — Critical, High, Moderate, Low |
| **Tumor Area Estimation** | Calculates tumor region in pixels, percentage of brain area, and approximate mm² |
| **Interactive Dashboard** | Cyber-medical themed UI with blend sliders, tabbed viewers, and pipeline visualization |
| **Patient-Friendly Recommendations** | Practical next-step guidance for each detected tumor type |
| **Preset Clinical Workloads** | Quick-test with built-in sample MRI scans |

---

## 🔬 NeuroSeg Pipeline

NeuroSeg is a **custom hybrid brain segmentation algorithm** designed specifically for MRI preprocessing. It runs identically during training and inference to ensure distribution consistency.

```
Input MRI → Stage 1 → Stage 2 → Stage 3 → Stage 4 → Stage 5 → Segmented Brain
```

| Stage | Operation | Purpose |
|-------|-----------|---------|
| **Stage 1** | CLAHE | Adaptive contrast normalization to handle scanner variation |
| **Stage 2** | Dual Threshold | Otsu ∩ Adaptive Gaussian — keeps only agreed-upon foreground pixels |
| **Stage 3** | Morphological Ops | Open → Close → Dilate with elliptical kernel for noise removal |
| **Stage 4** | Watershed | Distance transform seed-based boundary delineation |
| **Stage 5** | Convex Hull | Smooth, anatomically consistent final brain mask |

---

## 🛠 Tech Stack

**Backend:**
- Python 3.8+
- PyTorch 2.0 (EfficientNet-B3)
- Flask (Web Server)
- OpenCV 4.x (Image Processing)
- NumPy, Pillow

**Frontend:**
- HTML5, CSS3, Vanilla JavaScript
- Google Fonts (Outfit, Plus Jakarta Sans, JetBrains Mono)
- SVG Icons & Animations

---

## 📁 Project Structure

```
Brain-tumour/
├── app.py                          # Flask backend + NeuroSeg + Model inference
├── templates/
│   └── index.html                  # Main dashboard UI
├── static/
│   ├── css/
│   │   └── style.css               # Cyber-medical theme stylesheet
│   ├── js/
│   │   └── app.js                  # Frontend logic & interactivity
│   └── samples/                    # Preset MRI sample images
│       ├── glioma.jpg
│       ├── meningioma.jpg
│       ├── pituitary.jpg
│       └── notumor.jpg
├── checkpoints/                    # Trained model weights (not in repo)
│   └── neuromap_best.pth
├── Datasets/                       # Training data (not in repo)
├── 01_Model_Architecture_NeuroSeg.ipynb   # Model architecture notebook
├── 02_Training_Evaluation (2).ipynb       # Training & evaluation notebook
├── .gitignore
└── README.md
```

---

## 📊 Dataset

The model was trained on the **Brain Tumor MRI Dataset** containing **7,200 MRI scans** across 4 classes:

| Class | Description | Severity |
|-------|-------------|----------|
| Glioma | Tumors arising from glial cells | Critical |
| Meningioma | Usually benign tumors on brain membranes | Moderate |
| Pituitary | Abnormal growths in the pituitary gland | Low |
| No Tumor | Healthy brain scans | None |

---

## 🏗 Model Architecture

- **Backbone:** EfficientNet-B3 (pretrained on ImageNet)
- **Fine-Tuning Strategy:** Top 20% layers unfrozen, bottom 80% frozen
- **Classifier Head:**
  ```
  Dropout(0.4) → Linear(1536, 512) → ReLU → Dropout(0.2) → Linear(512, 4)
  ```
- **Training Configuration:**
  - Optimizer: AdamW
  - LR Scheduler: Cosine Annealing
  - Input Size: 224 × 224
  - Normalization: ImageNet mean/std
- **Grad-CAM:** Hooks on the last convolutional block for gradient-weighted class activation maps

---

## 🚀 Installation & Setup

### Prerequisites
- Python 3.8 or higher
- pip package manager

### 1. Clone the Repository

```bash
git clone https://github.com/Kushalgupta02/Brain-tumour.git
cd Brain-tumour
```

### 2. Install Dependencies

```bash
pip install torch torchvision flask opencv-python-headless numpy pillow
```

### 3. Add Model Checkpoint

Place your trained model file at:
```
checkpoints/neuromap_best.pth
```

> **Note:** The checkpoint file is not included in the repo due to size. Train the model using the provided notebooks or contact the maintainer.

### 4. Run the Application

```bash
python app.py
```

The server will start at **http://localhost:5000**

---

## 💡 Usage

1. **Open the Dashboard** — Navigate to `http://localhost:5000` in your browser
2. **Upload an MRI Scan** — Drag & drop or browse for a brain MRI image (PNG, JPG, BMP)
3. **Run Inference** — Click "EXECUTE CLINICAL INFERENCE"
4. **View Results** — The diagnostic cockpit shows:
   - Predicted tumor class with confidence score
   - Severity level badge (Critical / High / Moderate / Low)
   - Tumor area estimation (pixels, % of brain, approximate mm²)
   - Grad-CAM heatmap overlay showing model focus area
   - Interactive blend slider to compare original vs. heatmap
   - Patient-friendly recommendations for next steps

**Quick Test:** Click any of the 4 preset clinical workload cards to instantly run inference on sample scans.

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Serves the main dashboard UI |
| `POST` | `/predict` | Upload MRI scan, returns prediction + Grad-CAM + tumor area |
| `GET` | `/health` | Returns model status and device info |

### POST `/predict`

**Request:**
- Form field: `mri_scan` (image file)

**Response (JSON):**
```json
{
  "prediction": "glioma",
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



<img width="1470" height="956" alt="Screenshot 2026-08-07 at 9 59 08 AM" src="https://github.com/user-attachments/assets/4c04ff22-649c-4932-9d56-805034f77622" />

<img width="1470" height="956" alt="Screenshot 2026-08-07 at 9 59 49 AM" src="https://github.com/user-attachments/assets/c5edf78e-900a-435e-b0e6-e9bb04d35ba3" />
<img width="1470" height="956" alt="Screenshot 2026-08-07 at 10 00 08 AM" src="https://github.com/user-attachments/assets/770dd798-6bdb-44bc-b0b9-2337d390b798" />



---

## 📈 Results & Performance

| Metric | Value |
|--------|-------|
| Test Accuracy | ~90.2% |
| Dataset Size | 7,200 MRI Scans |
| Classes | 4 (Glioma, Meningioma, Pituitary, No Tumor) |
| Inference Device | CPU / CUDA (auto-detected) |
| Input Resolution | 224 × 224 px |

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## ⚠️ Disclaimer

> **This is a research and development project.** This tool is NOT approved for clinical diagnostic use. All predictions and recommendations are AI-generated and must be verified by a qualified medical professional (board-certified radiologist or neurologist). Do not make medical decisions based solely on this tool's output.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/Kushalgupta02">Kushal Gupta</a>
</p>
