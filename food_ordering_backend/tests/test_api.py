def create_category(client, name="Mains"):
    response = client.post("/api/categories/", json={"name": name})
    assert response.status_code == 201
    return response.json()


def create_food(client, category_id, name="Rice", price="5.25", available=True):
    response = client.post(
        "/api/foods/",
        json={"category_id": category_id, "name": name, "price": price, "is_available": available},
    )
    assert response.status_code == 201
    return response.json()


def create_customer(client):
    response = client.post(
        "/api/auth/register",
        json={"name": "Ada", "email": "ada@example.com", "phone": "1234567", "password": "Password123", "confirm_password": "Password123"},
    )
    assert response.status_code == 201
    return response.json()


def test_category_crud_and_safe_deletion(client):
    assert client.post("/api/categories/", json={"name": "  "}).status_code == 422
    category = create_category(client)
    assert client.get("/api/categories/").json()[0]["name"] == "Mains"
    assert client.get(f"/api/categories/{category['id']}").json()["name"] == "Mains"
    assert client.post("/api/categories/", json={"name": "Mains"}).status_code == 409
    assert client.patch(f"/api/categories/{category['id']}", json={"name": "Meals"}).json()["name"] == "Meals"
    assert client.get("/api/categories/9999").status_code == 404
    assert client.patch("/api/categories/9999", json={"name": "Other"}).status_code == 404
    create_food(client, category["id"])
    assert client.delete(f"/api/categories/{category['id']}").status_code == 409


def test_food_filters_and_validation(client):
    mains = create_category(client)
    drinks = create_category(client, "Drinks")
    rice = create_food(client, mains["id"], "Rice Bowl")
    hidden = create_food(client, mains["id"], "Burger", available=False)
    create_food(client, drinks["id"], "Tea", "2.00")
    assert client.get(f"/api/foods/{rice['id']}").json()["name"] == "Rice Bowl"
    assert len(client.get("/api/foods/").json()) == 2
    assert [food["id"] for food in client.get("/api/foods/?search=rice").json()] == [rice["id"]]
    assert [food["id"] for food in client.get(f"/api/foods/?category_id={mains['id']}").json()] == [rice["id"]]
    assert [food["id"] for food in client.get("/api/foods/?is_available=false").json()] == [hidden["id"]]
    assert len(client.get("/api/foods/?include_unavailable=true").json()) == 3
    assert len(client.get(f"/api/categories/{mains['id']}/foods").json()) == 1
    assert client.post("/api/foods/", json={"category_id": mains["id"], "name": "Bad", "price": "0"}).status_code == 422
    assert client.post("/api/foods/", json={"category_id": 9999, "name": "Bad", "price": "1"}).status_code == 404
    assert client.post("/api/foods/", json={"category_id": mains["id"], "name": "Bad", "price": "1", "is_available": "yes"}).status_code == 422
    assert client.patch(f"/api/foods/{rice['id']}", json={"price": "6.00"}).json()["price"] == "6.00"


def test_customer_validation_and_duplicate_email(client):
    assert client.post("/api/auth/register", json={"name": "Ada", "email": "invalid"}).status_code == 422
    registration = create_customer(client)
    customer = registration["user"]
    assert client.get(f"/api/customers/{customer['id']}").json()["phone"] == "1234567"
    assert client.post(
        "/api/auth/register",
        json={"name": "Other", "email": "ada@example.com", "phone": "123", "password": "Password123", "confirm_password": "Password123"},
    ).status_code == 409
    assert client.get("/api/customers/?limit=1").status_code == 200


def test_order_totals_history_status_and_transaction(client):
    category = create_category(client)
    rice = create_food(client, category["id"])
    tea = create_food(client, category["id"], "Tea", "2.10")
    hidden = create_food(client, category["id"], "Hidden", "3.00", False)
    registration = create_customer(client)
    customer = registration["user"]
    client.headers["Authorization"] = f"Bearer {registration['access_token']}"
    base = {"customer_id": customer["id"]}
    assert client.post("/api/orders/", json={**base, "items": []}).status_code == 422
    assert client.post("/api/orders/", json={**base, "items": [{"food_id": rice["id"], "quantity": 0}]}).status_code == 422
    assert client.post("/api/orders/", json={**base, "items": [{"food_id": rice["id"], "quantity": 1}, {"food_id": 9999, "quantity": 1}]}).status_code == 404
    assert client.post("/api/orders/", json={**base, "items": [{"food_id": hidden["id"], "quantity": 1}]}).status_code == 409
    assert client.get(f"/api/customers/{customer['id']}/orders").json() == []

    preview = client.post("/api/cart/preview", json={"items": [{"food_id": rice["id"], "quantity": 2}]})
    assert preview.status_code == 200
    assert preview.json()["items"][0]["subtotal"] == "10.50"
    assert preview.json()["subtotal_amount"] == "10.50"
    assert preview.json()["delivery_fee"] == "49.00"
    assert preview.json()["total_amount"] == "59.50"
    assert client.post("/api/cart/preview", json={"items": [{"food_id": hidden["id"], "quantity": 1}]}).status_code == 409

    single = client.post("/api/orders/", json={**base, "delivery_address":"42 Main Street", "items": [{"food_id": tea["id"], "quantity": 1}]})
    assert single.status_code == 201
    assert single.json()["total_amount"] == "51.10"

    order = client.post(
        "/api/orders/",
        json={**base, "delivery_address":"42 Main Street", "items": [{"food_id": rice["id"], "quantity": 2}, {"food_id": tea["id"], "quantity": 3}], "total_amount": "0.01"},
    )
    assert order.status_code == 201
    result = order.json()
    assert result["status"] == "pending"
    assert result["subtotal_amount"] == "16.80"
    assert result["total_amount"] == "65.80"
    assert result["payment"]["status"] == "pending"
    assert [item["unit_price"] for item in result["items"]] == ["5.25", "2.10"]
    assert [item["subtotal"] for item in result["items"]] == ["10.50", "6.30"]
    admin_token = client.post("/api/auth/login", json={"email":"admin@example.com","password":"AdminPass123"}).json()["access_token"]
    client.headers["Authorization"] = f"Bearer {admin_token}"
    assert client.patch(f"/api/foods/{rice['id']}", json={"price": "9.00"}).status_code == 200
    assert client.get(f"/api/orders/{result['id']}").json()["total_amount"] == "65.80"
    assert len(client.get(f"/api/customers/{customer['id']}/orders").json()) == 2
    assert len(client.get("/api/orders/?status=pending").json()) == 2
    assert client.patch(f"/api/orders/{result['id']}/status", json={"status": "confirmed"}).json()["status"] == "confirmed"
    assert client.patch(f"/api/orders/{result['id']}/status", json={"status": "preparing"}).json()["status"] == "preparing"
    assert client.patch(f"/api/orders/{result['id']}/status", json={"status": "out_for_delivery"}).json()["status"] == "out_for_delivery"
    assert client.patch(f"/api/orders/{result['id']}/status", json={"status": "nonsense"}).status_code == 422
    assert client.delete(f"/api/foods/{rice['id']}").status_code == 409
    assert client.delete(f"/api/customers/{customer['id']}").status_code == 409
