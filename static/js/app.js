/**
 * NeuroMap v2.5 — Frontend Logic Engine
 * Cyber-medical dashboard client script.
 */

// ── CONSTANTS & MEDICAL META ─────────────────────────────────────────────────
const CLASS_COLORS = {
  glioma:     '#E24B4A', // Neon Red
  meningioma: '#EF9F27', // Neon Amber
  pituitary:  '#378ADD', // Neon Cyan
  notumor:    '#4CAF76'  // Neon Teal
};

const CLASS_DISPLAY = {
  glioma:     'Glioma Pathology Suspected',
  meningioma: 'Meningioma Pathology Suspected',
  pituitary:  'Pituitary Tumor Suspected',
  notumor:    'Normal Brain Study (No Tumor Detected)'
};

const SEVERITY_LEVELS = {
  glioma:     'CRITICAL',
  meningioma: 'MODERATE',
  pituitary:  'LOW',
  notumor:    'STABLE'
};

const CLINICAL_RECOMMENDATIONS = {
  glioma: `
    <div class="guidance-severity text-red">⚠ Glioma Detected — Please Take These Steps</div>
    <div class="guidance-section-label">Immediate Next Steps</div>
    <ul class="guidance-list">
      <li><strong>Consult a Neurologist or Neurosurgeon:</strong> Book an appointment with a brain specialist as soon as possible. Carry your MRI scan report and images to the consultation.</li>
      <li><strong>Get a Detailed MRI Done:</strong> Your doctor will likely order a contrast-enhanced MRI scan to get a clearer picture of the tumor's size, exact location, and whether it has spread.</li>
      <li><strong>Seek a Second Opinion:</strong> Gliomas are serious — consider getting a second opinion from another specialist or a major hospital with a neuro-oncology department before starting treatment.</li>
    </ul>
    <div class="guidance-section-label">What to Expect</div>
    <ul class="guidance-list">
      <li><strong>Biopsy or Surgery:</strong> The doctor may recommend removing a small sample of the tumor (biopsy) or surgically removing as much of it as safely possible to determine its exact type and grade.</li>
      <li><strong>Treatment Options:</strong> Depending on the grade, treatment may include surgery, radiation therapy, chemotherapy, or a combination. Your doctor will create a personalized treatment plan.</li>
      <li><strong>Follow-Up Scans:</strong> Regular MRI scans will be scheduled (every few months) to monitor how the tumor is responding to treatment.</li>
    </ul>
    <div class="guidance-section-label">Watch for These Warning Signs</div>
    <ul class="guidance-list">
      <li><strong>Severe Headaches:</strong> Persistent or worsening headaches, especially in the morning or those that wake you from sleep, need immediate medical attention.</li>
      <li><strong>Seizures:</strong> If you experience any seizure activity (uncontrolled shaking, blackouts, or unusual sensations), go to the emergency room immediately.</li>
      <li><strong>Vision or Speech Changes:</strong> Sudden blurred vision, difficulty speaking, weakness on one side of the body, or confusion — seek emergency care right away.</li>
    </ul>
    <div class="guidance-section-label">Taking Care of Yourself</div>
    <ul class="guidance-list">
      <li><strong>Mental Health Support:</strong> A diagnosis like this can be overwhelming. Talk to a counselor, join a support group, or confide in trusted family and friends.</li>
      <li><strong>Keep Records:</strong> Maintain a folder with all your scan reports, test results, and doctor notes. This helps when consulting multiple specialists.</li>
      <li><strong>Stay Informed:</strong> Ask your doctor to explain things in simple terms. Don't hesitate to ask questions about your diagnosis, treatment options, and what to expect.</li>
    </ul>
  `,
  meningioma: `
    <div class="guidance-severity text-amber">⚠ Meningioma Detected — Here's What You Should Do</div>
    <div class="guidance-section-label">Immediate Next Steps</div>
    <ul class="guidance-list">
      <li><strong>See a Neurosurgeon:</strong> Schedule a consultation with a neurosurgeon who can evaluate the tumor and discuss whether treatment is needed now or if it can be monitored over time.</li>
      <li><strong>Get a Detailed Scan:</strong> Your doctor may request a contrast MRI to better understand the tumor's size, location, and how it relates to surrounding brain structures.</li>
      <li><strong>Don't Panic:</strong> Most meningiomas are benign (non-cancerous) and grow slowly. Many people live with small meningiomas for years without needing surgery.</li>
    </ul>
    <div class="guidance-section-label">What to Expect</div>
    <ul class="guidance-list">
      <li><strong>Watch & Wait:</strong> If the tumor is small and not causing symptoms, your doctor may recommend regular monitoring with MRI scans every 6–12 months instead of immediate treatment.</li>
      <li><strong>Surgery if Needed:</strong> If the tumor is large, growing, or causing symptoms (headaches, vision problems, seizures), surgical removal is often very effective with good outcomes.</li>
      <li><strong>Radiation as an Alternative:</strong> For tumors in hard-to-reach areas or for patients who prefer not to have surgery, focused radiation therapy may be recommended.</li>
    </ul>
    <div class="guidance-section-label">Watch for These Symptoms</div>
    <ul class="guidance-list">
      <li><strong>Vision Changes:</strong> If you notice blurry or double vision, or loss of peripheral vision, report this to your doctor promptly.</li>
      <li><strong>Increasing Headaches:</strong> Headaches that are getting worse over time or are different from your usual pattern should be reported.</li>
      <li><strong>Hearing or Balance Issues:</strong> Ringing in the ears, hearing loss, or difficulty with balance may indicate the tumor is affecting nearby nerves.</li>
    </ul>
    <div class="guidance-section-label">Taking Care of Yourself</div>
    <ul class="guidance-list">
      <li><strong>Stay Calm & Informed:</strong> Meningiomas have one of the best prognoses among brain tumors. Educate yourself but rely on your doctor for medical decisions.</li>
      <li><strong>Regular Follow-Ups:</strong> Even if no treatment is needed now, do not skip your scheduled follow-up MRI scans — they help catch any changes early.</li>
      <li><strong>Support System:</strong> Share your diagnosis with close family or friends. Having emotional support makes a real difference during monitoring or treatment.</li>
    </ul>
  `,
  pituitary: `
    <div class="guidance-severity text-blue">ℹ Pituitary Tumor Detected — Recommended Actions</div>
    <div class="guidance-section-label">Immediate Next Steps</div>
    <ul class="guidance-list">
      <li><strong>Consult an Endocrinologist:</strong> Pituitary tumors often affect hormone levels. An endocrinologist (hormone specialist) should run blood tests to check if your hormones are out of balance.</li>
      <li><strong>Get a Hormone Panel:</strong> Ask for a complete hormone blood test — this usually includes prolactin, cortisol, thyroid hormones, and growth hormone levels to understand if the tumor is active.</li>
      <li><strong>Eye Examination:</strong> The pituitary gland sits near the optic nerves. Get a visual field test to check if the tumor is pressing on your vision pathways.</li>
    </ul>
    <div class="guidance-section-label">What to Expect</div>
    <ul class="guidance-list">
      <li><strong>Medication May Be Enough:</strong> Many pituitary tumors (especially prolactinomas) can be treated with medication alone — no surgery needed. The medicine can shrink the tumor over time.</li>
      <li><strong>Surgery if Required:</strong> If the tumor is large or not responding to medication, minimally invasive surgery through the nose (transsphenoidal approach) is a common and effective option.</li>
      <li><strong>Most Are Benign:</strong> The vast majority of pituitary tumors are non-cancerous. With proper treatment, outcomes are generally very good.</li>
    </ul>
    <div class="guidance-section-label">Symptoms to Monitor</div>
    <ul class="guidance-list">
      <li><strong>Hormonal Changes:</strong> Watch for unexplained weight gain, fatigue, changes in menstrual cycle, reduced libido, or excessive thirst/urination — these may indicate hormone imbalance.</li>
      <li><strong>Vision Problems:</strong> Tunnel vision, blurriness, or difficulty seeing to the sides could mean the tumor is growing and pressing on the optic nerves.</li>
      <li><strong>Severe Headache + Vision Loss:</strong> A sudden, severe headache with rapid vision loss is a medical emergency (pituitary apoplexy) — go to the ER immediately.</li>
    </ul>
    <div class="guidance-section-label">Taking Care of Yourself</div>
    <ul class="guidance-list">
      <li><strong>Take Medications as Prescribed:</strong> If your doctor starts you on hormone medication, take it consistently and attend follow-up blood tests to monitor levels.</li>
      <li><strong>Regular MRI Scans:</strong> Follow your doctor's recommended scan schedule to track the tumor size — usually every 6–12 months initially.</li>
      <li><strong>Ask Questions:</strong> Pituitary conditions can feel confusing. Write down your questions before appointments and don't hesitate to ask your doctor to explain things clearly.</li>
    </ul>
  `,
  notumor: `
    <div class="guidance-severity text-teal">✓ No Tumor Detected — Good News</div>
    <div class="guidance-section-label">What This Means</div>
    <ul class="guidance-list">
      <li><strong>No Signs of Tumor:</strong> The AI analysis did not detect any brain tumor in this MRI scan. This is a positive finding.</li>
      <li><strong>AI Is Not a Final Diagnosis:</strong> This result is from an automated screening tool. It should be confirmed by a qualified radiologist or neurologist for a complete medical opinion.</li>
    </ul>
    <div class="guidance-section-label">What You Should Still Do</div>
    <ul class="guidance-list">
      <li><strong>Share with Your Doctor:</strong> Show this result to your treating doctor and discuss it in the context of your symptoms and medical history.</li>
      <li><strong>If Symptoms Persist:</strong> If you're experiencing headaches, seizures, vision problems, or other neurological symptoms, follow up with your doctor regardless of this result.</li>
      <li><strong>Routine Health Checkups:</strong> Continue with regular health checkups and follow your doctor's advice for any recommended screenings based on your age and risk factors.</li>
    </ul>
  `
};

const PIPELINE_STAGES = {
  1: {
    tag: 'STAGE 01 — PREPROCESSING',
    title: 'Contrast Limited Adaptive Histogram Equalization (CLAHE)',
    spec: 'cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))',
    desc: 'CLAHE normalizes local contrast grids to prevent noise amplification in background pixels. This resolves variations in scanner magnetic strengths, ensuring standard illumination ranges before segmentation.',
    svg: `<svg viewBox="0 0 100 100" class="stage-svg">
      <defs>
        <linearGradient id="claheGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#378ADD" stop-opacity="0.2"/>
          <stop offset="100%" stop-color="#378ADD" stop-opacity="0.8"/>
        </linearGradient>
      </defs>
      <rect x="10" y="25" width="80" height="50" rx="4" fill="url(#claheGrad)" stroke="#378ADD" stroke-width="1.5"/>
      <path d="M 15 50 Q 25 35, 35 60 T 55 40 T 75 65 T 85 50" fill="none" stroke="#ffffff" stroke-width="2"/>
      <line x1="30" y1="25" x2="30" y2="75" stroke="#378ADD" stroke-dasharray="2 2"/>
      <line x1="50" y1="25" x2="50" y2="75" stroke="#378ADD" stroke-dasharray="2 2"/>
      <line x1="70" y1="25" x2="70" y2="75" stroke="#378ADD" stroke-dasharray="2 2"/>
    </svg>`
  },
  2: {
    tag: 'STAGE 02 — SCANNED THRESHOLDING',
    title: 'Dual Threshold Intersection',
    spec: 'cv2.threshold(Otsu) ∩ cv2.adaptiveThreshold(Gaussian)',
    desc: 'Fuses Otsu global threshold and Adaptive Gaussian local threshold using a bitwise AND operator. Only keeps pixels where both methods agree foreground tissue exists, eliminating scanner illumination artifacts.',
    svg: `<svg viewBox="0 0 100 100" class="stage-svg">
      <circle cx="42" cy="50" r="22" fill="#E24B4A" fill-opacity="0.2" stroke="#E24B4A" stroke-width="1.5"/>
      <circle cx="58" cy="50" r="22" fill="#378ADD" fill-opacity="0.2" stroke="#378ADD" stroke-width="1.5"/>
      <path d="M 50 28 A 22 22 0 0 1 50 72 A 22 22 0 0 1 50 28" fill="#4CAF76" fill-opacity="0.6" stroke="#4CAF76" stroke-width="2"/>
      <text x="25" y="52" fill="#E24B4A" font-size="6" font-family="monospace">Otsu</text>
      <text x="64" y="52" fill="#378ADD" font-size="6" font-family="monospace">Adaptive</text>
      <text x="46" y="90" fill="#4CAF76" font-size="7" font-weight="bold">Intersection</text>
    </svg>`
  },
  3: {
    tag: 'STAGE 03 — NOISE DISSOLUTION',
    title: 'Morphological Refinement',
    spec: 'morphologyEx(Open → Close → Dilate) with 15px Kernel',
    desc: 'An elliptical morphological kernel removes tiny background scanner noise (opening), fills ventricles or internal brain cavities (closing), and expands boundaries slightly (dilation) to restore details eroded during filter steps.',
    svg: `<svg viewBox="0 0 100 100" class="stage-svg">
      <!-- Uncleaned dots -->
      <circle cx="15" cy="20" r="2" fill="#888" opacity="0.3"/>
      <circle cx="20" cy="80" r="1.5" fill="#888" opacity="0.3"/>
      <circle cx="85" cy="30" r="2.5" fill="#888" opacity="0.3"/>
      <!-- Main element -->
      <path d="M30 40 Q25 55, 38 65 T60 62 T72 45 T50 35 Z" fill="none" stroke="#378ADD" stroke-width="2"/>
      <circle cx="50" cy="50" r="6" fill="#1c2333" stroke="#E24B4A" stroke-width="1.5"/>
      <line x1="50" y1="44" x2="50" y2="56" stroke="#E24B4A" stroke-dasharray="1 1"/>
      <line x1="44" y1="50" x2="56" y2="50" stroke="#E24B4A" stroke-dasharray="1 1"/>
      <text x="36" y="90" fill="#378ADD" font-size="7">Elliptical Kernel</text>
    </svg>`
  },
  4: {
    tag: 'STAGE 04 — BOUNDARY EXTRACTION',
    title: 'Watershed Segmentation',
    spec: 'cv2.distanceTransform() → Seeds → cv2.watershed()',
    desc: 'Uses distance transform to find peak interior intensities as starting seeds, growing water levels outward. Water boundaries stop rising at peak intensity ridges (the skull-brain interface), producing clean boundary separation.',
    svg: `<svg viewBox="0 0 100 100" class="stage-svg">
      <path d="M 20 70 Q 35 45, 50 30 T 80 70 Z" fill="none" stroke="#378ADD" stroke-width="1.5"/>
      <path d="M 30 70 Q 42 55, 50 48 T 70 70 Z" fill="#378ADD" fill-opacity="0.3" stroke="#378ADD" stroke-dasharray="1 1"/>
      <!-- Peak Seeds -->
      <circle cx="50" cy="48" r="3" fill="#4CAF76"/>
      <circle cx="50" cy="48" r="7" fill="none" stroke="#4CAF76" stroke-width="1" class="pulse-ring"/>
      <line x1="50" y1="30" x2="50" y2="70" stroke="#E24B4A" stroke-width="1"/>
      <text x="54" y="44" fill="#4CAF76" font-size="6" font-family="monospace">Seed</text>
      <text x="35" y="90" fill="#378ADD" font-size="7">Distance Ridge</text>
    </svg>`
  },
  5: {
    tag: 'STAGE 05 — GEOMETRIC CONTOURING',
    title: 'Convex Hull Smoothing',
    spec: 'cv2.findContours() → cv2.convexHull()',
    desc: 'Extracts the largest connected component (the brain tissue mass) and wraps it inside an anatomically smooth convex hull. This eliminates minor segmentation spikes or anomalies to output a clean brain-only region.',
    svg: `<svg viewBox="0 0 100 100" class="stage-svg">
      <path d="M30 45 L38 35 L52 38 L68 32 L75 48 L68 62 L50 68 L32 58 Z" fill="none" stroke="#E24B4A" stroke-width="1.5" stroke-dasharray="3 3"/>
      <path d="M30 45 C40 30, 60 28, 75 48 C75 62, 60 70, 32 58 C25 50, 25 46, 30 45 Z" fill="none" stroke="#4CAF76" stroke-width="2"/>
      <circle cx="30" cy="45" r="2" fill="#E24B4A"/>
      <circle cx="38" cy="35" r="2" fill="#E24B4A"/>
      <circle cx="52" cy="38" r="2" fill="#E24B4A"/>
      <circle cx="68" cy="32" r="2" fill="#E24B4A"/>
      <circle cx="75" cy="48" r="2" fill="#E24B4A"/>
      <circle cx="68" cy="62" r="2" fill="#E24B4A"/>
      <circle cx="50" cy="68" r="2" fill="#E24B4A"/>
      <circle cx="32" cy="58" r="2" fill="#E24B4A"/>
      <text x="32" y="90" fill="#4CAF76" font-size="7">Smooth Convex Hull</text>
    </svg>`
  },
  6: {
    tag: 'CLASSIFIER INFERENCE',
    title: 'EfficientNet-B3 Deep Learning Class Classifier',
    spec: 'PyTorch fine-tuned model (4 outputs)',
    desc: 'The isolated brain image (output from stages 1-5) is piped directly into a fine-tuned EfficientNet-B3 convolutional neural network. It classifies the pathology with a confidence score and outputs a spatial activation field.',
    svg: `<svg viewBox="0 0 100 100" class="stage-svg">
      <!-- Input -->
      <rect x="5" y="35" width="15" height="30" rx="2" fill="none" stroke="#378ADD" stroke-width="1.5"/>
      <!-- Layers -->
      <line x1="20" y1="50" x2="35" y2="35" stroke="#3e4d5c"/>
      <line x1="20" y1="50" x2="35" y2="50" stroke="#3e4d5c"/>
      <line x1="20" y1="50" x2="35" y2="65" stroke="#3e4d5c"/>
      
      <circle cx="35" cy="35" r="3.5" fill="#378ADD"/>
      <circle cx="35" cy="50" r="3.5" fill="#378ADD"/>
      <circle cx="35" cy="65" r="3.5" fill="#378ADD"/>
      
      <line x1="38.5" y1="35" x2="55" y2="35" stroke="#3e4d5c"/>
      <line x1="38.5" y1="50" x2="55" y2="50" stroke="#3e4d5c"/>
      <line x1="38.5" y1="65" x2="55" y2="65" stroke="#3e4d5c"/>
      
      <circle cx="55" cy="35" r="3.5" fill="#378ADD"/>
      <circle cx="55" cy="50" r="3.5" fill="#378ADD"/>
      <circle cx="55" cy="65" r="3.5" fill="#378ADD"/>
      
      <line x1="58.5" y1="35" x2="75" y2="50" stroke="#3e4d5c"/>
      <line x1="58.5" y1="50" x2="75" y2="50" stroke="#3e4d5c"/>
      <line x1="58.5" y1="65" x2="75" y2="50" stroke="#3e4d5c"/>
      
      <circle cx="75" cy="50" r="4.5" fill="#4CAF76"/>
      <!-- Output tag -->
      <text x="82" y="53" fill="#4CAF76" font-size="7" font-weight="bold">Softmax</text>
      <text x="32" y="90" fill="#378ADD" font-size="7">Convolution Network</text>
    </svg>`
  }
};

// ── DOM ELEMENTS ─────────────────────────────────────────────────────────────
const dropZone          = document.getElementById('dropZone');
const dropContent       = document.getElementById('dropContent');
const previewContent    = document.getElementById('previewContent');
const previewImg        = document.getElementById('previewImg');
const previewName       = document.getElementById('previewName');
const previewSize       = document.getElementById('previewSize');
const fileInput         = document.getElementById('fileInput');
const clearBtn          = document.getElementById('clearBtn');
const analyzeBtn        = document.getElementById('analyzeBtn');
const btnText           = document.getElementById('btnText');
const btnSpinner        = document.getElementById('btnSpinner');

const terminalLogs      = document.getElementById('terminalLogs');
const emptyState        = document.getElementById('emptyState');
const resultContent     = document.getElementById('resultContent');
const lowConfWarn       = document.getElementById('lowConfWarn');
const verdictCard       = document.getElementById('verdictCard');
const verdictName       = document.getElementById('verdictName');
const verdictDesc       = document.getElementById('verdictDesc');
const confValue         = document.getElementById('confValue');
const severityBadge     = document.getElementById('severityBadge');
const verdictConfRing   = document.getElementById('verdictConfRing');

// Image Workspaces
const viewerTabs        = document.getElementById('viewerTabs');
const blendBaseImg      = document.getElementById('blendBaseImg');
const blendOverlayImg   = document.getElementById('blendOverlayImg');
const blendSlider       = document.getElementById('blendSlider');
const blendSliderLabel  = document.getElementById('blendSliderLabel');
const sliderBubble      = document.getElementById('sliderBubble');
const blendSliderGroup  = document.querySelector('.blend-slider-control');
const origImg           = document.getElementById('origImg');
const gradcamImg        = document.getElementById('gradcamImg');
const gradcamEmptyState = document.getElementById('gradcamEmptyState');
const maskImg           = document.getElementById('maskImg');

const viewComposite     = document.getElementById('viewComposite');
const viewSegmented     = document.getElementById('viewSegmented');
const viewGradcam       = document.getElementById('viewGradcam');
const viewMask          = document.getElementById('viewMask');

const probBars          = document.getElementById('probBars');
const clinicalGuidance  = document.getElementById('clinicalGuidance');

// Pipeline stages
const pipelineDetailsCard = document.getElementById('pipelineDetailsCard');
const stageSvgContainer   = document.getElementById('stageSvgContainer');
const stageTag            = document.getElementById('stageTag');
const stageTitle          = document.getElementById('stageTitle');
const stageDesc           = document.getElementById('stageDesc');
const stageSpec           = document.getElementById('stageSpec');

let selectedFile = null;
let currentPredictionData = null;

// ── INITIALIZATION ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  checkBackendHealth();
  setupPipelineNavigation();
  setupTabListeners();
  setupSampleClickHandlers();
  setupBlendSlider();
  clearFile();
});

// ── BACKEND HEALTH CHECKS ─────────────────────────────────────────────────────
async function checkBackendHealth() {
  addLogLine('Resolving connection to neural inference cluster...');
  try {
    const res = await fetch('/health');
    if (!res.ok) throw new Error();
    const data = await res.json();
    
    // Update Device Display
    const deviceLabel = document.getElementById('deviceValue');
    deviceLabel.textContent = data.device.toUpperCase();
    
    addLogLine(`Connection verified. Device cluster: ${data.device.toUpperCase()}.`);
    addLogLine('System ready. Trigger DICOM scan transmission.');
  } catch (err) {
    const deviceLabel = document.getElementById('deviceValue');
    deviceLabel.textContent = 'OFFLINE';
    deviceLabel.parentElement.style.color = '#E24B4A';
    addLogLine('⚠ Critical: Target neural model backend offline.', 'text-red');
  }
}

// ── TERMINAL LOGGER ───────────────────────────────────────────────────────────
function addLogLine(text, className = '') {
  const line = document.createElement('div');
  line.className = `log-line ${className}`;
  const timestamp = new Date().toLocaleTimeString().split(' ')[0];
  line.innerHTML = `<span class="log-time">[${timestamp}]</span> ${text}`;
  terminalLogs.appendChild(line);
  terminalLogs.scrollTop = terminalLogs.scrollHeight;
}

// ── FILES AND ACQUISITION ─────────────────────────────────────────────────────
function handleFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    alert('Invalid scanner file format. Dictate PNG or JPEG images.');
    addLogLine('Acquisition Error: Invalid image format rejected.', 'text-red');
    return;
  }
  selectedFile = file;
  const sizeKb = (file.size / 1024).toFixed(1);
  
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImg.src = e.target.result;
    previewName.textContent = file.name;
    previewSize.textContent = `${sizeKb} KB`;
    
    dropContent.style.display = 'none';
    previewContent.style.display = 'flex';
    analyzeBtn.disabled = false;
    
    addLogLine(`MRI Scan Load successful. File: ${file.name} (${sizeKb} KB)`);
  };
  reader.readAsDataURL(file);
}

function clearFile() {
  selectedFile = null;
  fileInput.value = '';
  previewImg.src = '';
  previewContent.style.display = 'none';
  dropContent.style.display = 'flex';
  analyzeBtn.disabled = true;
  currentPredictionData = null;
  
  // Reset tabs
  const tabButtons = viewerTabs.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => btn.classList.remove('active'));
  tabButtons[0].classList.add('active');
  
  emptyState.style.display = 'flex';
  resultContent.style.display = 'none';
}

// ── DROP ZONE EVENT HANDLERS ──────────────────────────────────────────────────
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

clearBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  clearFile();
  addLogLine('Scan cleared from data buffer. Awaiting next acquisition.');
});

dropZone.addEventListener('click', (e) => {
  if (e.target.closest('#clearBtn') || e.target.closest('#previewImg')) return;
  if (!selectedFile) fileInput.click();
});

['dragenter', 'dragover'].forEach(evt =>
  dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  })
);

['dragleave', 'drop'].forEach(evt =>
  dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
  })
);

dropZone.addEventListener('drop', (e) => {
  handleFile(e.dataTransfer.files[0]);
});

analyzeBtn.addEventListener('click', runAnalysis);

// ── CLINICAL WORKLOAD PRESET SAMPLE TRIGGERS ─────────────────────────
function setupSampleClickHandlers() {
  document.querySelectorAll('.sample-card').forEach(card => {
    card.addEventListener('click', async () => {
      const sampleName = card.dataset.sample;
      addLogLine(`Preset workload requested: WORKLOAD-${sampleName.toUpperCase()}`);
      
      try {
        clearFile();
        const imgUrl = `/static/samples/${sampleName}.jpg`;
        const res = await fetch(imgUrl);
        if (!res.ok) throw new Error('Failed to acquire static preset asset');
        
        const blob = await res.blob();
        const file = new File([blob], `${sampleName}_preset.jpg`, { type: 'image/jpeg' });
        
        handleFile(file);
        
        // Auto execute inference
        setTimeout(() => {
          runAnalysis();
        }, 300);
      } catch (err) {
        addLogLine(`⚠ Workload acquisition failed: ${err.message}`, 'text-red');
      }
    });
  });
}

// ── ANALYSIS EXECUTION ────────────────────────────────────────────────────────
async function runAnalysis() {
  if (!selectedFile) return;
  
  setLoadingState(true);
  addLogLine('Initializing Clinical Analysis Pipeline...', 'text-cyan');
  
  const formData = new FormData();
  formData.append('mri_scan', selectedFile);

  // Progressive terminal logging
  const stagesLog = [
    { delay: 100, msg: 'Executing Stage 1: CLAHE Local Contrast Adaptation...' },
    { delay: 400, msg: 'Executing Stage 2: Dual Gaussian/Otsu Threshold Fusion...' },
    { delay: 750, msg: 'Executing Stage 3: Elliptical Structuring Morphology...' },
    { delay: 1100, msg: 'Executing Stage 4: Distance Seed-Watershed Segmentation...' },
    { delay: 1400, msg: 'Executing Stage 5: Convex Hull Envelope Smoothing...' },
    { delay: 1700, msg: 'Isolating target brain matrix crop...' },
    { delay: 2000, msg: 'Piping crop to EfficientNet-B3 Classifier...' },
    { delay: 2300, msg: 'Computing backward gradient overlays (Grad-CAM)...' }
  ];

  stagesLog.forEach(item => {
    setTimeout(() => {
      if (selectedFile) addLogLine(item.msg);
    }, item.delay);
  });
  
  try {
    const response = await fetch('/predict', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      let errorMsg = `Server returned status ${response.status}`;
      try {
        const err = await response.json();
        errorMsg = err.error || errorMsg;
      } catch (_) {
        if (response.status === 502 || response.status === 504) {
          errorMsg = 'Server is spinning up or timed out. Please wait 10 seconds and try again.';
        }
      }
      throw new Error(errorMsg);
    }

    let data;
    try {
      data = await response.json();
    } catch (_) {
      throw new Error('Server returned invalid data format. Please try again.');
    }
    
    setTimeout(() => {
      renderResults(data);
      addLogLine('Inference complete. Dashboard populated.', 'text-green');
    }, 2500);

  } catch (err) {
    setTimeout(() => {
      alert(`Diagnostic Inference Failed: ${err.message}`);
      addLogLine(`⚠ Critical Error: ${err.message}`, 'text-red');
      setLoadingState(false);
    }, 2500);
  }
}

function setLoadingState(isLoading) {
  analyzeBtn.classList.toggle('loading', isLoading);
  analyzeBtn.disabled = isLoading;
  btnText.textContent = isLoading ? 'PROCESSING WORKLOAD...' : 'EXECUTE CLINICAL INFERENCE';
  btnSpinner.style.display = isLoading ? 'flex' : 'none';
}

// ── RESULT RENDERING ──────────────────────────────────────────────────────────
function renderResults(data) {
  currentPredictionData = data;
  setLoadingState(false);

  const color       = CLASS_COLORS[data.prediction] || '#378ADD';
  const displayName = CLASS_DISPLAY[data.prediction] || data.full_name;

  // ── LOW CONFIDENCE ALERT ────────────────────────────────────────────────────
  lowConfWarn.style.display = data.low_confidence ? 'flex' : 'none';

  // ── VERDICT CARD POPULATION ─────────────────────────────────────────────────
  verdictCard.style.setProperty('--verdict-accent', color);
  verdictName.textContent = displayName;
  verdictDesc.textContent = data.description;
  
  // Severity Badge
  severityBadge.textContent = SEVERITY_LEVELS[data.prediction] || 'RESOLVED';
  severityBadge.className = 'severity-glow-badge';
  if (data.severity === 'critical') severityBadge.classList.add('badge-critical');
  if (data.severity === 'high')     severityBadge.classList.add('badge-high');
  if (data.severity === 'moderate') severityBadge.classList.add('badge-moderate');
  if (data.severity === 'low')      severityBadge.classList.add('badge-low');
  if (data.severity === 'none')     severityBadge.classList.add('badge-none');

  // Tumor Area Card
  const existingAreaCard = document.getElementById('tumorAreaCard');
  if (existingAreaCard) existingAreaCard.remove();

  if (data.tumor_detected && data.tumor_area_px > 0) {
    const areaCard = document.createElement('div');
    areaCard.id = 'tumorAreaCard';
    areaCard.className = 'tumor-area-card';
    areaCard.innerHTML = `
      <div class="area-card-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
          <line x1="12" y1="22.08" x2="12" y2="12"></line>
        </svg>
        <span class="area-card-title">DETECTED TUMOR AREA</span>
      </div>
      <div class="area-metrics-grid">
        <div class="area-metric">
          <span class="area-metric-value" style="color: ${color}">${data.tumor_area_px.toLocaleString()}</span>
          <span class="area-metric-label">PIXELS</span>
        </div>
        <div class="area-metric-divider"></div>
        <div class="area-metric">
          <span class="area-metric-value" style="color: ${color}">${data.tumor_area_pct}%</span>
          <span class="area-metric-label">OF BRAIN REGION</span>
        </div>
        <div class="area-metric-divider"></div>
        <div class="area-metric">
          <span class="area-metric-value" style="color: ${color}">~${data.tumor_area_mm2}</span>
          <span class="area-metric-label">EST. mm²</span>
        </div>
      </div>
      <div class="area-severity-bar">
        <div class="severity-track">
          <div class="severity-fill" style="width: ${Math.min(data.tumor_area_pct * 3, 100)}%; background: ${color};"></div>
        </div>
        <span class="severity-bar-label">Tumor Burden: ${data.tumor_area_pct < 5 ? 'Small' : data.tumor_area_pct < 15 ? 'Moderate' : 'Large'} Region</span>
      </div>
    `;
    verdictCard.insertAdjacentElement('afterend', areaCard);
  }

  // Confidence radial ring
  confValue.textContent = `${data.confidence}%`;
  confValue.style.fill = color;
  const radius = 15.9155;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = (data.confidence / 100) * circumference;
  verdictConfRing.style.strokeDasharray = `${strokeDash} ${circumference}`;
  verdictConfRing.style.stroke = color;

  // ── POPULATE IMAGES ─────────────────────────────────────────────────────────
  origImg.src    = `data:image/png;base64,${data.original_image}`;
  maskImg.src    = `data:image/png;base64,${data.mask_image}`;

  // Blend overlay base
  blendBaseImg.src = `data:image/png;base64,${data.original_image}`;

  // Blend overlay active target (Grad-CAM if pathology exists, otherwise Tissue Mask)
  if (data.tumor_detected && data.gradcam_image) {
    gradcamImg.src          = `data:image/png;base64,${data.gradcam_image}`;
    gradcamImg.style.display = 'block';
    gradcamEmptyState.style.display = 'none';

    blendOverlayImg.src     = `data:image/png;base64,${data.gradcam_image}`;
    blendSliderLabel.textContent = 'Activation Map (Grad-CAM)';
    blendSliderGroup.style.display = 'flex';
  } else {
    gradcamImg.src          = '';
    gradcamImg.style.display = 'none';
    gradcamEmptyState.style.display = 'flex';

    // Blend falls back to mask overlay if no tumor exists
    blendOverlayImg.src     = `data:image/png;base64,${data.mask_image}`;
    blendSliderLabel.textContent = 'Segmentation Mask (Tissue)';
    // We can still overlay the mask onto the anatomical brain tissue!
    blendSliderGroup.style.display = 'flex';
  }

  // Enforce slider opacity update
  updateBlendOpacity(blendSlider.value);

  // ── CLASSIFIER PROBABILITIES MATRIX ─────────────────────────────────────────
  probBars.innerHTML = '';
  const sorted = Object.entries(data.probabilities).sort((a, b) => b[1] - a[1]);

  sorted.forEach(([cls, pct]) => {
    const isActive = cls === data.prediction;
    const barFillColor = isActive ? (CLASS_COLORS[cls] || '#378ADD') : 'var(--border)';
    const textHighlight = isActive ? `color: ${barFillColor}; font-weight: 700;` : '';
    
    const row = document.createElement('div');
    row.className = `prob-row ${isActive ? 'active-row' : ''}`;
    row.innerHTML = `
      <div class="prob-meta">
        <span class="prob-class-name" style="${textHighlight}">${CLASS_DISPLAY[cls] ? CLASS_DISPLAY[cls].split(' ')[0] : cls}</span>
        <span class="prob-percentage" style="${textHighlight}">${pct}%</span>
      </div>
      <div class="prob-progress-track">
        <div class="prob-progress-fill" style="width: 0%; background: ${barFillColor};" data-width="${pct}"></div>
      </div>
    `;
    probBars.appendChild(row);
  });

  // Animate progress bars
  requestAnimationFrame(() => {
    setTimeout(() => {
      document.querySelectorAll('.prob-progress-fill').forEach(fill => {
        fill.style.width = fill.dataset.width + '%';
      });
    }, 100);
  });

  // ── CLINICAL RECOMMENDATIONS CARD ───────────────────────────────────────────
  clinicalGuidance.innerHTML = CLINICAL_RECOMMENDATIONS[data.prediction] || CLINICAL_RECOMMENDATIONS['notumor'];

  // Scroll to workspace viewport
  emptyState.style.display = 'none';
  resultContent.style.display = 'flex';
  
  if (window.innerWidth < 900) {
    document.getElementById('resultsPanel').scrollIntoView({ behavior: 'smooth' });
  }
}

// ── BLEND SLIDER INTERACTIVITY ───────────────────────────────────────────────
function setupBlendSlider() {
  blendSlider.addEventListener('input', (e) => {
    updateBlendOpacity(e.target.value);
  });
}

function updateBlendOpacity(val) {
  blendOverlayImg.style.opacity = val / 100;
  sliderBubble.textContent = `${val}%`;
  
  // Position bubble dynamically above slider thumb
  const percent = val / 100;
  const offset = percent * (blendSlider.clientWidth - 16) + 8; // Adjust for 16px thumb size
  sliderBubble.style.left = `${offset}px`;
}

// ── TAB STATE SWITCHING ───────────────────────────────────────────────────────
function setupTabListeners() {
  viewerTabs.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!currentPredictionData) return;
      
      viewerTabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const targetView = btn.dataset.view;
      
      // Hide all panels
      viewComposite.style.display = 'none';
      viewSegmented.style.display = 'none';
      viewGradcam.style.display   = 'none';
      viewMask.style.display      = 'none';
      
      // Show targeted panel
      if (targetView === 'composite') viewComposite.style.display = 'flex';
      if (targetView === 'segmented') viewSegmented.style.display = 'flex';
      if (targetView === 'gradcam')   viewGradcam.style.display = 'flex';
      if (targetView === 'mask')      viewMask.style.display = 'flex';
      
      addLogLine(`Viewport switched: ${btn.textContent.toUpperCase()}`);
    });
  });
}

// ── INTERACTIVE PIPELINE ANALYSIS COCKPIT ────────────────────────────────────
function setupPipelineNavigation() {
  // Load Stage 1 initially
  loadPipelineStageDetails(1);

  document.querySelectorAll('.pipeline-node').forEach(node => {
    node.addEventListener('click', () => {
      const stage = parseInt(node.dataset.stage);
      
      document.querySelectorAll('.pipeline-node').forEach(n => n.classList.remove('active'));
      node.classList.add('active');
      
      loadPipelineStageDetails(stage);
    });
  });
}

function loadPipelineStageDetails(stageId) {
  const stageData = PIPELINE_STAGES[stageId];
  if (!stageData) return;

  // Visual Fade Transitions
  pipelineDetailsCard.classList.add('switching');
  
  setTimeout(() => {
    stageTag.textContent = stageData.tag;
    stageTitle.textContent = stageData.title;
    stageDesc.textContent = stageData.desc;
    stageSpec.textContent = stageData.spec;
    stageSvgContainer.innerHTML = stageData.svg;
    
    pipelineDetailsCard.classList.remove('switching');
  }, 180);
}
