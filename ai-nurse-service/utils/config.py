import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class Settings:
    """
    Central configuration for AI Nurse Service
    """

    # =========================
    # 🚀 APP SETTINGS
    # =========================
    APP_NAME: str = "AI Nurse Service"
    VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"

    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", 8000))

    # =========================
    # 🔐 API KEYS
    # =========================
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    # =========================
    # 🧠 LLM CONFIG
    # =========================
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "groq")  # groq | openai | gemini

    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama3-70b-8192")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-pro")

    TEMPERATURE: float = float(os.getenv("TEMPERATURE", 0.4))
    MAX_TOKENS: int = int(os.getenv("MAX_TOKENS", 500))

    # =========================
    # 🧠 MEMORY SETTINGS
    # =========================
    MAX_HISTORY_MESSAGES: int = int(os.getenv("MAX_HISTORY_MESSAGES", 8))

    # =========================
    # 🧬 PATIENT CONTEXT (DEFAULT FALLBACK)
    # =========================
    DEFAULT_PATIENT_CONTEXT = {
        "gender": "Male",
        "history": "Diabetes, Hypertension",
        "allergies": "Penicillin",
        "medications": "Metformin"
    }

    # =========================
    # 📚 RAG SETTINGS
    # =========================
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    DATA_DIR: str = os.path.join(BASE_DIR, "data")
    MEDICAL_DOCS_PATH: str = os.path.join(DATA_DIR, "medical_docs")
    VECTOR_DB_PATH: str = os.path.join(DATA_DIR, "vector_db")

    ENABLE_RAG: bool = os.getenv("ENABLE_RAG", "false").lower() == "true"
    TOP_K_RESULTS: int = int(os.getenv("TOP_K_RESULTS", 3))

    # =========================
    # 🌐 OPTIONAL FEATURES
    # =========================
    ENABLE_TRANSLATION: bool = os.getenv("ENABLE_TRANSLATION", "false").lower() == "true"
    ENABLE_VOICE: bool = os.getenv("ENABLE_VOICE", "false").lower() == "true"

    # =========================
    # 🔗 NODE BACKEND CONNECTION
    NODE_BACKEND_URL: str = os.getenv("NODE_BACKEND_URL", "https://hospital-copilot1.onrender.com")

    # =========================
    # 🛡️ SAFETY SETTINGS
    # =========================
    ENABLE_MEDICAL_SAFETY: bool = True
    FORCE_DISCLAIMER: bool = True


# Create global settings object
settings = Settings()