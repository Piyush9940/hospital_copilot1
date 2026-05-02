import os
from dotenv import load_dotenv

from rag.vector_store import get_vector_store

load_dotenv()

TOP_K_RESULTS = int(os.getenv("TOP_K_RESULTS", 3))


def retrieve_documents(query: str, k: int = None):
    """
    Retrieve top-k relevant documents for a query.
    """
    if not query or not query.strip():
        return []

    try:
        top_k = k if k is not None else TOP_K_RESULTS

        vector_store = get_vector_store()
        results = vector_store.similarity_search(query, k=top_k)

        return results

    except Exception:
        return []


def retrieve_context(query: str, k: int = None) -> str:
    """
    Retrieve top-k documents and combine them into one context string.
    """
    try:
        docs = retrieve_documents(query, k=k)

        if not docs:
            return ""

        context_parts = []
        for i, doc in enumerate(docs, start=1):
            content = doc.page_content.strip()
            if content:
                context_parts.append(f"[Context {i}]\n{content}")

        final_context = "\n\n".join(context_parts)

        return final_context

    except Exception:
        return ""


def retrieve_documents_with_metadata(query: str, k: int = None):
    """
    Retrieve top-k relevant documents along with their metadata.
    Useful if you want source info later.
    """
    try:
        docs = retrieve_documents(query, k=k)

        results = []
        for doc in docs:
            results.append({
                "content": doc.page_content,
                "metadata": doc.metadata
            })

        return results

    except Exception:
        return []