"""Synthetic Umrah application service used for the first persistent API slice.

The repository is intentionally in-memory until the PostgreSQL migration phase;
the service contracts and state transitions are kept independent of storage.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from uuid import uuid4

from fastapi import HTTPException

MYR = "MYR"


def now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class Quote:
    id: str
    package_id: str
    travellers: int
    unit_price_sen: int
    total_sen: int
    expires_at: datetime
    departure_id: str | None = None
    consumed: bool = False


@dataclass
class Booking:
    id: str
    quote_id: str
    package_id: str
    travellers: list[dict]
    total_sen: int
    booking_status: str = "AWAITING_PAYMENT"
    payment_status: str = "CREATED"
    fulfilment_status: str = "NOT_SUBMITTED"
    refund_status: str | None = None
    created_at: datetime = field(default_factory=now)


class DemoService:
    """Application service for deterministic fictional Umrah transactions."""

    def __init__(self) -> None:
        self.capacity = {"pkg-nusuk": 12, "pkg-heritage": 8}
        self.packages = [
            {"id": "pkg-nusuk", "agency_id": "agency-barakah", "name": "Nusuk Comfort 12D", "price_sen": 480000, "currency": MYR, "departure_date": "2027-02-14", "available": True, "booking_capability": "DEMO_BOOKING"},
            {"id": "pkg-heritage", "agency_id": "agency-safwah", "name": "Heritage Umrah 10D", "price_sen": 365000, "currency": MYR, "departure_date": "2027-03-01", "available": True, "booking_capability": "DEMO_BOOKING"},
        ]
        self.agencies = [
            {"id": "agency-barakah", "name": "Barakah Pilgrimage Services", "source": "synthetic-demo", "review_status": "APPROVED"},
            {"id": "agency-safwah", "name": "Safwah Travel House", "source": "synthetic-demo", "review_status": "APPROVED"},
        ]
        self.quotes: dict[str, Quote] = {}
        self.bookings: dict[str, Booking] = {}
        self.idempotency: dict[str, str] = {}
        self.import_runs: list[dict] = []

    def list_catalogue(self) -> dict:
        return {"agencies": self.agencies, "packages": [self.package(p["id"]) for p in self.packages]}

    def list_agencies(self, category: str | None = None) -> list[dict]:
        if category and category.lower() != "umrah":
            return []
        return [
            {
                "id": agency["id"],
                "name": agency["name"],
                "address": "Demo address, Kuala Lumpur",
                "phone": "03-0000 0000",
                "license_no": "DEMO-" + agency["id"].removeprefix("agency-"),
                "services": "Umrah",
                "office_type": "headquarters",
                "expiry_date": "2027-12-31",
            }
            for agency in self.agencies
        ]

    def list_products(self, category: str | None = None) -> list[dict]:
        if category and category.lower() != "umrah":
            return []
        return [
            {
                "id": package["id"],
                "provider_id": package["agency_id"],
                "category": "umrah",
                "name_en": package["name"],
                "name_ms": package["name"],
                "description_en": "Synthetic demonstration Umrah package.",
                "description_ms": "Pakej Umrah demonstrasi sintetik.",
                "unit_price": f"{package['price_sen'] / 100:.2f}",
                "currency": MYR,
            }
            for package in self.packages
        ]

    def list_departures(self, product_id: str) -> list[dict]:
        package = self.package(product_id)
        start = package["departure_date"]
        duration = 12 if product_id == "pkg-nusuk" else 10
        end = (date.fromisoformat(start) + timedelta(days=duration - 1)).isoformat()
        return [{"id": f"departure-{product_id}", "product_id": product_id, "start_date": start, "end_date": end, "capacity_available": package["available_capacity"]}]

    def package(self, package_id: str) -> dict:
        package = next((p for p in self.packages if p["id"] == package_id), None)
        if not package:
            raise HTTPException(404, "Package not found")
        return {**package, "available_capacity": self.capacity[package_id]}

    def create_quote(self, package_id: str, travellers: int, departure_id: str | None = None) -> dict:
        package = self.package(package_id)
        if travellers < 1 or travellers > package["available_capacity"]:
            raise HTTPException(409, "Insufficient capacity")
        quote = Quote(str(uuid4()), package_id, travellers, package["price_sen"], package["price_sen"] * travellers, now() + timedelta(minutes=15), departure_id or f"departure-{package_id}")
        self.quotes[quote.id] = quote
        return self.quote_dict(quote)

    def quote_dict(self, q: Quote) -> dict:
        return {
            "id": q.id,
            "package_id": q.package_id,
            "product_id": q.package_id,
            "departure_id": q.departure_id or f"departure-{q.package_id}",
            "currency": MYR,
            "travellers": q.travellers,
            "traveller_count": q.travellers,
            "unit_price_sen": q.unit_price_sen,
            "unit_price": f"{q.unit_price_sen / 100:.2f}",
            "total_sen": q.total_sen,
            "total_amount": f"{q.total_sen / 100:.2f}",
            "expires_at": q.expires_at,
            "consumed": q.consumed,
        }

    def create_booking(self, quote_id: str, travellers: list[dict], key: str | None) -> dict:
        if key and key in self.idempotency:
            return self.booking_dict(self.bookings[self.idempotency[key]])
        quote = self.quotes.get(quote_id)
        if not quote or quote.consumed or quote.expires_at <= now():
            raise HTTPException(409, "Quote is missing, expired, or already used")
        if len(travellers) != quote.travellers:
            raise HTTPException(422, "Traveller count does not match quote")
        required = {"name", "nationality", "date_of_birth", "phone"}
        if any(not required.issubset(t) for t in travellers):
            raise HTTPException(422, "Each traveller requires name, nationality, date_of_birth, and phone")
        if self.capacity[quote.package_id] < quote.travellers:
            raise HTTPException(409, "Insufficient capacity")
        self.capacity[quote.package_id] -= quote.travellers
        quote.consumed = True
        booking = Booking(str(uuid4()), quote.id, quote.package_id, travellers, quote.total_sen)
        self.bookings[booking.id] = booking
        if key:
            self.idempotency[key] = booking.id
        return self.booking_dict(booking)

    def booking_dict(self, b: Booking) -> dict:
        return {
            "id": b.id,
            "reference": f"R2H-{b.id[:8]}",
            "quote_id": b.quote_id,
            "package_id": b.package_id,
            "product_id": b.package_id,
            "departure_id": f"departure-{b.package_id}",
            "travellers": b.travellers,
            "currency": MYR,
            "total_sen": b.total_sen,
            "total_amount": f"{b.total_sen / 100:.2f}",
            "booking_status": b.booking_status,
            "state": b.booking_status,
            "payment_status": b.payment_status,
            "fulfilment_status": b.fulfilment_status,
            "refund_status": b.refund_status,
            "hold_expires_at": None,
            "payment": None,
            "scenario": "synthetic-demo",
            "demo": True,
            "created_at": b.created_at,
        }

    def pay(self, booking_id: str, outcome: str, key: str | None = None) -> dict:
        booking = self.bookings.get(booking_id)
        if not booking:
            raise HTTPException(404, "Booking not found")
        if outcome == "timeout":
            booking.payment_status, booking.booking_status = "PENDING", "PROCESSING"
        elif outcome == "failure":
            booking.payment_status, booking.booking_status = "FAILED", "ACTION_REQUIRED"
        else:
            booking.payment_status, booking.booking_status, booking.fulfilment_status = "SUCCEEDED", "PROCESSING", "PENDING"
            if outcome == "rejection":
                booking.fulfilment_status, booking.booking_status = "REJECTED", "ACTION_REQUIRED"
            elif outcome == "delay":
                booking.fulfilment_status = "PENDING"
            else:
                booking.fulfilment_status, booking.booking_status = "CONFIRMED", "CONFIRMED"
        result = self.booking_dict(booking)
        result["payment"] = {
            "id": f"payment-{booking.id}",
            "reference": f"DEMO-{booking.id[:8]}",
            "state": booking.payment_status,
            "amount": f"{booking.total_sen / 100:.2f}",
            "currency": MYR,
        }
        return result

    def cancel(self, booking_id: str) -> dict:
        booking = self.bookings.get(booking_id)
        if not booking:
            raise HTTPException(404, "Booking not found")
        if booking.booking_status not in {"CONFIRMED", "ACTION_REQUIRED"}:
            raise HTTPException(409, "Booking is not eligible for cancellation")
        booking.booking_status, booking.refund_status = "CANCELLED", "SUCCEEDED"
        return self.booking_dict(booking)

    def import_agencies(self, source: str, records: list[dict]) -> dict:
        run = {"id": str(uuid4()), "source": source, "received": len(records), "status": "PENDING_REVIEW", "created_at": now()}
        self.import_runs.append(run)
        return run
