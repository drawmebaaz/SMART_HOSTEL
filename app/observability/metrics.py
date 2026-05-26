from collections import defaultdict
from datetime import datetime, timezone
import threading


class Counter:
    def __init__(self) -> None:
        self._value = 0
        self._lock = threading.Lock()

    def inc(self, amount: int = 1) -> None:
        with self._lock:
            self._value += amount

    @property
    def value(self) -> int:
        with self._lock:
            return self._value


class Histogram:
    def __init__(self) -> None:
        self._values: list[float] = []
        self._lock = threading.Lock()

    def observe(self, value: float) -> None:
        with self._lock:
            self._values.append(value)

    def snapshot(self) -> dict:
        with self._lock:
            if not self._values:
                return {"count": 0, "avg": 0, "max": 0}
            return {
                "count": len(self._values),
                "avg": round(sum(self._values) / len(self._values), 2),
                "max": round(max(self._values), 2),
            }


class MetricsRegistry:
    def __init__(self) -> None:
        self.created_at = datetime.now(timezone.utc)
        self._counters: dict[str, Counter] = defaultdict(Counter)
        self._histograms: dict[str, Histogram] = defaultdict(Histogram)

    def counter(self, name: str) -> Counter:
        return self._counters[name]

    def histogram(self, name: str) -> Histogram:
        return self._histograms[name]

    def snapshot(self) -> dict:
        return {
            "counters": {name: counter.value for name, counter in self._counters.items()},
            "histograms": {name: histogram.snapshot() for name, histogram in self._histograms.items()},
            "created_at": self.created_at.isoformat(),
        }


_metrics: MetricsRegistry | None = None


def get_metrics() -> MetricsRegistry:
    global _metrics
    if _metrics is None:
        _metrics = MetricsRegistry()
    return _metrics
