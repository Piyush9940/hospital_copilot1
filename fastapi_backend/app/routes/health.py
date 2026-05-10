from fastapi import APIRouter

from app.config import DEVICE
from app.services.model_registry import model_registry


router = APIRouter(tags=["health"])


@router.get("/health")
def health():
    return {
        "status": "ok",
        "device": str(DEVICE),
        "loaded_models": sorted(model_registry.models.keys()),
    }
