import time


class Trace:
    def __init__(self) -> None:
        self.started_at = time.perf_counter()
        self.events: list[tuple[str, float]] = []

    def mark(self, event: str) -> None:
        self.events.append((event, round((time.perf_counter() - self.started_at) * 1000, 2)))

    def timeline(self) -> list[dict]:
        return [{"event": event, "elapsed_ms": elapsed} for event, elapsed in self.events]


def get_trace() -> Trace:
    return Trace()


def reset_trace() -> None:
    return None
