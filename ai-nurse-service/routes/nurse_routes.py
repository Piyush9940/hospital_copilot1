from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from services.rag_service import get_rag_context
from services.llm_service import generate_nurse_response

router = APIRouter()


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