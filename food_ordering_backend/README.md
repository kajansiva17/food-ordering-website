# நம்ம கடை API

FastAPI, SQLAlchemy, MySQL, Pydantic, and Alembic backend for the நம்ம கடை food ordering website. The existing `food_ordering_db` database is reused. App startup does not create or drop tables.

## Setup (PowerShell)

```powershell
cd 'C:\Users\uki\food ordering api\food_ordering_backend'
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m alembic upgrade head
python -m uvicorn app.main:app --reload
```

Set `DATABASE_URL` and a long random `SECRET_KEY` in the private `.env` file. `ALGORITHM` is restricted to `HS256`; token lifetime is controlled by `ACCESS_TOKEN_EXPIRE_MINUTES`. See `.env.example` for every setting. The existing MySQL database must exist before Alembic runs. `DELIVERY_FEE` defaults to 49.00 LKR; `CURRENCY` defaults to LKR. Allow the frontend origin with `CORS_ORIGINS` if its host or port changes. Open [API documentation](http://127.0.0.1:8000/docs) after starting the server.

Create or promote an administrator with a hidden password prompt:

```powershell
python -m scripts.create_admin --email kajansiva@gmail.com --name "Kajan Siva" --phone "N/A"
```

The requested administrator account has already been created in the current development MySQL database. The admin setup command is idempotent and does not reset an existing admin password. Normal registration always creates a `user` account. The sample catalog was removed; the application does not insert demonstration categories or foods at startup. Add catalog records through the admin dashboard.

All accounts use `POST /api/auth/login`. The token response includes the current database role. Admin-only APIs independently load the account from the database and verify that role, so a user cannot promote themselves by editing a request or JWT claim. Passwords use salted PBKDF2-HMAC-SHA256 hashes and never appear in API responses.

To promote a registered user in Postman, first sign in with an existing admin account at `POST /api/auth/login`, then send `PATCH /api/admin/users/{customer_id}/role` with `Authorization: Bearer <admin_access_token>` and JSON body `{"role":"admin"}`. Use `{"role":"user"}` to remove admin access. `PATCH /api/admin/users/{customer_id}/active` accepts `{"is_active":false}` or `{"is_active":true}`. These endpoints require an admin token; an account cannot change its own admin role or deactivate itself. If there is no admin account yet, create the first one with the setup command above. The already seeded development admin can use the same `/login` flow.

To verify the account without exposing its hash:

```sql
SELECT id, email, role, is_active
FROM customers
WHERE email = 'kajansiva@gmail.com';
```

## Database and migration

The original `categories`, `foods`, `customers`, `orders`, and `order_items` tables remain. Migration `8d35e994584d` adds account credentials and roles to `customers`, ingredients to `foods`, delivery snapshots and monetary breakdowns to `orders`, a food name snapshot to `order_items`, and the `nutrition`, `reviews`, and `payments` tables. It checks for existing customer and order rows before changing those tables so their historical data cannot be silently rewritten. The downgrade intentionally refuses destructive removal.

```powershell
python -m alembic current
python -m alembic check
```

For later schema changes, create and review a revision before applying it: `python -m alembic revision --autogenerate -m "describe change"`, then `python -m alembic upgrade head`.

## Frontend to API to database map

| Frontend feature | `/api` endpoint | Model |
| --- | --- | --- |
| Categories and menu | `GET /categories/`, `GET /foods/`, `GET /foods/{id}` | Category, Food, Nutrition, Review |
| Register, login, profile | `/auth/register`, `/auth/login`, `/auth/me`, `/auth/change-password`, `/customers/{id}` | Customer |
| Food reviews | `/foods/{id}/reviews`, `/reviews/{id}` | Review, Customer, Food |
| Cart pricing | `POST /cart/preview` | Food |
| Checkout and tracking | `POST /orders/`, `GET /orders/{id}`, `GET /customers/{id}/orders` | Order, OrderItem, Payment |
| Admin dashboard | `GET /dashboard/` | Category, Food, Customer, Order, Payment |
| Admin management | Category/Food mutations, `/orders/{id}/status`, `/admin/*` | All applicable models |

The cart is kept in browser storage until checkout. The server reloads current food prices and availability, calculates line amounts, subtotal, configured delivery fee, and total, then commits the order, item snapshots, and pending cash on delivery payment in one transaction. Browser supplied prices and totals are ignored. Cash is recorded as paid only after delivery.

JWT bearer tokens are required for customer data and order creation. Customer and order reads enforce ownership. Category and food mutations, dashboard, order status, payment status, user management, and review moderation require the admin role. Only the user's own review can be edited or deleted. Orders follow `pending` → `confirmed` → `preparing` → `out_for_delivery` → `delivered`, with supported cancellation transitions.

## Tests

```powershell
python -m pytest -q -p no:cacheprovider
```

Tests migrate isolated SQLite databases with Alembic; they do not write to the development MySQL database.
