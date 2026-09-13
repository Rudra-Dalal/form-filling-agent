import os
from pathlib import Path

# Base Paths
BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
FIXTURES_DIR = PROJECT_ROOT / "tests" / "fixtures"

# Server Settings
HOST = os.getenv("BACKEND_HOST") or os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("BACKEND_PORT") or os.getenv("PORT", "8000"))
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

# Playwright Browser Settings
HEADLESS = os.getenv("HEADLESS", "false").lower() in ("true", "1", "yes")

# Agent Execution Settings
AGENT_MAX_ITERATIONS = int(os.getenv("AGENT_MAX_ITERATIONS", "35"))
AGENT_ACTION_TIMEOUT = int(os.getenv("AGENT_ACTION_TIMEOUT", "30000"))
AGENT_MAX_RETRIES = int(os.getenv("AGENT_MAX_RETRIES", "3"))

# LLM Configuration
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
DEFAULT_MODEL = "claude-3-5-sonnet-20241022"
MAX_TOKENS = 4096

def has_llm_key() -> bool:
    """Check whether a valid Anthropic API key is configured."""
    key = os.getenv("ANTHROPIC_API_KEY") or ANTHROPIC_API_KEY
    return bool(key and key.strip() and not key.startswith("your_"))
