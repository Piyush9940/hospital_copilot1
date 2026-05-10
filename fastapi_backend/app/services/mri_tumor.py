from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from PIL import Image
from torchvision import models, transforms

from app.config import DEVICE, MRI_TUMOR_MODEL_PATH


AI_MODEL_NAME = "ResNet18 BraTS MRI tumor slice classifier"
DEFAULT_IMAGE_SIZE = 224
MAX_SLICES = 32
TUMOR_THRESHOLD = 0.5

_model = None
_class_names = None
_image_size = DEFAULT_IMAGE_SIZE
_transform = None


def load_mri_tumor_model():
    global _model, _class_names, _image_size, _transform

    if _model is not None:
        return _model

    if not MRI_TUMOR_MODEL_PATH.exists():
        raise FileNotFoundError(f"MRI tumor model not found: {MRI_TUMOR_MODEL_PATH}")

    checkpoint = _load_checkpoint(MRI_TUMOR_MODEL_PATH)
    _class_names = list(checkpoint["class_names"])
    _image_size = int(checkpoint.get("image_size", DEFAULT_IMAGE_SIZE))

    model = models.resnet18(weights=None)
    model.fc = nn.Sequential(
        nn.Dropout(0.3),
        nn.Linear(model.fc.in_features, len(_class_names)),
    )
    model.load_state_dict(checkpoint["model_state_dict"])
    model.to(DEVICE)
    model.eval()

    _model = model
    _transform = _build_transform(_image_size)
    return _model


def predict_mri_tumor_image(image_path: Path):
    model = load_mri_tumor_model()
    image = Image.open(image_path).convert("RGB")
    tensor = _transform(image).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        probabilities = torch.softmax(model(tensor), dim=1)[0].cpu().numpy()

    predicted_index = int(np.argmax(probabilities))
    return _format_prediction(
        predicted_class=_class_names[predicted_index],
        confidence=float(probabilities[predicted_index]),
        probabilities=probabilities,
        input_type="image",
    )


def predict_mri_tumor_nifti(nifti_path: Path):
    model = load_mri_tumor_model()
    volume = _normalize_volume(_load_nifti(nifti_path))
    slice_indices = _select_informative_slices(volume, max_slices=MAX_SLICES)

    if not slice_indices:
        raise ValueError("No informative brain slices found in the uploaded NIfTI file.")

    batch = torch.stack([
        _transform(_slice_to_rgb(volume[:, :, idx]))
        for idx in slice_indices
    ]).to(DEVICE)

    with torch.no_grad():
        probabilities = torch.softmax(model(batch), dim=1).cpu().numpy()

    tumor_index = _class_names.index("tumor")
    notumor_index = _class_names.index("notumor")
    tumor_probs = probabilities[:, tumor_index]

    top_count = min(5, len(tumor_probs))
    top_score = float(np.mean(sorted(tumor_probs, reverse=True)[:top_count]))
    max_score = float(np.max(tumor_probs))
    mean_score = float(np.mean(tumor_probs))
    predicted_class = "tumor" if top_score >= TUMOR_THRESHOLD else "notumor"
    confidence = top_score if predicted_class == "tumor" else 1.0 - top_score

    class_probabilities = np.zeros(len(_class_names), dtype=np.float32)
    class_probabilities[tumor_index] = top_score
    class_probabilities[notumor_index] = 1.0 - top_score

    prediction = _format_prediction(
        predicted_class=predicted_class,
        confidence=confidence,
        probabilities=class_probabilities,
        input_type="nifti_volume",
    )
    prediction.update({
        "slices_used": len(slice_indices),
        "tumor_score_top5": round(top_score, 4),
        "tumor_score_max": round(max_score, 4),
        "tumor_score_mean": round(mean_score, 4),
        "top_suspicious_slices": _top_slice_results(slice_indices, tumor_probs, limit=10),
    })
    return prediction


def _load_checkpoint(path: Path):
    try:
        return torch.load(path, map_location=DEVICE, weights_only=False)
    except TypeError:
        return torch.load(path, map_location=DEVICE)


def _build_transform(image_size: int):
    return transforms.Compose([
        transforms.Resize((image_size, image_size)),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225],
        ),
    ])


def _format_prediction(predicted_class: str, confidence: float, probabilities, input_type: str):
    return {
        "scan_type": "mri_tumor",
        "input_type": input_type,
        "ai_model": AI_MODEL_NAME,
        "predicted_class": predicted_class,
        "confidence": float(confidence),
        "confidence_percent": round(float(confidence) * 100, 4),
        "probabilities": [
            {
                "class_name": class_name,
                "probability_percent": round(float(probabilities[index]) * 100, 4),
                "meaning": f"Model-estimated probability for {class_name}.",
            }
            for index, class_name in enumerate(_class_names)
        ],
    }


def _load_nifti(path: Path):
    import nibabel as nib

    return np.asarray(nib.load(str(path)).get_fdata(), dtype=np.float32)


def _normalize_volume(volume):
    volume = np.nan_to_num(volume.astype(np.float32))
    brain = volume[volume > 0]

    if brain.size == 0:
        return np.zeros_like(volume, dtype=np.float32)

    low, high = np.percentile(brain, [1, 99])
    volume = np.clip(volume, low, high)
    return ((volume - low) / max(high - low, 1e-6)).astype(np.float32)


def _select_informative_slices(volume, max_slices=32, min_tissue_ratio=0.01):
    scores = []

    for idx in range(volume.shape[2]):
        slice_2d = volume[:, :, idx]
        tissue_ratio = float((slice_2d > 0.05).mean())
        if tissue_ratio < min_tissue_ratio:
            continue
        scores.append((float(slice_2d.std()) * tissue_ratio, idx))

    scores.sort(reverse=True)
    return sorted(idx for _, idx in scores[:max_slices])


def _slice_to_rgb(slice_2d):
    image = np.clip(slice_2d * 255.0, 0, 255).astype(np.uint8)
    return Image.fromarray(image, mode="L").convert("RGB")


def _top_slice_results(slice_indices, tumor_probabilities, limit=10):
    rows = [
        {
            "slice_index": int(idx),
            "tumor_probability_percent": round(float(probability) * 100, 4),
            "prediction": "tumor" if probability >= TUMOR_THRESHOLD else "notumor",
        }
        for idx, probability in zip(slice_indices, tumor_probabilities)
    ]
    return sorted(rows, key=lambda row: row["tumor_probability_percent"], reverse=True)[:limit]
