import os
from typing import List
from dotenv import load_dotenv

from langchain_community.document_loaders import PyMuPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

load_dotenv()

# Direct config
MEDICAL_DOCS_PATH = os.getenv("MEDICAL_DOCS_PATH", "data/medical_docs")


def load_pdf_documents(folder_path: str) -> List:
    documents = []

    if not os.path.exists(folder_path):
        return documents

    for file in os.listdir(folder_path):
        if file.endswith(".pdf"):
            file_path = os.path.join(folder_path, file)

            try:
                loader = PyMuPDFLoader(file_path)
                docs = loader.load()
                documents.extend(docs)
            except Exception:
                continue

    return documents


def load_text_documents(folder_path: str) -> List:
    documents = []

    if not os.path.exists(folder_path):
        return documents

    for file in os.listdir(folder_path):
        if file.endswith(".txt"):
            file_path = os.path.join(folder_path, file)

            try:
                loader = TextLoader(file_path, encoding="utf-8")
                docs = loader.load()
                documents.extend(docs)
            except Exception:
                continue

    return documents


def split_documents(documents: List):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=100
    )

    chunks = splitter.split_documents(documents)

    return chunks


def load_and_prepare_documents():
    pdf_docs = load_pdf_documents(MEDICAL_DOCS_PATH)
    text_docs = load_text_documents(MEDICAL_DOCS_PATH)

    all_docs = pdf_docs + text_docs

    if not all_docs:
        return []

    chunks = split_documents(all_docs)

    return chunks