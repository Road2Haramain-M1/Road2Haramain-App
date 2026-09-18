from fastapi.testclient import TestClient


def test_health_endpoints(monkeypatch):
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://test:test@localhost/test")
    monkeypatch.setenv("IDENTITY_PROVIDER", "mock")
    monkeypatch.setenv("PAYMENT_PROVIDER", "mock")
    monkeypatch.setenv("BOOKING_PROVIDER", "mock")
    monkeypatch.setenv("ENABLED_SERVICES", "umrah")
    monkeypatch.delenv("TRUSTED_PAYMENT_REDIRECT_ORIGINS", raising=False)

    from app.main import create_app

    client = TestClient(create_app())
    assert client.get("/health/live").json() == {"status": "ok"}
    assert client.get("/health/ready").json() == {"status": "ok", "environment": "test"}


def test_synthetic_booking_payment_and_history(monkeypatch):
    for key, value in {
        "APP_ENV": "test", "DATABASE_URL": "memory://test", "IDENTITY_PROVIDER": "mock",
        "PAYMENT_PROVIDER": "mock", "BOOKING_PROVIDER": "mock", "ENABLED_SERVICES": "umrah",
    }.items():
        monkeypatch.setenv(key, value)
    from app.main import create_app
    client = TestClient(create_app())
    quote = client.post("/api/v1/quotes", json={"package_id": "pkg-nusuk", "travellers": 1}).json()
    traveller = {"name": "Demo Traveller", "nationality": "MY", "date_of_birth": "1990-01-01", "phone": "+60000000000"}
    booking = client.post("/api/v1/bookings", headers={"Idempotency-Key": "demo-order-1"}, json={"quote_id": quote["id"], "travellers": [traveller]}).json()
    paid = client.post(f"/api/v1/bookings/{booking['id']}/payment", json={"outcome": "success"}).json()
    assert paid["booking_status"] == "CONFIRMED"
    assert client.get("/api/v1/bookings").json()["items"][0]["payment_status"] == "SUCCEEDED"


def test_frontend_catalogue_compatibility(monkeypatch):
    for key, value in {
        "APP_ENV": "test", "DATABASE_URL": "memory://test", "IDENTITY_PROVIDER": "mock",
        "PAYMENT_PROVIDER": "mock", "BOOKING_PROVIDER": "mock", "ENABLED_SERVICES": "umrah",
    }.items():
        monkeypatch.setenv(key, value)
    from app.main import create_app
    client = TestClient(create_app())
    assert client.get("/api/v1/agencies?category=umrah").status_code == 200
    products = client.get("/api/v1/catalogue/products?category=umrah").json()
    assert products[0]["provider_id"] == "agency-barakah"
    departures = client.get("/api/v1/catalogue/products/pkg-nusuk/departures").json()
    quote = client.post("/api/v1/quotes", json={
        "product_id": "pkg-nusuk", "departure_id": departures[0]["id"], "traveller_count": 1,
    }).json()
    booking = client.post("/api/v1/bookings", json={
        "quote_id": quote["id"], "travellers": [{
            "full_name": "Demo User", "nationality": "MY", "date_of_birth": "1990-01-01", "contact": "012",
        }],
    })
    assert booking.status_code == 200
    payment = client.post("/api/v1/payments", json={"booking_id": booking.json()["id"], "scenario": "success"})
    assert payment.status_code == 200
    assert payment.json()["payment"]["state"] == "SUCCEEDED"
