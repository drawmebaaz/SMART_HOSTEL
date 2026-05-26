from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import router as api_v1_router
from app.core.config import get_settings
from app.db.session import close_db, init_db
from app.middleware.request_context import RequestContextMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    if not settings.is_production and (settings.auto_create_tables or not settings.is_postgres):
        init_db()
    yield
    close_db()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version="1.0.0",
        docs_url=f"{settings.api_prefix}/docs",
        redoc_url=f"{settings.api_prefix}/redoc",
        openapi_url=f"{settings.api_prefix}/openapi.json",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )
    app.add_middleware(RequestContextMiddleware)
    app.include_router(api_v1_router, prefix=settings.api_prefix)

    frontend_dist = Path(__file__).resolve().parent.parent / "static"
    frontend_index = frontend_dist / "index.html"
    if frontend_index.exists():
        assets_dir = frontend_dist / "assets"
        if assets_dir.exists():
            app.mount("/assets", StaticFiles(directory=assets_dir), name="frontend-assets")

        @app.get("/{full_path:path}", include_in_schema=False)
        def serve_frontend(full_path: str) -> FileResponse:
            requested_file = frontend_dist / full_path
            if full_path and requested_file.is_file():
                return FileResponse(requested_file)
            return FileResponse(frontend_index)

    else:

        @app.get("/")
        def root() -> dict:
            return {
                "service": settings.app_name,
                "api": settings.api_prefix,
                "docs": f"{settings.api_prefix}/docs",
            }

    return app


app = create_app()
