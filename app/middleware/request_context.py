import time

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from app.observability.context import clear_context, generate_request_id, set_request_id
from app.observability.logger import get_logger
from app.observability.metrics import get_metrics


logger = get_logger(__name__)
metrics = get_metrics()


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or generate_request_id()
        set_request_id(request_id)
        started_at = time.perf_counter()
        metrics.counter("http_requests_total").inc()

        try:
            response = await call_next(request)
            latency_ms = (time.perf_counter() - started_at) * 1000
            metrics.histogram("http_request_latency_ms").observe(latency_ms)
            response.headers["X-Request-ID"] = request_id
            logger.info(
                "http_request_completed",
                method=request.method,
                path=request.url.path,
                status_code=response.status_code,
                latency_ms=round(latency_ms, 2),
            )
            return response
        except Exception as exc:
            metrics.counter("http_errors_total").inc()
            logger.error(
                "http_request_failed",
                method=request.method,
                path=request.url.path,
                error=str(exc),
            )
            raise
        finally:
            clear_context()
