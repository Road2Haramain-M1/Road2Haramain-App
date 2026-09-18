"""FastAPI entry point for the R2H backend."""

from __future__ import annotations

from fastapi import FastAPI, Header, Query
from pydantic import BaseModel, Field

from app.platform.config import load_settings
from app.modules.demo import DemoService


class QuoteRequest(BaseModel):
    package_id: str | None = None
    product_id: str | None = None
    departure_id: str | None = None
    travellers: int | None = Field(default=None, ge=1, le=20)
    traveller_count: int | None = Field(default=None, ge=1, le=20)

    def resolved_package_id(self) -> str:
        return self.package_id or self.product_id or ""

    def resolved_travellers(self) -> int:
        return self.travellers or self.traveller_count or 0


class BookingRequest(BaseModel):
    quote_id: str
    travellers: list[dict] = Field(min_length=1, max_length=20)
    scenario: str | None = None


class PaymentRequest(BaseModel):
    outcome: str = Field(default="success", pattern="^(success|failure|timeout|rejection|delay)$")
    booking_id: str | None = None
    scenario: str | None = None


class ImportRequest(BaseModel):
    source: str
    records: list[dict] = Field(default_factory=list)


def create_app() -> FastAPI:
    """Create the API application without performing network or database I/O."""
    settings = load_settings()
    application = FastAPI(title="Road2Haramain API", version="0.1.0")
    service = DemoService()

    @application.get("/health/live", tags=["health"])
    def liveness() -> dict[str, str]:
        """Return process health without exposing configuration or secrets."""
        return {"status": "ok"}

    @application.get("/health/ready", tags=["health"])
    def readiness() -> dict[str, str]:
        """Report readiness after startup configuration has been validated."""
        return {"status": "ok", "environment": settings.app_env.value}

    @application.get("/api/v1/catalogue")
    def catalogue() -> dict:
        return service.list_catalogue()

    @application.get("/api/v1/agencies")
    def agencies(category: str | None = Query(default=None)) -> list[dict]:
        """Return the normalized agency collection expected by the frontend."""
        return service.list_agencies(category)

    @application.get("/api/v1/catalogue/products")
    def products(category: str | None = Query(default=None)) -> list[dict]:
        """Return products using the frontend's stable catalogue shape."""
        return service.list_products(category)

    @application.get("/api/v1/catalogue/products/{product_id}/departures")
    def departures(product_id: str) -> list[dict]:
        return service.list_departures(product_id)

    @application.get("/api/v1/packages/{package_id}")
    def package(package_id: str) -> dict:
        return service.package(package_id)

    @application.post("/api/v1/quotes")
    def quote(request: QuoteRequest) -> dict:
        return service.create_quote(request.resolved_package_id(), request.resolved_travellers(), request.departure_id)

    @application.post("/api/v1/bookings")
    def booking(request: BookingRequest, idempotency_key: str | None = Header(default=None, alias="Idempotency-Key")) -> dict:
        travellers = [
            {
                **traveller,
                "name": traveller.get("name") or traveller.get("full_name"),
                "phone": traveller.get("phone") or traveller.get("contact"),
            }
            for traveller in request.travellers
        ]
        return service.create_booking(request.quote_id, travellers, idempotency_key)

    @application.get("/api/v1/bookings")
    def bookings() -> dict:
        return {"items": [service.booking_dict(item) for item in service.bookings.values()]}

    @application.get("/api/v1/bookings/{booking_id}")
    def booking_detail(booking_id: str) -> dict:
        item = service.bookings.get(booking_id)
        if not item:
            from fastapi import HTTPException
            raise HTTPException(404, "Booking not found")
        return service.booking_dict(item)

    @application.post("/api/v1/bookings/{booking_id}/payment")
    def payment(booking_id: str, request: PaymentRequest) -> dict:
        return service.pay(booking_id, request.outcome)

    @application.post("/api/v1/payments")
    def payments(request: PaymentRequest, idempotency_key: str | None = Header(default=None, alias="Idempotency-Key")) -> dict:
        """Compatibility endpoint for the frontend payment service."""
        if not request.booking_id:
            from fastapi import HTTPException
            raise HTTPException(422, "booking_id is required")
        return service.pay(request.booking_id, request.scenario or request.outcome, idempotency_key)

    @application.post("/api/v1/bookings/{booking_id}/cancellation")
    def cancellation(booking_id: str) -> dict:
        return service.cancel(booking_id)

    @application.get("/api/v1/operations/exceptions")
    def exceptions() -> dict:
        items = [service.booking_dict(item) for item in service.bookings.values() if item.booking_status == "ACTION_REQUIRED"]
        return {"items": items}

    @application.post("/api/v1/operations/imports")
    def import_records(request: ImportRequest) -> dict:
        if not settings.imports_enabled:
            from fastapi import HTTPException
            raise HTTPException(403, "Catalogue imports are disabled")
        return service.import_agencies(request.source, request.records)

    return application


app = create_app()
