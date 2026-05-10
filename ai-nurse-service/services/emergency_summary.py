import os
from typing import Dict, Any, List
from services.llm_service import generate_llm_response

def _extract_pdf_text(report: Dict[str, Any]) -> str:
    pdf_path = report.get('pdf_url') or report.get('pdfPath') or report.get('pdfUrl') or ""
    if not pdf_path or not str(pdf_path).lower().endswith(".pdf"):
        return ""

    candidates = []
    raw_path = str(pdf_path).strip()
    if os.path.isabs(raw_path):
        candidates.append(raw_path)
    else:
        candidates.append(os.path.abspath(raw_path.lstrip("/\\")))

    if raw_path.startswith("/uploads"):
        candidates.append(os.path.abspath(os.path.join(os.getcwd(), "..", "backend", raw_path.lstrip("/"))))
        candidates.append(os.path.abspath(os.path.join(os.getcwd(), raw_path.lstrip("/"))))

    try:
        from pypdf import PdfReader
    except Exception:
        return ""

    for candidate in candidates:
        if not os.path.exists(candidate):
            continue

        try:
            reader = PdfReader(candidate)
            pages = []
            for page in reader.pages[:8]:
                pages.append(page.extract_text() or "")
            return "\n".join(pages).strip()[:6000]
        except Exception as exc:
            print(f"PDF extraction failed for {candidate}: {exc}", flush=True)

    return ""

def _format_report(report: Dict[str, Any], index: int) -> str:
    title = report.get('title') or report.get('diagnosis') or f"Report {index}"
    diagnosis = report.get('diagnosis') or "Not stated"
    summary = report.get('summary') or "No summary stored"
    created_at = report.get('created_at') or report.get('createdAt') or "Unknown date"
    pdf_path = report.get('pdf_url') or report.get('pdfPath') or report.get('pdfUrl') or "No PDF path"
    extracted_text = report.get('pdfText') or report.get('extractedText') or _extract_pdf_text(report)

    text_part = f"\n  Extracted PDF text: {extracted_text[:2500]}" if extracted_text else ""

    return (
        f"{index}. {title}\n"
        f"  Date: {created_at}\n"
        f"  Diagnosis: {diagnosis}\n"
        f"  Stored summary: {summary}\n"
        f"  PDF: {pdf_path}"
        f"{text_part}"
    )

def format_reports_for_prompt(reports_list: List[Dict[str, Any]]) -> str:
    if not reports_list:
        return "No previous medical reports are stored for this patient."

    return "\n\n".join(
        _format_report(report, index)
        for index, report in enumerate(reports_list, start=1)
        if isinstance(report, dict)
    )

def generate_emergency_summary(patient_data: Dict[str, Any]) -> str:
    # Format the reports if they exist
    reports_text = "None"
    reports_list = patient_data.get('reports', [])
    if reports_list and isinstance(reports_list, list) and len(reports_list) > 0:
        reports_text = format_reports_for_prompt(reports_list)

    prompt = f"""
    You are an emergency medical AI summarizer.
    Create a concise, structured emergency summary for the doctor.
    
    Patient Data:
    Current Emergency Context: {patient_data.get('medicalContext', 'Not provided')}
    Age: {patient_data.get('age', 'Unknown')}
    Gender: {patient_data.get('gender', 'Unknown')}
    Medical History: {patient_data.get('history', 'None reported')}
    Allergies: {patient_data.get('allergies', 'None reported')}
    Medications: {patient_data.get('medications', 'None reported')}
    Past Medical Reports:
    {reports_text}
    
    Format the output as a valid JSON object with EXACTLY these two keys:
    "summary": "the brief structured summary string",
    "risk_level": "High", "Medium", or "Low" based on the medical data severity.
    """
    
    import json
    response_text = generate_llm_response(prompt)
    try:
        # Simple extraction in case LLM wraps in markdown code blocks
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0]
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0]
        return json.loads(response_text)
    except:
        return {"summary": response_text, "risk_level": "Unknown"}

from rag.vector_store import get_vector_store
from langchain_core.documents import Document

def generate_emergency_rag_response(question: str, patient_id: str, patient_data: Dict[str, Any]) -> str:
    try:
        store = get_vector_store()
        
        # Store embedding with metadata (Requirement)
        reports_text = "None"
        reports_list = patient_data.get('reports', [])
        if reports_list and isinstance(reports_list, list) and len(reports_list) > 0:
            reports_text = format_reports_for_prompt(reports_list)
            
        context_str = f"Current Emergency Context: {patient_data.get('medicalContext', 'Not provided')}\nAge: {patient_data.get('age')}\nGender: {patient_data.get('gender')}\nHistory: {patient_data.get('history')}\nAllergies: {patient_data.get('allergies')}\nMedications: {patient_data.get('medications')}\nPast Medical Reports: {reports_text}"
        doc = Document(
            page_content=context_str,
            metadata={"patient_id": patient_id, "source": "emergency_profile"}
        )
        store.add_documents([doc])
        
        # Retrieve only for this patient_id
        results = store.similarity_search(question, k=3, filter={"patient_id": patient_id})
        retrieved_context = "\n".join([d.page_content for d in results])
        
    except Exception as e:
        print("Vector DB error:", e)
        retrieved_context = str(patient_data)

    prompt = f"""
    You are an emergency medical assistant. A doctor is asking a question about a patient in an active emergency.
    
    Retrieved Patient Context:
    {retrieved_context}
    
    Doctor's Question: {question}
    
    Answer the question accurately based ONLY on the patient context above. If the context doesn't contain the answer, say "Information not available in patient profile." Keep it brief and medically precise.
    """
    
    return generate_llm_response(prompt)

def generate_report_collection_summary(patient_data: Dict[str, Any]) -> str:
    reports_list = patient_data.get('reports', [])
    reports_text = format_reports_for_prompt(reports_list if isinstance(reports_list, list) else [])

    prompt = f"""
    You are an emergency medical AI assistant helping a doctor quickly understand a patient's prior reports.

    Patient profile:
    Age: {patient_data.get('age', 'Unknown')}
    Gender: {patient_data.get('gender', 'Unknown')}
    History: {patient_data.get('history', 'None reported')}
    Allergies: {patient_data.get('allergies', 'None reported')}
    Medications: {patient_data.get('medications', 'None reported')}

    All available medical report records and attached PDF references:
    {reports_text}

    Create a concise doctor-facing summary with these sections:
    1. Overall pattern across reports
    2. Important diagnoses/findings
    3. Medications/allergies/history relevant to emergency care
    4. Red flags or follow-up questions for the doctor
    5. Reports/PDFs reviewed count

    Use only the provided report/profile data. If PDF text is not available, say that the summary is based on stored report metadata and summaries.
    """

    return generate_llm_response(prompt)
