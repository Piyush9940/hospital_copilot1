from pathlib import Path

import torch


PROJECT_ROOT = Path(__file__).resolve().parents[2]
if not (PROJECT_ROOT / "fastapi_backend").exists():
    PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

UPLOAD_DIR = PROJECT_ROOT / "fastapi_backend" / "uploads"
MODEL_DIR = PROJECT_ROOT / "fastapi_backend" / "models"
if not MODEL_DIR.exists():
    UPLOAD_DIR = PROJECT_ROOT / "uploads"
    MODEL_DIR = PROJECT_ROOT / "models"

GROQ_MODEL_NAME = "meta-llama/llama-4-scout-17b-16e-instruct"

REPORT_SCHEMA_TEXT = """
{
  "report_title": "string",
  "scan_type": "ultrasound | xray | mri_2d | mri_3d | mri_tumor | ct_2d | ct_3d",
  "uploaded_image_review": {
    "modality_observed": "string",
    "image_quality": "string",
    "general_observations": ["string"],
    "limitations_of_visual_review": ["string"]
  },
  "classifier_result": {
    "ai_model": "string",
    "predicted_class": "string",
    "confidence_percent": 0,
    "probabilities": [
      {
        "class_name": "string",
        "probability_percent": 0,
        "meaning": "string"
      }
    ]
  },
  "combined_assessment": {
    "summary": "string",
    "risk_level": "low | moderate | high | uncertain",
    "what_this_may_indicate": "string",
    "what_this_does_not_confirm": "string"
  },
  "recommended_next_steps": ["string"],
  "patient_friendly_explanation": "string",
  "technical_limitations": ["string"]
}
"""

MODEL_CONFIGS = {
    "ultrasound": {
        "kind": "timm",
        "model_name": "efficientnet_b4",
        "weights": MODEL_DIR / "ultrasound" / "best_model.pth",
        "classes": ["benign", "malignant", "normal"],
        "ai_model": "EfficientNet-B4 breast ultrasound classifier",
        "scan_type": "ultrasound",
    },
    "xray": {
        "kind": "timm",
        "model_name": "efficientnet_b0",
        "weights": MODEL_DIR / "xray" / "best_xray_model.pth",
        "classes": ["NORMAL", "PNEUMONIA"],
        "ai_model": "EfficientNet-B0 pneumonia X-ray classifier",
        "scan_type": "xray",
    },
    "ct_2d": {
        "kind": "resnet18",
        "weights": MODEL_DIR / "ct_2d" / "ct_2d_lung_cancer_model.pth",
        "dropout": 0.35,
        "classes": [
            "adenocarcinoma",
            "large.cell.carcinoma",
            "normal",
            "squamous.cell.carcinoma",
        ],
        "ai_model": "ResNet18 lung CT cancer 2D classifier",
        "scan_type": "ct_2d",
    },
}

MRI_TUMOR_MODEL_PATH = MODEL_DIR / "mri_tumor" / "brats_2d_slice_model.pth"

THREE_D_SCAN_TYPES = {"mri_3d", "ct_3d"}
