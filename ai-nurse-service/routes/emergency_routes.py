from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.emergency_summary import (
    generate_emergency_summary,
    generate_emergency_rag_response,
    generate_report_collection_summary,
)

router = APIRouter(prefix="/api/v1/emergency", tags=["Emergency"])
ai_router = APIRouter(prefix="/ai", tags=["AI"])

class PatientData(BaseModel):
    patientId: Optional[str] = None
    medicalContext: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    history: Optional[str] = None
    allergies: Optional[str] = None
    medications: Optional[str] = None
    reports: Optional[list] = None

class RAGRequest(BaseModel):
    patient_id: str
    question: str
    patientData: PatientData

@router.post("/summarize")
async def get_emergency_summary(data: PatientData):
    try:
        result = generate_emergency_summary(data.dict())
        return {"success": True, "summary": result.get("summary", ""), "risk_level": result.get("risk_level", "Unknown")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rag")
async def ask_emergency_question(req: RAGRequest):
    try:
        print(
            f"Emergency RAG request patient_id={req.patient_id} "
            f"question={req.question!r} "
            f"reports={len(req.patientData.reports or [])}",
            flush=True,
        )
        response = generate_emergency_rag_response(req.question, req.patient_id, req.patientData.dict())
        print(f"Emergency RAG response length={len(str(response or ''))}", flush=True)
        return {"success": True, "response": response or "No response generated."}
    except Exception as e:
        print(f"Emergency RAG error: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/report-summary")
async def summarize_patient_reports(data: PatientData):
    try:
        reports = data.reports or []
        print(f"Emergency report summary request reports={len(reports)}", flush=True)
        summary = generate_report_collection_summary(data.dict())
        return {"success": True, "summary": summary or "No report summary generated.", "report_count": len(reports)}
    except Exception as e:
        print(f"Emergency report summary error: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))

@ai_router.post("/query")
async def ai_query(req: RAGRequest):
    try:
        print(
            f"AI query request patient_id={req.patient_id} "
            f"question={req.question!r} "
            f"reports={len(req.patientData.reports or [])}",
            flush=True,
        )
        response = generate_emergency_rag_response(req.question, req.patient_id, req.patientData.dict())
        print(f"AI query response length={len(str(response or ''))}", flush=True)
        return {"success": True, "response": response or "No response generated."}
    except Exception as e:
        print(f"AI query error: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))
