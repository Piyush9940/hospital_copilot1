from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from services.translation_service import translate_text



router = APIRouter()


class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1)
    source_language: str = "en"
    target_language: str = "en"


@router.post("/translate")
async def translate_route(request: TranslateRequest):
    try:
        translated = translate_text(
            text = request.text,
            source_language = request.source_language,
            target_language = request.target_language
        )
        if not translated:
            raise HTTPException(status_code=500, detail="Translation failed")

        return {
            "translatedText": translated,
            "source_language": request.source_language,
            "target_language": request.target_language,
        }
    except HTTPException:
        raise
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))