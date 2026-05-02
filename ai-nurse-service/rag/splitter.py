import os
from typing import List
from dotenv import load_dotenv

from langchain_text_splitters import RecursiveCharacterTextSplitter

load_dotenv()

# =========================
# ⚙️ Config (direct, no config.py)
# =========================
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", 500))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", 100))


# =========================
# ✂️ Split Documents
# =========================
def split_documents(documents: List):
    """
    Splits documents into smaller chunks for RAG
    """

    if not documents:
        return []

    try:
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP
        )

        chunks = splitter.split_documents(documents)

        return chunks

    except Exception:
        return []


# =========================
# 📄 Split Raw Text (optional)
# =========================
def split_text(text: str):
    """
    Splits raw text string into chunks (useful for direct input)
    """

    if not text:
        return []

    try:
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP
        )

        chunks = splitter.split_text(text)

        return chunks

    except Exception:
        return []