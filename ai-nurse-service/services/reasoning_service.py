import os
from pathlib import Path
from dotenv import load_dotenv

from services.rag_service import get_rag_context
from services.llm_service import generate_llm_response
from utils.config import settings

load_dotenv()

MAX_HISTORY = int(os.getenv("MAX_HISTORY_MESSAGES", 8))

BASE_DIR = Path(__file__).resolve().parent.parent
PROMPTS_DIR = BASE_DIR / "prompts"


def load_prompt_file(file_name: str) -> str:
    try:
        file_path = PROMPTS_DIR / file_name
        return file_path.read_text(encoding="utf-8").strip()
    except Exception:
        return ""


def load_system_prompt() -> str:
    return load_prompt_file("system_prompt.txt")


def load_safety_prompt() -> str:
    return load_prompt_file("safety_prompt.txt")


def load_response_style_prompt() -> str:
    return load_prompt_file("response_style_prompt.txt")


def _normalize_value(value):
    if value is None:
        return "None"

    if isinstance(value, list):
        cleaned = [str(item).strip() for item in value if str(item).strip()]
        return ", ".join(cleaned) if cleaned else "None"

    if isinstance(value, dict):
        return ", ".join(f"{k}: {v}" for k, v in value.items()) or "None"

    value = str(value).strip()
    return value if value else "None"


def format_patient_context(patient: dict) -> str:
    patient = patient or {}

    return (
        f"Patient Profile:\n"
        f"- Gender: {_normalize_value(patient.get('gender'))}\n"
        f"- Age: {_normalize_value(patient.get('age'))}\n"
        f"- Medical History: {_normalize_value(patient.get('history'))}\n"
        f"- Allergies: {_normalize_value(patient.get('allergies'))}\n"
        f"- Medications: {_normalize_value(patient.get('medications'))}\n"
        f"- Latest Vitals: {_normalize_value(patient.get('latestVitals') or patient.get('vitals'))}\n"
        f"- Recent Reports: {_normalize_value(patient.get('recentReports') or patient.get('reports'))}\n"
        f"- Current Appointment: {_normalize_value(patient.get('appointment'))}\n"
    )


def format_chat_history(messages: list) -> str:
    if not isinstance(messages, list) or not messages:
        return "No previous conversation."

    trimmed = messages[-MAX_HISTORY:]
    lines = []

    for msg in trimmed:
        if not isinstance(msg, dict):
            continue

        role = str(msg.get("role", "user")).upper()
        content = str(msg.get("content", "")).strip()

        if content:
            lines.append(f"{role}: {content}")

    return "\n".join(lines) if lines else "No previous conversation."


def build_prompt(user_message: str, history: list, patient: dict, language: str = "en") -> str:
    try:
        system_prompt = load_system_prompt()
        safety_prompt = load_safety_prompt()
        style_prompt = load_response_style_prompt()

        patient_context = format_patient_context(patient)
        chat_history = format_chat_history(history)
        rag_context = get_rag_context(user_message)

        language_instruction = (
            f"Respond in language code: {language}.\n"
            "If the user writes in another language, reply in that same language when appropriate."
        )

        prompt = f"""
{system_prompt}

{safety_prompt}

{style_prompt}

{language_instruction}

{patient_context}

Previous Conversation:
{chat_history}

Relevant Medical Knowledge:
{rag_context if rag_context else "No external retrieved context available."}

User Question:
{user_message}

Answer:
"""
        return prompt.strip()

    except Exception:
        return user_message.strip()


def generate_ai_reply(
    user_message: str,
    history: list,
    patient: dict,
    language: str = "en",
    patient_id=None,
):
    if not user_message or not user_message.strip():
        return "Please enter a valid message."

    try:
        if not isinstance(patient, dict) or not patient:
            default_context = getattr(settings, "DEFAULT_PATIENT_CONTEXT", {})
            patient = default_context.copy() if isinstance(default_context, dict) else {}

        prompt = build_prompt(
            user_message=user_message.strip(),
            history=history or [],
            patient=patient,
            language=language or "en",
        )

        response = generate_llm_response(prompt)

        if not response:
            return "Sorry, I couldn't process your request right now."

        return add_medical_disclaimer(response)

    except Exception:
        return "Something went wrong while processing your request."


def add_medical_disclaimer(text: str) -> str:
    disclaimer = "⚠️ This is not a medical diagnosis. Please consult a doctor."

    if disclaimer in text:
        return text

    if getattr(settings, "FORCE_DISCLAIMER", True):
        return f"{text}\n\n{disclaimer}"

    return text