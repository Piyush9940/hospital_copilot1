import os
from dotenv import load_dotenv

from langchain_huggingface import HuggingFaceEmbeddings

load_dotenv()

EMBEDDING_MODEL = os.getenv(
    "EMBEDDING_MODEL",
    "sentence-transformers/all-MiniLM-L6-v2"
)

_embeddings_instance = None


def get_embeddings():
    """
    Returns a singleton embeddings object.
    """
    global _embeddings_instance

    if _embeddings_instance is not None:
        return _embeddings_instance

    try:
        _embeddings_instance = HuggingFaceEmbeddings(
            model_name=EMBEDDING_MODEL,
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True}
        )

        return _embeddings_instance

    except Exception as e:
        raise e


def embed_query(text: str):
    """
    Embeds a single query string.
    """
    if not text or not text.strip():
        return []

    try:
        embeddings = get_embeddings()
        vector = embeddings.embed_query(text)
        return vector

    except Exception:
        return []


def embed_documents(texts: list[str]):
    """
    Embeds a list of text chunks.
    """
    if not texts:
        return []

    try:
        embeddings = get_embeddings()
        vectors = embeddings.embed_documents(texts)
        return vectors

    except Exception:
        return []