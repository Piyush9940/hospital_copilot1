from deep_translator import GoogleTranslator
import re

LANGUAGE_MAP = {
    "en": "english",
    "hi": "hindi",
    "kn": "kannada",
    "ta": "tamil",
    "te": "telugu",
    "auto": "auto"
}

def clean_markdown(text: str) -> str:
    """Remove markdown so translator doesn't choke on symbols"""
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)   # **bold** → bold
    text = re.sub(r'\*(.*?)\*', r'\1', text)         # *italic* → italic
    text = re.sub(r'^\s*[\*\-]\s+', '', text, flags=re.MULTILINE)  # bullet points
    text = re.sub(r'^\s*\d+\.\s+', '', text, flags=re.MULTILINE)   # numbered lists
    return text.strip()


def translate_chunk(chunk: str, source: str, target: str) -> str:
    """Translate a single chunk"""
    try:
        result = GoogleTranslator(source=source, target=target).translate(chunk)
        return result or chunk
    except Exception as e:
        print(f"Chunk translation error: {e}")
        return chunk


def translate_text(text: str, target_language: str = "en", source_language: str = "auto") -> str:
    if not text or not text.strip():
        return ""

    try:
        source = LANGUAGE_MAP.get(source_language, source_language)
        target = LANGUAGE_MAP.get(target_language, target_language)

        # Clean markdown before translating
        cleaned = clean_markdown(text)

        # Split into chunks of 400 chars max (Google Translate limit is 5000 but
        # smaller chunks are more reliable for Hindi)
        max_chunk = 400
        if len(cleaned) <= max_chunk:
            return translate_chunk(cleaned, source, target)

        # Split on sentence boundaries
        sentences = re.split(r'(?<=[।.!?])\s+', cleaned)
        chunks = []
        current = ""

        for sentence in sentences:
            if len(current) + len(sentence) < max_chunk:
                current += " " + sentence
            else:
                if current:
                    chunks.append(current.strip())
                current = sentence

        if current:
            chunks.append(current.strip())

        # Translate each chunk and join
        translated_chunks = [translate_chunk(c, source, target) for c in chunks]
        return " ".join(translated_chunks)

    except Exception as e:
        print(f"Translation error: {e}")
        return ""


def translate_response(text: str, target_language: str = "en", source_language: str = "auto"):
    translated_text = translate_text(text, target_language, source_language)

    if not translated_text:
        return {"success": False, "error": "Translation failed"}

    return {
        "success": True,
        "translated_text": translated_text,
        "target_language": target_language
    }