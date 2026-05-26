import json
import logging
from datetime import datetime, timezone
from typing import Any

from app.observability.context import get_request_id


class StructuredLogger:
    def __init__(self, name: str):
        self.name = name
        self.logger = logging.getLogger(name)

    def _log(self, level: str, event: str, **fields: Any) -> None:
        payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": level,
            "event": event,
            "source": self.name,
            **fields,
        }
        request_id = get_request_id()
        if request_id:
            payload["request_id"] = request_id
        self.logger.log(getattr(logging, level), json.dumps(payload, default=str))

    def info(self, event: str, **fields: Any) -> None:
        self._log("INFO", event, **fields)

    def warning(self, event: str, **fields: Any) -> None:
        self._log("WARNING", event, **fields)

    def error(self, event: str, **fields: Any) -> None:
        self._log("ERROR", event, **fields)


def get_logger(name: str) -> StructuredLogger:
    logging.basicConfig(level=logging.INFO)
    return StructuredLogger(name)


def get_structured_logger(name: str) -> StructuredLogger:
    return get_logger(name)
