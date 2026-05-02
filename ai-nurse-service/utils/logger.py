import sys
from loguru import logger

# =========================
# 🧹 Remove default logger
# =========================
logger.remove()

# =========================
# 🖥️ Console Logging
# =========================
logger.add(
    sys.stdout,
    colorize=True,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
           "<level>{level}</level> | "
           "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - "
           "<level>{message}</level>",
    level="DEBUG"
)

# =========================
# 📁 File Logging
# =========================
logger.add(
    "logs/app.log",
    rotation="1 MB",         # Rotate file after 1MB
    retention="7 days",      # Keep logs for 7 days
    compression="zip",       # Compress old logs
    level="INFO",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {message}"
)

# =========================
# 🚨 Error Logging (Separate file)
# =========================
logger.add(
    "logs/error.log",
    rotation="500 KB",
    retention="10 days",
    compression="zip",
    level="ERROR",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {message}"
)

# =========================
# 📌 Helper Functions
# =========================

def log_info(message: str):
    logger.info(message)

def log_debug(message: str):
    logger.debug(message)

def log_warning(message: str):
    logger.warning(message)

def log_error(message: str):
    logger.error(message)

def log_exception(message: str):
    logger.exception(message)