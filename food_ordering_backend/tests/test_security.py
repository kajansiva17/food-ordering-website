def authenticate(client, email, password):
    response = client.post('/api/auth/login', json={'email': email, 'password': password})
    assert response.status_code == 200
    client.headers['Authorization'] = f"Bearer {response.json()['access_token']}"
    return response.json()['user']


def register(client, name, email):
    response = client.post('/api/auth/register', json={
        'name': name, 'email': email, 'phone': '1234567',
        'password': 'Password123', 'confirm_password': 'Password123',
    })
    assert response.status_code == 201
    return response.json()


def test_shared_login_and_server_side_role_check(client):
    import jwt
    from datetime import datetime, timedelta, timezone

    from app.config import get_settings

    client.headers.pop('Authorization', None)
    assert client.get('/api/dashboard/').status_code == 401
    assert client.get('/api/admin/users').status_code == 401
    assert client.post('/api/auth/login', json={
        'email': 'admin@example.com', 'password': 'wrongpassword',
    }).status_code == 401
    assert client.post('/api/auth/login', json={
        'email': 'missing@example.com', 'password': 'wrongpassword',
    }).status_code == 401

    customer = register(client, 'Customer', 'customer@example.com')
    assert client.post('/api/auth/login', json={
        'email': 'customer@example.com', 'password': 'Password123',
    }).json()['user']['role'] == 'user'
    assert client.post('/api/auth/admin/login', json={
        'email': 'admin@example.com', 'password': 'AdminPass123',
    }).status_code == 404

    # Even a signed token with a forged role claim cannot override the role in MySQL.
    settings = get_settings()
    forged_role = jwt.encode({
        'sub': str(customer['user']['id']), 'role': 'admin',
        'exp': datetime.now(timezone.utc) + timedelta(minutes=10),
    }, settings.secret_key, algorithm=settings.algorithm)
    client.headers['Authorization'] = f'Bearer {forged_role}'
    assert client.get('/api/dashboard/').status_code == 403
    assert client.get('/api/admin/users').status_code == 403

    response = client.post('/api/auth/login', json={
        'email': 'admin@example.com', 'password': 'AdminPass123',
    })
    assert response.status_code == 200
    assert response.json()['user']['role'] == 'admin'
    token = response.json()['access_token']
    client.headers['Authorization'] = f'Bearer {token}'
    assert client.get('/api/auth/me').status_code == 200
    assert client.get('/api/dashboard/').status_code == 200
    assert 'HTTPBearer' in client.get('/openapi.json').json()['components']['securitySchemes']


def test_admin_seed_creates_once_and_can_promote_existing_customer(client):
    from app.database import get_db
    from app.main import app
    from scripts.create_admin import seed_admin

    session_generator = app.dependency_overrides[get_db]()
    db = next(session_generator)
    try:
        assert seed_admin(db, email='first@example.com', name='First Admin', phone='N/A', password='SeedPass123') == 'created'
        assert seed_admin(db, email='first@example.com', name='First Admin', phone='N/A', password='SeedPass123') == 'already_exists'
        registered = register(client, 'Another Customer', 'another@example.com')
        assert seed_admin(db, email='another@example.com', name='Ignored', phone='N/A', password='NewAdminPass123') == 'promoted'
        assert client.post('/api/auth/login', json={
            'email': 'another@example.com', 'password': 'NewAdminPass123',
        }).status_code == 200
        assert registered['user']['role'] == 'user'
    finally:
        session_generator.close()


def test_admin_can_manage_roles_and_active_status(client):
    client.headers.pop('Authorization', None)
    account = register(client, 'New User', 'new-user@example.com')
    user_id = account['user']['id']
    client.headers['Authorization'] = f"Bearer {account['access_token']}"
    assert client.patch(f'/api/admin/users/{user_id}/role', json={'role': 'admin'}).status_code == 403
    assert client.patch(f'/api/admin/users/{user_id}/active', json={'is_active': False}).status_code == 403
    assert client.patch(f'/api/customers/{user_id}', json={'role': 'admin'}).json()['role'] == 'user'

    admin = authenticate(client, 'admin@example.com', 'AdminPass123')
    assert client.patch(f"/api/admin/users/{admin['id']}/role", json={'role': 'user'}).status_code == 409
    assert client.patch(f'/api/admin/users/{user_id}/role', json={'role': 'manager'}).status_code == 422
    promoted = client.patch(f'/api/admin/users/{user_id}/role', json={'role': 'admin'})
    assert promoted.status_code == 200
    assert promoted.json()['role'] == 'admin'
    client.headers['Authorization'] = f"Bearer {account['access_token']}"
    assert client.get('/api/dashboard/').status_code == 200

    authenticate(client, 'admin@example.com', 'AdminPass123')
    assert client.patch(f'/api/admin/users/{user_id}/role', json={'role': 'user'}).json()['role'] == 'user'
    assert client.patch(f'/api/admin/users/{user_id}/active', json={'is_active': False}).json()['is_active'] is False
    client.headers['Authorization'] = f"Bearer {account['access_token']}"
    assert client.get('/api/auth/me').status_code == 401
    assert client.post('/api/auth/login', json={'email': 'new-user@example.com', 'password': 'Password123'}).status_code == 403


def test_auth_reviews_ownership_and_admin_workflow(client):
    client.headers.pop('Authorization', None)
    assert client.post('/api/categories/', json={'name': 'Denied'}).status_code == 401
    alice = register(client, 'Alice', 'alice@example.com')
    client.headers['Authorization'] = f"Bearer {alice['access_token']}"
    assert client.post('/api/categories/', json={'name': 'Denied'}).status_code == 403
    assert client.get('/api/dashboard/').status_code == 403
    assert client.get('/api/admin/users').status_code == 403
    assert client.post('/api/auth/login', json={'email': 'alice@example.com', 'password': 'bad'}).status_code == 401

    authenticate(client, 'admin@example.com', 'AdminPass123')
    category = client.post('/api/categories/', json={'name': 'Bowls'}).json()
    food_response = client.post('/api/foods/', json={'category_id': category['id'], 'name': 'Fire Bowl', 'price': '12.50'})
    assert food_response.status_code == 201
    food = food_response.json()
    nutrition = client.put(f"/api/admin/foods/{food['id']}/nutrition", json={'calories': 400, 'protein': '20.50'})
    assert nutrition.status_code == 200
    assert client.get(f"/api/foods/{food['id']}").json()['nutrition']['calories'] == 400

    client.headers['Authorization'] = f"Bearer {alice['access_token']}"
    review = client.post(f"/api/foods/{food['id']}/reviews", json={'rating': 5, 'comment': 'Loved it'})
    assert review.status_code == 201
    review_id = review.json()['id']
    assert client.post(f"/api/foods/{food['id']}/reviews", json={'rating': 4, 'comment': 'Again'}).status_code == 409
    assert client.get(f"/api/foods/{food['id']}").json()['average_rating'] == '5.0'
    assert len(client.get(f"/api/foods/{food['id']}/reviews").json()) == 1
    order = client.post('/api/orders/', json={
        'customer_id': alice['user']['id'], 'delivery_address': '12 Market Lane',
        'items': [{'food_id': food['id'], 'quantity': 2}],
    })
    assert order.status_code == 201
    order_data = order.json()
    assert order_data['total_amount'] == '74.00'
    assert order_data['items'][0]['food_name'] == 'Fire Bowl'

    bob = register(client, 'Bob', 'bob@example.com')
    client.headers['Authorization'] = f"Bearer {bob['access_token']}"
    assert client.get(f"/api/orders/{order_data['id']}").status_code == 404
    assert client.get(f"/api/customers/{alice['user']['id']}/orders").status_code == 404
    assert client.patch(f"/api/reviews/{review_id}", json={'rating': 1, 'comment': 'No'}).status_code == 404
    assert client.post('/api/orders/', json={
        'customer_id': alice['user']['id'], 'delivery_address': '12 Market Lane',
        'items': [{'food_id': food['id'], 'quantity': 1}],
    }).status_code == 403

    authenticate(client, 'admin@example.com', 'AdminPass123')
    payment_id = order_data['payment']['id'] if 'id' in order_data['payment'] else None
    assert payment_id is not None
    assert client.patch(f'/api/admin/payments/{payment_id}/status', json={'status': 'paid'}).status_code == 409
    for status in ('confirmed', 'preparing', 'out_for_delivery', 'delivered'):
        assert client.patch(f"/api/orders/{order_data['id']}/status", json={'status': status}).status_code == 200
    assert client.patch(f'/api/admin/payments/{payment_id}/status', json={'status': 'paid'}).status_code == 200
    assert client.get('/api/dashboard/').json()['delivered_revenue'] == '74.00'
    assert client.delete(f'/api/admin/reviews/{review_id}').status_code == 204
    assert client.get(f"/api/foods/{food['id']}").json()['review_count'] == 0
    assert client.patch(f"/api/admin/users/{bob['user']['id']}/active", json={'is_active': False}).status_code == 200
    client.headers['Authorization'] = f"Bearer {bob['access_token']}"
    assert client.get('/api/auth/me').status_code == 401
