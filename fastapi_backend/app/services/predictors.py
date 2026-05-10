from pathlib import Path

import timm
import torch
import torch.nn as nn
from PIL import Image
from torchvision import models, transforms

from app.config import DEVICE


IMG_SIZE = 224

IMAGE_TRANSFORM = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225]),
])


def load_state_dict(weights_path: Path):
    try:
        checkpoint = torch.load(weights_path, map_location=DEVICE, weights_only=True)
    except TypeError:
        checkpoint = torch.load(weights_path, map_location=DEVICE)

    if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
        return checkpoint["model_state_dict"]
    return checkpoint


def build_timm_model(model_name: str, num_classes: int):
    model = timm.create_model(model_name, pretrained=False, num_classes=num_classes)
    return model


def build_resnet18_model(num_classes: int, dropout: float = 0.3):
    model = models.resnet18(weights=None)
    num_features = model.fc.in_features
    model.fc = nn.Sequential(
        nn.Dropout(dropout),
        nn.Linear(num_features, num_classes),
    )
    return model


def build_model(config: dict):
    weights_path = Path(config["weights"])
    if not weights_path.exists():
        raise FileNotFoundError(f"Model weights not found: {weights_path}")

    classes = config["classes"]
    if config["kind"] == "timm":
        model = build_timm_model(config["model_name"], len(classes))
    elif config["kind"] == "resnet18":
        model = build_resnet18_model(len(classes), config.get("dropout", 0.3))
    else:
        raise ValueError(f"Unknown model kind: {config['kind']}")

    model.load_state_dict(load_state_dict(weights_path))
    model.to(DEVICE)
    model.eval()
    return model


@torch.no_grad()
def predict_image(model, image_path: Path, config: dict):
    image = Image.open(image_path).convert("RGB")
    tensor = IMAGE_TRANSFORM(image).unsqueeze(0).to(DEVICE)

    logits = model(tensor)
    probabilities = torch.softmax(logits, dim=1)[0]
    predicted_index = int(torch.argmax(probabilities).item())
    classes = config["classes"]

    probability_rows = [
        {
            "class_name": class_name,
            "probability_percent": round(float(probabilities[index].item()) * 100, 4),
            "meaning": f"Model-estimated probability for {class_name}.",
        }
        for index, class_name in enumerate(classes)
    ]

    return {
        "scan_type": config["scan_type"],
        "ai_model": config["ai_model"],
        "predicted_class": classes[predicted_index],
        "confidence": float(probabilities[predicted_index].item()),
        "confidence_percent": round(float(probabilities[predicted_index].item()) * 100, 4),
        "probabilities": probability_rows,
    }
