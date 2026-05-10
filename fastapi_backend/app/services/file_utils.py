import shutil
import uuid
from pathlib import Path

from fastapi import UploadFile

from app.config import UPLOAD_DIR


IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".bmp", ".webp"}


def is_nifti_file(path: Path) -> bool:
    name = path.name.lower()
    return name.endswith(".nii") or name.endswith(".nii.gz")


def is_image_file(path: Path) -> bool:
    return path.suffix.lower() in IMAGE_EXTENSIONS


def safe_upload_name(upload: UploadFile) -> str:
    original_name = Path(upload.filename or "upload").name
    return f"{uuid.uuid4().hex}_{original_name}"


def save_upload(upload: UploadFile) -> Path:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    output_path = UPLOAD_DIR / safe_upload_name(upload)

    with output_path.open("wb") as buffer:
        shutil.copyfileobj(upload.file, buffer)

    return output_path
