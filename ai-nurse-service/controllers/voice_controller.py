import os
from fastapi import UploadFile
from fastapi.responses import JSONResponse, FileResponse

from services.stt_service import speech_to_text_from_file
from services.tts_service import generate_tts

TEMP_AUDIO_DIR = "temp_audio"
os.makedirs(TEMP_AUDIO_DIR, exist_ok=True)


async def speech_to_text_controller(audio: UploadFile):
    temp_path = os.path.join(TEMP_AUDIO_DIR, audio.filename)

    try:
        with open(temp_path, "wb") as f:
            f.write(await audio.read())

        text = speech_to_text_from_file(temp_path)

        if not text:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "Could not recognize speech"
                }
            )

        return {
            "success": True,
            "text": text
        }

    except Exception as exc:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Speech-to-text failed",
                "details": str(exc)
            }
        )

    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass


async def text_to_speech_controller(payload: dict):
    try:
        text = payload.get("text", "")

        if not isinstance(text, str) or not text.strip():
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "Text is required"
                }
            )

        audio_path = generate_tts(text.strip())

        if not audio_path:
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "error": "Text-to-speech failed"
                }
            )

        return {
            "success": True,
            "audio_path": audio_path
        }

    except Exception as exc:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Text-to-speech failed",
                "details": str(exc)
            }
        )


async def text_to_speech_file_controller(payload: dict):
    try:
        text = payload.get("text", "")

        if not isinstance(text, str) or not text.strip():
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "Text is required"
                }
            )

        audio_path = generate_tts(text.strip())

        if not audio_path or not os.path.exists(audio_path):
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "error": "Audio generation failed"
                }
            )

        return FileResponse(
            path=audio_path,
            media_type="audio/mpeg",
            filename=os.path.basename(audio_path)
        )

    except Exception as exc:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Text-to-speech file response failed",
                "details": str(exc)
            }
        )