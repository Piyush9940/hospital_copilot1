import os
import uuid
import asyncio
from dotenv import load_dotenv

import edge_tts

load_dotenv()

# =========================
# ⚙️ Config
# =========================
VOICE = os.getenv("TTS_VOICE", "en-US-AriaNeural")
OUTPUT_DIR = os.getenv("TTS_OUTPUT_DIR", "audio")

os.makedirs(OUTPUT_DIR, exist_ok=True)


# =========================
# 🔊 Generate Speech File
# =========================
async def generate_tts_async(text: str) -> str:
    """
    Convert text to speech and save as audio file.
    Returns file path.
    """
    if not text or not text.strip():
        return ""

    try:
        file_name = f"{uuid.uuid4()}.mp3"
        file_path = os.path.join(OUTPUT_DIR, file_name)

        communicate = edge_tts.Communicate(text, VOICE)
        await communicate.save(file_path)

        return file_path

    except Exception:
        return ""


# =========================
# 🔁 Sync Wrapper
# =========================
def generate_tts(text: str) -> str:
    """
    Synchronous wrapper for TTS
    """
    try:
        return asyncio.run(generate_tts_async(text))
    except Exception:
        return ""


# =========================
# 📦 Return Audio Response
# =========================
def tts_response(text: str):
    """
    Returns dict with audio file path
    """
    file_path = generate_tts(text)

    if not file_path:
        return {
            "success": False,
            "error": "TTS failed"
        }

    return {
        "success": True,
        "audio_path": file_path
    }