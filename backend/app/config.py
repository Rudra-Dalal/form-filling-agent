import os
from pathlib import Path

# Base Paths
BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
FIXTURES_DIR = PROJECT_ROOT / "tests" / "fixtures"

# Server Settings
HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8000"))

# Playwright Browser Settings
# Absolute requirement: HEADLESS = False so the user can observe the browser
HEADLESS = os.getenv("HEADLESS", "false").lower() in ("true", "1", "yes")

# LLM Configuration
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
DEFAULT_MODEL = "claude-3-5-sonnet-20241022"
MAX_TOKENS = 4096

def has_llm_key() -> bool:
    """Check whether a valid Anthropic API key is configured."""
    key = os.getenv("ANTHROPIC_API_KEY") or ANTHROPIC_API_KEY
    return bool(key and key.strip() and not key.startswith("your_"))
