from fastapi import Body
from fastapi.responses import JSONResponse

from services.translation_service import translate_text


async def translate_controller(payload: dict = Body(...)):
    try:
        text = payload.get("text", "")
        target_language = payload.get("target_language") or payload.get("targetLanguage") or "en"
        source_language = payload.get("source_language") or payload.get("sourceLanguage") or "auto"

        if not isinstance(text, str) or not text.strip():
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "Text is required"
                }
            )

        translated_text = translate_text(
            text=text.strip(),
            target_language=target_language,
            source_language=source_language
        )

        if not translated_text:
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "error": "Translation failed"
                }
            )

        return {
            "success": True,
            "original_text": text.strip(),
            "translated_text": translated_text,
            "target_language": target_language,
            "source_language": source_language
        }

    except Exception as exc:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Internal server error during translation",
                "details": str(exc)
            }
        )