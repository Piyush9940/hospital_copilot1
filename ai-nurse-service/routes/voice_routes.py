from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel, Field
import httpx
from fastapi.responses import StreamingResponse


router = APIRouter()


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1)
    language: str = "en"
    voice: str = "default"


@router.post("/stt")
async def stt_route(file: UploadFile = File(...)):
    try:
        if not file:
            raise HTTPException(status_code=400, detail="Audio file is required")

        return {
            "text": "Speech-to-text output will appear here",
            "filename": file.filename,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tts")
async def tts_route(request: TTSRequest):
    try:
        lang_map = {
            "en": "en-US",
            "hi": "hi",
            "kn": "kn",
            "ta": "ta",
            "te": "te",
        }
        lang = lang_map.get(request.language, "en")
        url = (
            f"https://translate.googleapis.com/translate_tts"
            f"?ie=UTF-8&q={request.text}&tl={lang}&client=gtx"
        )

        async  with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                headers={"User-Agent": "Mozilla/5.0"},
                timeout=10,
            )
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="TTS generation failed")

        return StreamingResponse(
            iter([response.content]),
            media_type="audio/mpeg"
            )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))