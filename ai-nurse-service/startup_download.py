import os
import shutil
import zipfile
from huggingface_hub import hf_hub_download

ASSET_REPO_ID = os.getenv("ASSET_REPO_ID", "piyush9940/ai_nurse")
ASSET_REPO_TYPE = os.getenv("ASSET_REPO_TYPE", "model")


VECTOR_DB_PATH = os.getenv("VECTOR_DB_PATH", "/tmp/vector_db")
MEDICAL_DOCS_PATH = os.getenv("MEDICAL_DOCS_PATH", "/tmp/medical_docs")

VECTOR_DB_ZIP = os.getenv("VECTOR_DB_ZIP", "vector_db.zip")
MEDICAL_DOCS_ZIP = os.getenv("MEDICAL_DOCS_ZIP", "medical_docs.zip")


def unzip_file(zip_path: str, extract_to: str):
    os.makedirs(extract_to, exist_ok=True)

    with zipfile.ZipFile(zip_path, "r") as zip_ref:
        zip_ref.extractall(extract_to)


def download_file(filename: str):
    return hf_hub_download(
        repo_id=ASSET_REPO_ID,
        filename=filename,
        repo_type=ASSET_REPO_TYPE
    )


def main():
    print("Starting asset download check...")

    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    os.makedirs(VECTOR_DB_PATH, exist_ok=True)
    os.makedirs(MEDICAL_DOCS_PATH, exist_ok=True)

    # Download skin disease model
    if not os.path.exists(MODEL_PATH):
        try:
            print("Downloading model...")
            model_file = download_file(MODEL_FILENAME)
            shutil.copy(model_file, MODEL_PATH)
            print(f"Model saved at: {MODEL_PATH}")
        except Exception as e:
            print(f"Model download skipped/failed: {e}")

    # Download vector DB
    if not os.listdir(VECTOR_DB_PATH):
        try:
            print("Downloading vector DB...")
            vector_zip = download_file(VECTOR_DB_ZIP)
            unzip_file(vector_zip, VECTOR_DB_PATH)
            print(f"Vector DB extracted at: {VECTOR_DB_PATH}")
        except Exception as e:
            print(f"Vector DB download skipped/failed: {e}")

    # Download medical docs
    if not os.listdir(MEDICAL_DOCS_PATH):
        try:
            print("Downloading medical docs...")
            docs_zip = download_file(MEDICAL_DOCS_ZIP)
            unzip_file(docs_zip, MEDICAL_DOCS_PATH)
            print(f"Medical docs extracted at: {MEDICAL_DOCS_PATH}")
        except Exception as e:
            print(f"Medical docs download skipped/failed: {e}")

    print("Asset check completed.")


if __name__ == "__main__":
    main()