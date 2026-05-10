from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.config import MODEL_CONFIGS
from app.services.ct_3d import predict_ct_3d
from app.services.file_utils import is_image_file, is_nifti_file, save_upload
from app.services.groq_report import generate_placeholder_3d_report, generate_report_json, generate_text_report_json
from app.services.model_registry import model_registry
from app.services.mri_tumor import predict_mri_tumor_image, predict_mri_tumor_nifti
from app.services.predictors import predict_image


router = APIRouter(tags=["predictions"])


def ensure_image(path: Path):
    if not is_image_file(path):
        raise HTTPException(
            status_code=400,
            detail="Upload a normal image file: .png, .jpg, .jpeg, .bmp, or .webp",
        )


def predict_2d(scan_key: str, image_path: Path):
    config = MODEL_CONFIGS[scan_key]
    model = model_registry.get(scan_key)
    return predict_image(model, image_path, config)


async def handle_2d_endpoint(scan_key: str, file: UploadFile):
    upload_path = save_upload(file)
    ensure_image(upload_path)

    prediction = predict_2d(scan_key, upload_path)
    return generate_report_json(MODEL_CONFIGS[scan_key]["scan_type"], prediction, upload_path)


async def handle_mri_endpoint(file: UploadFile):
    upload_path = save_upload(file)

    if is_nifti_file(upload_path):
        prediction = predict_mri_tumor_nifti(upload_path)
        return generate_text_report_json("mri_tumor", prediction)

    ensure_image(upload_path)
    prediction = predict_mri_tumor_image(upload_path)
    return generate_report_json("mri_tumor", prediction, upload_path)


async def handle_ct_endpoint(file: UploadFile):
    upload_path = save_upload(file)

    if is_nifti_file(upload_path):
        prediction = predict_ct_3d(upload_path)
        return generate_placeholder_3d_report("ct_3d", prediction)

    ensure_image(upload_path)
    prediction = predict_2d("ct_2d", upload_path)
    return generate_report_json("ct_2d", prediction, upload_path)


@router.post("/ultrasound")
async def ultrasound(file: UploadFile = File(...)):
    try:
        return await handle_2d_endpoint("ultrasound", file)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/xray")
async def xray(file: UploadFile = File(...)):
    try:
        return await handle_2d_endpoint("xray", file)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/mri2d-3d")
async def mri2d_3d(file: UploadFile = File(...)):
    try:
        return await handle_mri_endpoint(file)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/ct2d-3d")
async def ct2d_3d(file: UploadFile = File(...)):
    try:
        return await handle_ct_endpoint(file)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
