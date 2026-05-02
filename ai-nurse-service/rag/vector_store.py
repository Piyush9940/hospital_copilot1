import os
from pathlib import Path
from dotenv import load_dotenv

from langchain_chroma import Chroma
from rag.embeddings import get_embeddings

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"

# Force-load .env from ai-nurse-service root
load_dotenv(dotenv_path=ENV_PATH, override=True)

VECTOR_DB_PATH = os.getenv(
    "VECTOR_DB_PATH",
    str(BASE_DIR / "data" / "vector_db" / "langchain")
)

COLLECTION_NAME = os.getenv("COLLECTION_NAME", "langchain")


def _resolve_persist_dir() -> Path:
    persist_dir = Path(VECTOR_DB_PATH)

    if not persist_dir.is_absolute():
        persist_dir = BASE_DIR / persist_dir

    return persist_dir.resolve()


def get_vector_store():
    """
    Load the existing Chroma vector store.
    """
    persist_dir = _resolve_persist_dir()

    print("VECTOR_DB_PATH =", str(persist_dir))
    print("COLLECTION_NAME =", COLLECTION_NAME)

    if not persist_dir.exists():
        raise FileNotFoundError(f"Vector DB path does not exist: {persist_dir}")

    sqlite_file = persist_dir / "chroma.sqlite3"
    if not sqlite_file.exists():
        raise FileNotFoundError(f"chroma.sqlite3 not found in: {persist_dir}")

    embeddings = get_embeddings()

    vector_store = Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
        persist_directory=str(persist_dir),
    )

    try:
        print("Loaded vector store collection:", COLLECTION_NAME)
        print("Document count:", vector_store._collection.count())
    except Exception as e:
        print("Count check failed:", str(e))

    return vector_store


def create_vector_store(chunks):
    """
    Create a new Chroma vector store from document chunks.
    """
    if not chunks:
        return None

    try:
        persist_dir = _resolve_persist_dir()
        os.makedirs(persist_dir, exist_ok=True)

        embeddings = get_embeddings()

        vector_store = Chroma.from_documents(
            documents=chunks,
            embedding=embeddings,
            collection_name=COLLECTION_NAME,
            persist_directory=str(persist_dir),
        )

        try:
            print("Created vector store collection:", COLLECTION_NAME)
            print("Document count:", vector_store._collection.count())
        except Exception as e:
            print("Count check failed after create:", str(e))

        return vector_store

    except Exception as e:
        print("Create vector store failed:", str(e))
        return None


def add_documents_to_vector_store(chunks):
    """
    Add new chunks to the existing vector store.
    """
    if not chunks:
        return None

    try:
        vector_store = get_vector_store()
        vector_store.add_documents(chunks)

        try:
            print("Updated vector store collection:", COLLECTION_NAME)
            print("Document count:", vector_store._collection.count())
        except Exception as e:
            print("Count check failed after add:", str(e))

        return vector_store

    except Exception as e:
        print("Add documents failed:", str(e))
        return None


def similarity_search(query: str, k: int = 3):
    """
    Retrieve top-k similar documents from the vector store.
    """
    if not query or not query.strip():
        return []

    try:
        vector_store = get_vector_store()
        results = vector_store.similarity_search(query.strip(), k=k)

        print(f"Similarity search query: {query}")
        print(f"Similarity search results count: {len(results)}")

        return results

    except Exception as e:
        print("Similarity search failed:", str(e))
        return []


def delete_collection():
    """
    Delete the whole Chroma collection.
    Use carefully.
    """
    try:
        vector_store = get_vector_store()
        vector_store.delete_collection()
        print(f"Deleted collection: {COLLECTION_NAME}")
        return True

    except Exception as e:
        print("Delete collection failed:", str(e))
        return False