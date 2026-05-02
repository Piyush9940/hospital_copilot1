import os
from dotenv import load_dotenv

import speech_recognition as sr

load_dotenv()

# =========================
# ⚙️ Config
# =========================
LANGUAGE = os.getenv("STT_LANGUAGE", "en-US")


# =========================
# 🎤 Speech → Text (File)
# =========================
def speech_to_text_from_file(audio_path: str) -> str:
    """
    Convert audio file to text
    """

    if not os.path.exists(audio_path):
        return ""

    recognizer = sr.Recognizer()

    try:
        with sr.AudioFile(audio_path) as source:
            audio = recognizer.record(source)

        text = recognizer.recognize_google(audio, language=LANGUAGE)
        return text

    except sr.UnknownValueError:
        return ""

    except sr.RequestError:
        return ""

    except Exception:
        return ""


# =========================
# 🎤 Speech → Text (Mic)
# =========================
def speech_to_text_from_mic() -> str:
    """
    Capture microphone input and convert to text
    """

    recognizer = sr.Recognizer()

    try:
        with sr.Microphone() as source:
            recognizer.adjust_for_ambient_noise(source)
            audio = recognizer.listen(source)

        text = recognizer.recognize_google(audio, language=LANGUAGE)
        return text

    except sr.UnknownValueError:
        return ""

    except sr.RequestError:
        return ""

    except Exception:
        return ""


# =========================
# 📦 API Response Wrapper
# =========================
def stt_response(audio_path: str):
    """
    Returns structured STT response
    """
    text = speech_to_text_from_file(audio_path)

    if not text:
        return {
            "success": False,
            "error": "Speech recognition failed"
        }

    return {
        "success": True,
        "text": text
    }