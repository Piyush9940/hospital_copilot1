import os
from dotenv import load_dotenv

from utils.logger import logger
from rag.loader import load_and_prepare_documents
from rag.vector_store import create_vector_store, get_vector_store
from rag.retriever import retrieve_context, retrieve_documents_with_metadata

load_dotenv()

ENABLE_RAG = os.getenv("ENABLE_RAG", "false").lower() == "true"


def initialize_rag():
    """
    Loads documents, splits them, and builds the vector store.
    Run this once when preparing your knowledge base.
    """
    try:
        logger.info("Initializing RAG pipeline...")

        chunks = load_and_prepare_documents()

        if not chunks:
            logger.warning("No chunks found. RAG initialization skipped.")
            return False

        vector_store = create_vector_store(chunks)

        if vector_store is None:
            logger.error("Vector store creation failed.")
            return False

        logger.info("RAG pipeline initialized successfully.")
        return True

    except Exception:
        logger.exception("Failed to initialize RAG pipeline")
        return False


def get_rag_context(query: str, k: int = 3) -> str:
    """
    Returns combined retrieved context for a query.
    """
    if not ENABLE_RAG:
        logger.info("RAG is disabled. Returning empty context.")
        return ""

    if not query or not query.strip():
        logger.warning("Empty query received for RAG context")
        return ""

    try:
        context = retrieve_context(query, k=k)

        if not context:
            logger.warning("No RAG context found for query")
            return ""

        logger.info("RAG context retrieved successfully")
        return context

    except Exception:
        logger.exception("Failed to get RAG context")
        return ""


def get_rag_sources(query: str, k: int = 3):
    """
    Returns retrieved documents with metadata.
    Useful if you want to show sources later.
    """
    if not ENABLE_RAG:
        logger.info("RAG is disabled. No sources returned.")
        return []

    if not query or not query.strip():
        logger.warning("Empty query received for RAG sources")
        return []

    try:
        results = retrieve_documents_with_metadata(query, k=k)

        if not results:
            logger.warning("No RAG sources found")
            return []

        logger.info(f"Retrieved {len(results)} RAG sources")
        return results

    except Exception:
        logger.exception("Failed to get RAG sources")
        return []


def ensure_vector_store():
    """
    Ensures the vector store is accessible.
    Can be called before retrieval.
    """
    if not ENABLE_RAG:
        logger.info("RAG disabled. Skipping vector store check.")
        return False

    try:
        get_vector_store()
        logger.info("Vector store is ready")
        return True

    except Exception:
        logger.exception("Vector store is not ready")
        return False