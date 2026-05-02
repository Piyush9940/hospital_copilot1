from fastapi import Body
from fastapi.responses import JSONResponse

from services.reasoning_service import generate_ai_reply
from utils.config import settings


def _normalize_patient_context(payload: dict) -> dict:
    """
    Supports multiple payload shapes:
    - payload["patient"]
    - payload["context"]
    - payload["patientContext"]
    """
    merged = {}

    default_context = getattr(settings, "DEFAULT_PATIENT_CONTEXT", {})
    if isinstance(default_context, dict):
        merged.update(default_context)

    patient = payload.get("patient")
    context = payload.get("context")
    patient_context = payload.get("patientContext")

    if isinstance(patient, dict):
        merged.update(patient)

    if isinstance(context, dict):
        merged.update(context)

    if isinstance(patient_context, dict):
        merged.update(patient_context)

    return merged


async def ai_nurse_controller(payload: dict = Body(...)):
    try:
        message = payload.get("message", "")
        history = payload.get("history", [])
        patient = _normalize_patient_context(payload)
        language = payload.get("language", "en")
        patient_id = payload.get("patient_id") or payload.get("patientId")

        if not isinstance(message, str) or not message.strip():
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "Message is required"
                }
            )

        if not isinstance(history, list):
            history = []

        reply = generate_ai_reply(
            user_message=message.strip(),
            history=history,
            patient=patient,
            language=language,
            patient_id=patient_id,
        )

        if not reply:
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "error": "AI response generation failed"
                }
            )

        return {
            "success": True,
            "reply": reply,
            "language": language,
            "patient_id": patient_id
        }

    except Exception as exc:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Internal server error",
                "details": str(exc)
            }
        )