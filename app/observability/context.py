import contextvars
from uuid import uuid4

_request_id = contextvars.ContextVar("request_id", default=None)


def generate_request_id() -> str:
    return f"req_{uuid4().hex}"


def set_request_id(request_id: str) -> None:
    _request_id.set(request_id)


def get_request_id() -> str | None:
    return _request_id.get()


def clear_context() -> None:
    _request_id.set(None)
