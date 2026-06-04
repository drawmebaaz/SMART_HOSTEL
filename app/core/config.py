from functools import lru_cache
import json
from typing import Any
from typing import Literal

from pydantic import AnyHttpUrl, Field, field_validator
from pydantic.fields import FieldInfo
from pydantic_settings import BaseSettings, EnvSettingsSource, PydanticBaseSettingsSource, SettingsConfigDict


class CorsFriendlyEnvSettingsSource(EnvSettingsSource):
    def prepare_field_value(self, field_name: str, field: FieldInfo, value: Any, value_is_complex: bool) -> Any:
        if field_name == "cors_origins":
            return value
        return super().prepare_field_value(field_name, field, value, value_is_complex)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Smart Hostel Grievance"
    environment: Literal["local", "test", "staging", "production"] = "local"
    api_prefix: str = "/api/v1"
    debug: bool = False

    database_url: str = "sqlite:///./data/dev.db"
    auto_create_tables: bool = False

    secret_key: str = Field(
        default="local-dev-secret-key-change-before-production-2026",
        description="JWT signing key. Must be overridden in production.",
    )
    access_token_minutes: int = 60 * 8
    auth_cookie_name: str = "smart_hostel_access_token"
    secure_cookies: bool = False

    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    embedding_model_name: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    embedding_dimension: int = 384
    enable_transformer_embeddings: bool = False
    issue_match_threshold: float = 0.74
    duplicate_threshold: float = 0.88

    oauth_enabled: bool = False
    oauth_provider_name: str | None = None
    oauth_client_id: str | None = None
    oauth_client_secret: str | None = None
    oauth_authorize_url: AnyHttpUrl | None = None
    oauth_token_url: AnyHttpUrl | None = None
    oauth_userinfo_url: AnyHttpUrl | None = None
    oauth_redirect_uri: AnyHttpUrl | None = None

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
            except json.JSONDecodeError:
                return [item.strip() for item in value.split(",") if item.strip()]
            if isinstance(parsed, list):
                return [str(item).strip() for item in parsed if str(item).strip()]
            parsed_value = str(parsed).strip()
            return [parsed_value] if parsed_value else []
        return value

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> tuple[PydanticBaseSettingsSource, ...]:
        return (
            init_settings,
            CorsFriendlyEnvSettingsSource(settings_cls),
            dotenv_settings,
            file_secret_settings,
        )

    @field_validator("secret_key")
    @classmethod
    def validate_secret_key(cls, value: str) -> str:
        if len(value) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters")
        return value

    @field_validator(
        "oauth_provider_name",
        "oauth_client_id",
        "oauth_client_secret",
        "oauth_authorize_url",
        "oauth_token_url",
        "oauth_userinfo_url",
        "oauth_redirect_uri",
        mode="before",
    )
    @classmethod
    def empty_oauth_values_to_none(cls, value: str | None) -> str | None:
        if value == "":
            return None
        return value

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def is_postgres(self) -> bool:
        return self.database_url.startswith(("postgresql://", "postgresql+psycopg://"))


@lru_cache
def get_settings() -> Settings:
    return Settings()
