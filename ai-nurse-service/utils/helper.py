from typing import List, Dict, Any
from datetime import datetime


# =========================
# 🧠 Format Chat History
# =========================
def format_chat_history(messages: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    """
    Converts DB chat messages into LLM-friendly format
    """
    formatted = []

    for msg in messages:
        formatted.append({
            "role": msg.get("role", "user"),
            "content": msg.get("content", "")
        })

    return formatted


# =========================
# 🧬 Build Patient Context String
# =========================
def build_patient_context(context: Dict[str, str]) -> str:
    """
    Converts patient context into a readable string for prompt
    """
    return (
        f"Patient Profile:\n"
        f"- Gender: {context.get('gender', 'Unknown')}\n"
        f"- Medical History: {context.get('history', 'None')}\n"
        f"- Allergies: {context.get('allergies', 'None')}\n"
        f"- Medications: {context.get('medications', 'None')}\n"
    )


# =========================
# 🧠 Build Final Prompt
# =========================
def build_prompt(
    system_prompt: str,
    patient_context: str,
    chat_history: List[Dict[str, str]],
    user_message: str
) -> List[Dict[str, str]]:
    """
    Combines system prompt, patient context, history, and new message
    into final LLM input
    """

    messages = []

    # System instruction
    messages.append({
        "role": "system",
        "content": f"{system_prompt}\n\n{patient_context}"
    })

    # Previous chat history
    messages.extend(chat_history)

    # Current user message
    messages.append({
        "role": "user",
        "content": user_message
    })

    return messages


# =========================
# 🧾 Safe Response Wrapper
# =========================
def format_response(reply: str) -> Dict[str, Any]:
    """
    Standard API response format
    """
    return {
        "success": True,
        "reply": reply,
        "timestamp": datetime.utcnow().isoformat()
    }


# =========================
# ❌ Error Response
# =========================
def error_response(message: str) -> Dict[str, Any]:
    """
    Standard error response format
    """
    return {
        "success": False,
        "error": message,
        "timestamp": datetime.utcnow().isoformat()
    }


# =========================
# 🔎 Validate Input
# =========================
def validate_chat_request(data: Dict[str, Any]) -> bool:
    """
    Basic validation for incoming request
    """
    if not data:
        return False

    if "message" not in data:
        return False

    if not data["message"].strip():
        return False

    return True


# =========================
# ✂️ Trim Chat History
# =========================
def trim_history(messages: List[Dict[str, Any]], max_len: int = 8) -> List[Dict[str, Any]]:
    """
    Keeps only last N messages for context
    """
    return messages[-max_len:]


# =========================
# 🛡️ Add Medical Disclaimer
# =========================
def add_disclaimer(reply: str) -> str:
    """
    Appends medical disclaimer to AI response
    """
    disclaimer = "\n\n⚠️ This is not a medical diagnosis. Please consult a qualified doctor for professional advice."
    return reply + disclaimer


# =========================
# 🧠 Extract Language (Optional)
# =========================
def extract_language(data: Dict[str, Any]) -> str:
    """
    Extracts language from request or defaults to English
    """
    return data.get("language", "en")