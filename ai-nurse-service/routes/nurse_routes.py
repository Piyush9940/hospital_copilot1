from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from services.rag_service import get_rag_context
from services.llm_service import generate_nurse_response

router = APIRouter()

MEDICAL_KEYWORDS = {
    "ache", "allerg", "ambulance", "appointment", "asthma", "blood", "bp",
    "breath", "burn", "cancer", "cardiac", "chest", "clinic", "cold", "cough",
    "diagnos", "diabetes", "dizzy", "doctor", "dose", "drug", "emergency",
    "fever", "fracture", "headache", "health", "heart", "hospital", "injury",
    "lab", "medical", "medicine", "medication", "nausea", "nurse", "oxygen",
    "pain", "patient", "prescription", "pulse", "rash", "report", "scan",
    "skin", "surgery", "symptom", "tablet", "test", "therapy", "treatment",
    "vaccine", "vital", "vomit", "wound", "xray", "x-ray", "mri", "ct",
    "ultrasound", "pdf", "discharge", "summary", "pathology", "radiology",
}

NON_MEDICAL_REFUSAL = (
    "I’m here to help with medical and health-related questions only. "
    "Please ask me about symptoms, medicines, reports, vitals, appointments, "
    "or other care-related concerns."
)


def is_medical_related(text: str, context: Dict[str, Any]) -> bool:
    attachments = context.get("uploadedAttachments") or context.get("attachments") or []
    attachment_text = ""
    if isinstance(attachments, list):
        attachment_text = " ".join(
            f"{item.get('name', '')} {item.get('type', '')}" if isinstance(item, dict) else str(item)
            for item in attachments
        )

    haystack = f"{text} {attachment_text}".lower()
    return any(keyword in haystack for keyword in MEDICAL_KEYWORDS)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    patient_id: Optional[int] = None
    history: List[Dict[str, Any]] = Field(default_factory=list)
    context: Dict[str, Any] = Field(default_factory=dict)
    language: str = "en"


@router.post("/chat")
async def nurse_chat(request: ChatRequest):
    try:
        user_message = request.message.strip()
        if not user_message:
            raise HTTPException(status_code=400, detail="Message is required")

        if not is_medical_related(user_message, request.context):
            return {
                "reply": NON_MEDICAL_REFUSAL,
                "patient_id": request.patient_id,
                "language": request.language,
                "history_count": len(request.history),
                "context": request.context,
                "refused": True,
                "refusal_reason": "non_medical_query",
            }

        rag_context = get_rag_context(user_message, k=3)

        reply = generate_nurse_response(
            message=user_message,
            rag_context=rag_context,
            patient_context=request.context,
            history=request.history,
            language=request.language,
        )

        print("FINAL PYTHON REPLY =", reply[:500])

        return {
            "reply": reply,
            "patient_id": request.patient_id,
            "language": request.language,
            "history_count": len(request.history),
            "context": request.context,
        }

    except HTTPException:
        raise
    except Exception as e:
        print("NURSE CHAT ERROR =", str(e))
        raise HTTPException(status_code=500, detail=str(e))
