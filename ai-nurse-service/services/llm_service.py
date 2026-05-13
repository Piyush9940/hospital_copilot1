import os
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from groq import Groq

load_dotenv()

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "groq").strip().lower()
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant").strip()
TEMPERATURE = float(os.getenv("TEMPERATURE", "0.4"))
MAX_TOKENS = int(os.getenv("MAX_TOKENS", "2000"))


def _safe_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _format_history(history: Optional[List[Dict[str, Any]]]) -> str:
    if not history:
        return ""

    lines = []
    for item in history:
        if not isinstance(item, dict):
            continue

        role = _safe_text(item.get("role") or "user")
        content = _safe_text(
            item.get("content")
            or item.get("message")
            or item.get("text")
            or ""
        )

        if content:
            lines.append(f"{role}: {content}")

    return "\n".join(lines)


def build_nurse_prompt(
    message: str,
    rag_context: str = "",
    patient_context: Optional[Dict[str, Any]] = None,
    history: Optional[List[Dict[str, Any]]] = None,
    language: str = "en",
) -> str:
    patient_context = patient_context or {}
    history_text = _format_history(history)

    return f"""
You are an AI Nurse assistant for a hospital copilot system.

Rules:
- Only answer medical, healthcare, patient-care, appointment, report, medication, symptom, vital, emergency, wellness, prevention, nutrition, sleep, mental-health, pregnancy, vaccine, first-aid, or general health-education questions.
- General medical questions are allowed even when they are not about the current patient, such as "What is hypertension?", "How can I sleep better?", or "What causes fever?"
- If the user asks about unrelated topics such as entertainment, coding, finance, politics, general trivia, travel, shopping, or personal tasks, politely refuse and invite a medical question.
- If uploaded documents or attachment metadata are present, use them only for medically relevant questions. If the query is unrelated to the document or not healthcare-related, politely refuse instead of summarizing or analyzing it.
- Give calm, clear, practical, medically cautious answers.
- Use the retrieved medical knowledge when relevant.
- Use the patient context when relevant.
- If a skin disease prediction result is provided in the context, explain what the predicted class means, its risks, precautions, when to see a doctor, and emergency signs.
- Do not give unsafe medication dosages.
- Do not act as a final diagnosis.
- If symptoms are severe or dangerous, advise urgent medical attention.

Patient context & test results:
{patient_context}

Conversation history:
{history_text}

Retrieved medical knowledge:
{rag_context}

User message:
{message}

Respond in language: {language}
""".strip()


def generate_groq_response(prompt: str) -> str:
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is missing")

    client = Groq(api_key=GROQ_API_KEY)

    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a helpful AI Nurse. "
                    "Only answer medical or health-related questions, including general health education. "
                    "Provide medically cautious guidance, not a final diagnosis."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        temperature=TEMPERATURE,
        max_tokens=MAX_TOKENS,
    )

    content = response.choices[0].message.content
    content = _safe_text(content)

    if not content:
        raise ValueError("Groq returned empty content")

    return content


def generate_llm_response(prompt: str) -> str:
    if not _safe_text(prompt):
        raise ValueError("Prompt is empty")

    if LLM_PROVIDER != "groq":
        raise ValueError(f"Unsupported LLM_PROVIDER: {LLM_PROVIDER}")

    return generate_groq_response(prompt)


def generate_nurse_response(
    message: str,
    rag_context: str = "",
    patient_context: Optional[Dict[str, Any]] = None,
    history: Optional[List[Dict[str, Any]]] = None,
    language: str = "en",
) -> str:
    message = _safe_text(message)
    if not message:
        raise ValueError("Message is empty")

    prompt = build_nurse_prompt(
        message=message,
        rag_context=rag_context,
        patient_context=patient_context,
        history=history,
        language=language,
    )

    print("LLM_PROVIDER =", LLM_PROVIDER)
    print("GROQ_MODEL =", GROQ_MODEL)
    print("Prompt preview =", prompt[:500])

    reply = generate_llm_response(prompt)

    if not reply:
        raise ValueError("LLM returned empty response")

    print("LLM reply preview =", reply[:300])

    return reply


def check_if_medical_query(message: str, context: Optional[Dict[str, Any]] = None) -> bool:
    """
    Uses the LLM to evaluate if a user's query is generally related to
    medicine, health, symptoms, reports, appointments, etc.
    """
    message = _safe_text(message)
    if not message:
        return False
        
    attachments_str = ""
    if context:
        attachments = context.get("uploadedAttachments") or context.get("attachments") or []
        if isinstance(attachments, list):
            attachments_str = " ".join(
                f"{item.get('name', '')} {item.get('type', '')}" if isinstance(item, dict) else str(item)
                for item in attachments
            )

    combined_text = f"User query: {message}\nAttachments: {attachments_str}".strip()

    prompt = f"""
Evaluate if the following text or its context is related to medicine, healthcare, diseases, symptoms, wellness, prevention, nutrition, sleep, mental health, pregnancy, vaccines, first aid, medical appointments, hospital queries, patient care, medical imaging, or any related health topic.
Even general expressions of physical or mental discomfort (e.g. "I hurt", "my head is spinning", "I can't sleep") should be considered medical.
General health-education questions (e.g. "What is hypertension?", "What causes fever?", "How can I improve sleep?") should be considered medical.

Text to evaluate:
{combined_text}

Answer strictly with "YES" if it is medically related, or "NO" if it is completely unrelated to medicine or healthcare (e.g. general chit-chat, coding, finance, games, entertainment, politics, shopping, travel planning).
""".strip()

    try:
        client = Groq(api_key=GROQ_API_KEY)
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": "You are a binary classification model. Only output 'YES' or 'NO'."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.0,
            max_tokens=10,
        )
        content = _safe_text(response.choices[0].message.content).upper()
        return "YES" in content
    except Exception as e:
        print(f"Error classifying medical query: {e}")
        # Default to True on failure so we don't accidentally block valid medical queries
        return True
