"""LLM factory: Claude via langchain-anthropic when a key is present, scripted fake otherwise."""
import os

from langchain_core.language_models.chat_models import BaseChatModel

from .fake_llm import FakeChatModel

DEFAULT_MODEL = "claude-sonnet-5"


def build_llm() -> BaseChatModel:
    provider = os.environ.get("LLM_PROVIDER") or ("anthropic" if os.environ.get("ANTHROPIC_API_KEY") else "fake")
    if provider == "fake":
        return FakeChatModel()
    if provider == "anthropic":
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(model=os.environ.get("ANTHROPIC_MODEL", DEFAULT_MODEL), max_tokens=2048)
    raise ValueError(f"unknown LLM_PROVIDER {provider!r}")
