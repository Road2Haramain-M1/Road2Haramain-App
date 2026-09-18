"""Validated server configuration for the R2H backend."""

from __future__ import annotations

import os
from dataclasses import dataclass
from enum import Enum


class AppEnvironment(str, Enum):
    DEMO = "demo"
    TEST = "test"
    UAT = "uat"
    PRODUCTION = "production"


class Provider(str, Enum):
    MOCK = "mock"
    MIPAY = "mipay"


class ConfigurationError(ValueError):
    """Raised when startup configuration is missing or unsafe."""


def _required(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise ConfigurationError(f"Missing required environment variable: {name}")
    return value


@dataclass(frozen=True, slots=True)
class Settings:
    """Application settings with explicit provider selection and fail-closed rules."""

    app_env: AppEnvironment
    database_url: str
    identity_provider: Provider
    payment_provider: Provider
    booking_provider: Provider
    enabled_services: tuple[str, ...]
    imports_enabled: bool
    trusted_payment_redirect_origins: tuple[str, ...]

    @classmethod
    def from_environment(cls) -> "Settings":
        """Load and validate settings; never infer mock mode from request failure."""
        raw_env = os.getenv("APP_ENV", "demo").strip().lower()
        try:
            app_env = AppEnvironment(raw_env)
            identity = Provider(_required("IDENTITY_PROVIDER").lower())
            payment = Provider(_required("PAYMENT_PROVIDER").lower())
            booking = Provider(_required("BOOKING_PROVIDER").lower())
        except ValueError as exc:
            raise ConfigurationError(str(exc)) from exc

        database_url = _required("DATABASE_URL")
        services = tuple(s.strip() for s in os.getenv("ENABLED_SERVICES", "umrah").split(",") if s.strip())
        origins = tuple(s.strip() for s in os.getenv("TRUSTED_PAYMENT_REDIRECT_ORIGINS", "").split(",") if s.strip())
        imports_enabled = os.getenv("IMPORTS_ENABLED", "false").lower() == "true"

        if app_env in {AppEnvironment.UAT, AppEnvironment.PRODUCTION}:
            if any(provider is Provider.MOCK for provider in (identity, payment, booking)):
                raise ConfigurationError("Mock providers are not allowed in UAT or production")
            if not origins:
                raise ConfigurationError("TRUSTED_PAYMENT_REDIRECT_ORIGINS is required in UAT or production")

        return cls(app_env, database_url, identity, payment, booking, services, imports_enabled, origins)


def load_settings() -> Settings:
    """Return validated settings for application startup."""
    return Settings.from_environment()
