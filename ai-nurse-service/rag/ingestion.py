import os
import shutil
from pathlib import Path

import pypdf
import pypdf.filters
import pypdf.generic._data_structures
from dotenv import load_dotenv
from tqdm import tqdm

from langchain_community.document_loaders import PyPDFLoader, DirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma

# =========================
# FORCE PATCHING PYPDF LIMITS
# =========================
MEGA_LIMIT = 1_000_000_000

pypdf.filters.ZLIB_MAX_OUTPUT_LENGTH = MEGA_LIMIT
pypdf.filters.LZW_MAX_OUTPUT_LENGTH = MEGA_LIMIT
pypdf.generic._data_structures.STREAM_MAX_OUTPUT_LENGTH = MEGA_LIMIT

# =========================
# PATH SETUP
# =========================
# ingestion.py is inside /rag, so project root is one level up
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH, override=True)

MEDICAL_DOCS_PATH = os.getenv(
    "MEDICAL_DOCS_PATH",
    str(BASE_DIR / "data" / "medical_docs")
)

VECTOR_DB_PATH = os.getenv(
    "VECTOR_DB_PATH",
    str(BASE_DIR / "data" / "vector_db")
)

COLLECTION_NAME = os.getenv("COLLECTION_NAME", "langchain")
EMBEDDING_MODEL = os.getenv(
    "EMBEDDING_MODEL",
    "sentence-transformers/all-MiniLM-L6-v2"
)

CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", 1000))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", 150))
BATCH_SIZE = 50

# Set True only when you want a fresh rebuild
RESET_VECTOR_DB = False


def ingest_mega_dataset():
    docs_path = Path(MEDICAL_DOCS_PATH)
    vector_path = Path(VECTOR_DB_PATH)

    if not docs_path.is_absolute():
        docs_path = (BASE_DIR / docs_path).resolve()

    if not vector_path.is_absolute():
        vector_path = (BASE_DIR / vector_path).resolve()

    if not docs_path.exists():
        print(f"❌ Medical docs folder not found: {docs_path}")
        return

    if RESET_VECTOR_DB and vector_path.exists():
        print(f"🧹 Removing old vector DB at: {vector_path}")
        shutil.rmtree(vector_path)

    os.makedirs(vector_path, exist_ok=True)

    print("📂 Medical docs path:", docs_path)
    print("🧠 Vector DB path:", vector_path)
    print("🗂️ Collection name:", COLLECTION_NAME)
    print("🤖 Embedding model:", EMBEDDING_MODEL)

    print("\n🔄 Loading embedding model...")
    embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)

    loader = DirectoryLoader(
        str(docs_path),
        glob="**/*.pdf",
        loader_cls=PyPDFLoader,
        recursive=True,
        silent_errors=True,
    )

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP
    )

    vector_db = Chroma(
        collection_name=COLLECTION_NAME,
        persist_directory=str(vector_path),
        embedding_function=embeddings,
    )

    print("\n🚀 Processing medical library...")

    doc_iterator = loader.lazy_load()
    current_batch = []
    total_chunks = 0
    total_pages_seen = 0
    total_pages_skipped = 0

    with tqdm(desc="Processing Medical Library", unit=" chunks") as pbar:
        for doc in doc_iterator:
            total_pages_seen += 1

            try:
                page_text = (doc.page_content or "").strip()
                if not page_text:
                    total_pages_skipped += 1
                    continue

                page_chunks = text_splitter.split_documents([doc])

                if not page_chunks:
                    total_pages_skipped += 1
                    continue

                current_batch.extend(page_chunks)

                if len(current_batch) >= BATCH_SIZE:
                    vector_db.add_documents(current_batch)
                    batch_count = len(current_batch)
                    total_chunks += batch_count
                    pbar.update(batch_count)
                    current_batch = []

            except Exception as e:
                total_pages_skipped += 1
                print(f"⚠️ Skipped one page due to error: {e}")
                continue

        if current_batch:
            vector_db.add_documents(current_batch)
            batch_count = len(current_batch)
            total_chunks += batch_count
            pbar.update(batch_count)

    print("\n✅ Ingestion completed successfully!")
    print(f"📄 Pages seen: {total_pages_seen}")
    print(f"⏭️ Pages skipped: {total_pages_skipped}")
    print(f"🧩 Total chunks stored: {total_chunks}")

    try:
        verify_db = Chroma(
            collection_name=COLLECTION_NAME,
            persist_directory=str(vector_path),
            embedding_function=embeddings,
        )
        print(f"📦 Final collection count: {verify_db._collection.count()}")
    except Exception as e:
        print(f"⚠️ Count verification failed: {e}")


if __name__ == "__main__":
    ingest_mega_dataset()