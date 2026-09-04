"""Langfuse tracing: active only when LANGFUSE_PUBLIC_KEY/SECRET_KEY are set."""
import os

from langchain_core.callbacks import BaseCallbackHandler


def langfuse_enabled() -> bool:
    return bool(os.environ.get("LANGFUSE_PUBLIC_KEY") and os.environ.get("LANGFUSE_SECRET_KEY"))


def callbacks() -> list[BaseCallbackHandler]:
    if not langfuse_enabled():
        return []
    from langfuse.langchain import CallbackHandler
    return [CallbackHandler()]


def flush() -> None:
    if langfuse_enabled():
        from langfuse import get_client
        get_client().flush()
