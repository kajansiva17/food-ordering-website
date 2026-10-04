import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  Truck,
  CreditCard,
  MapPin,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { api, apiError, foodImage, money } from "../services/api";

const cartPayload = (items) => ({
  items: items.map(({ food_id, quantity }) => ({ food_id, quantity })),
});

function PriceSummary({ preview, action }) {
  return (
    <aside className="summary-card">
      <h2>Order summary</h2>
      <div>
        <span>Subtotal</span>
        <b>{preview ? money(preview.subtotal_amount) : "Calculating…"}</b>
      </div>
      <div>
        <span>Delivery fee</span>
        <b>{preview ? money(preview.delivery_fee) : "Calculating…"}</b>
      </div>
      <div className="summary-total">
        <span>Total amount</span>
        <strong>
          {preview ? money(preview.total_amount) : "Calculating…"}
        </strong>
      </div>
      {action}
      <p>Prices and availability are confirmed by the kitchen at checkout.</p>
    </aside>
  );
}

export function Cart() {
  const { items, update, remove, clear } = useCart();
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!items.length) {
      setPreview(null);
      return;
    }
    const controller = new AbortController();
    setPreview(null);
    api
      .post("/cart/preview", cartPayload(items), { signal: controller.signal })
      .then(({ data }) => {
        setPreview(data);
        setError("");
      })
      .catch((e) => {
        if (e.code !== "ERR_CANCELED") {
          setPreview(null);
          const missing =
            e.response?.status === 404 &&
            /^Food (\d+) not found$/.exec(e.response.data?.detail || "");
          if (missing) {
            remove(Number(missing[1]));
            setError(
              "A food item was removed from your cart because it is no longer available.",
            );
          } else setError(apiError(e));
        }
      });
    return () => controller.abort();
  }, [items]);
  return (
    <div className="container page-space">
      <span className="kicker">YOUR NEXT MEAL</span>
      <h1>
        Your cart{" "}
        <span className="red">
          ({items.reduce((sum, item) => sum + item.quantity, 0)})
        </span>
      </h1>
      {items.length ? (
        <div className="cart-layout">
          <div>
            <div className="cart-list">
              {items.map((item) => (
                <div className="cart-item" key={item.food_id}>
                  {foodImage(item.food) ? (
                    <img src={foodImage(item.food)} alt={item.food.name} />
                  ) : (
                    <span className="food-image-empty">No image yet</span>
                  )}
                  <div className="cart-item-info">
                    <Link to={`/food/${item.food_id}`}>
                      <h3>{item.food.name}</h3>
                    </Link>
                    <span>
                      {preview
                        ? money(
                            preview.items.find(
                              (line) => line.food_id === item.food_id,
                            )?.unit_price,
                          )
                        : "Checking price..."}{" "}
                      each
                    </span>
                  </div>
                  <div className="stepper">
                    <button
                      aria-label="Decrease"
                      onClick={() => update(item.food_id, item.quantity - 1)}
                    >
                      <Minus size={15} />
                    </button>
                    <b>{item.quantity}</b>
                    <button
                      aria-label="Increase"
                      onClick={() => update(item.food_id, item.quantity + 1)}
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                  <strong>
                    {preview
                      ? money(
                          preview.items.find(
                            (line) => line.food_id === item.food_id,
                          )?.subtotal,
                        )
                      : "..."}
                  </strong>
                  <button
                    className="remove-button"
                    onClick={() => remove(item.food_id)}
                    aria-label={`Remove ${item.food.name}`}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
            <button className="text-button clear-cart" onClick={clear}>
              Clear cart
            </button>
            {error && <p className="alert">{error}</p>}
          </div>
          <PriceSummary
            preview={preview}
            action={
              <Link
                to="/checkout"
                className={`btn btn-red wide ${!preview ? "disabled" : ""}`}
              >
                Continue to checkout <ArrowRight size={18} />
              </Link>
            }
          />
        </div>
      ) : (
        <div className="empty-panel empty-cart">
          <ShoppingBag size={48} />
          <h2>Your cart is waiting.</h2>
          <p>Find something delicious and add it here.</p>
          <Link className="btn btn-red" to="/menu">
            Browse the menu
          </Link>
        </div>
      )}
    </div>
  );
}

export function Checkout() {
  const { items, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    delivery_name: user?.name || "",
    delivery_email: user?.email || "",
    delivery_phone: user?.phone || "",
    delivery_address: user?.address || "",
    delivery_notes: "",
    payment_method: "cash_on_delivery",
  });
  useEffect(() => {
    if (items.length)
      api
        .post("/cart/preview", cartPayload(items))
        .then(({ data }) => setPreview(data))
        .catch((e) => setError(apiError(e)));
  }, [items]);
  if (!items.length)
    return (
      <div className="container page-space empty-panel">
        <h2>Your cart is empty.</h2>
        <Link to="/menu" className="btn btn-red">
          Explore the menu
        </Link>
      </div>
    );
  const place = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/orders/", {
        customer_id: user.id,
        ...cartPayload(items),
        ...form,
      });
      clear();
      navigate(`/confirmation/${data.id}`, { replace: true });
    } catch (e) {
      setError(apiError(e, "Unable to place your order."));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  return (
    <div className="container page-space">
      <span className="kicker">JUST A FEW MORE STEPS</span>
      <h1>Checkout</h1>
      <div className="checkout-steps">
        {[
          ["Cart", 0],
          ["Delivery", 1],
          ["Payment", 2],
          ["Confirm", 3],
        ].map(([label, n]) => (
          <div key={label} className={step >= n ? "active" : ""}>
            <span>{step > n ? <Check size={16} /> : n + 1}</span>
            {label}
          </div>
        ))}
      </div>
      <div className="cart-layout">
        <div className="checkout-main">
          {step === 1 && (
            <form
              className="panel"
              onSubmit={(e) => {
                e.preventDefault();
                setStep(2);
              }}
            >
              <h2>
                <MapPin size={23} /> Delivery information
              </h2>
              <div className="form-grid">
                <label>
                  Full name
                  <input
                    required
                    value={form.delivery_name}
                    onChange={(e) =>
                      setForm({ ...form, delivery_name: e.target.value })
                    }
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    required
                    value={form.delivery_email}
                    onChange={(e) =>
                      setForm({ ...form, delivery_email: e.target.value })
                    }
                  />
                </label>
                <label>
                  Phone number
                  <input
                    required
                    value={form.delivery_phone}
                    onChange={(e) =>
                      setForm({ ...form, delivery_phone: e.target.value })
                    }
                  />
                </label>
                <label className="span-two">
                  Delivery address
                  <textarea
                    required
                    value={form.delivery_address}
                    onChange={(e) =>
                      setForm({ ...form, delivery_address: e.target.value })
                    }
                  />
                </label>
                <label className="span-two">
                  Delivery notes (optional)
                  <textarea
                    value={form.delivery_notes}
                    onChange={(e) =>
                      setForm({ ...form, delivery_notes: e.target.value })
                    }
                  />
                </label>
              </div>
              <button className="btn btn-red">
                Continue to payment <ArrowRight size={17} />
              </button>
            </form>
          )}
          {step === 2 && (
            <div className="panel">
              <h2>
                <CreditCard size={23} /> Payment method
              </h2>
              <label className="payment-option">
                <input type="radio" checked readOnly />
                <span>
                  <strong>Cash on delivery</strong>
                  <small>
                    Pay when your food arrives. No online payment is collected.
                  </small>
                </span>
              </label>
              <div className="step-actions">
                <button className="btn btn-outline" onClick={() => setStep(1)}>
                  Back
                </button>
                <button className="btn btn-red" onClick={() => setStep(3)}>
                  Review order <ArrowRight size={17} />
                </button>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="panel">
              <h2>
                <Check size={23} /> Review and place order
              </h2>
              <p className="muted">
                Please check your details. Your total is recalculated by the
                server when you place the order.
              </p>
              <div className="review-checkout">
                <div>
                  <strong>Deliver to</strong>
                  <p>
                    {form.delivery_name}
                    <br />
                    {form.delivery_address}
                    <br />
                    {form.delivery_phone}
                  </p>
                </div>
                <div>
                  <strong>Payment</strong>
                  <p>Cash on delivery</p>
                </div>
                <div>
                  <strong>Items</strong>
                  {preview?.items.map((item, index) => (
                    <p key={index}>
                      {item.quantity} × {item.name}{" "}
                      <b>{money(item.subtotal)}</b>
                    </p>
                  ))}
                </div>
              </div>
              {error && <p className="alert">{error}</p>}
              <div className="step-actions">
                <button className="btn btn-outline" onClick={() => setStep(2)}>
                  Back
                </button>
                <button
                  className="btn btn-red"
                  onClick={place}
                  disabled={busy || !preview}
                >
                  {busy ? "Placing order…" : "Place order"}{" "}
                  <ArrowRight size={17} />
                </button>
              </div>
            </div>
          )}
          {error && step !== 3 && <p className="alert">{error}</p>}
        </div>
        <PriceSummary preview={preview} />
      </div>
    </div>
  );
}

const steps = [
  "pending",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "delivered",
];
function StatusTimeline({ status }) {
  const current = steps.indexOf(status);
  return (
    <div className="status-timeline">
      {steps.map((item, index) => (
        <div key={item} className={index <= current ? "complete" : ""}>
          <span>{index <= current ? <Check size={15} /> : index + 1}</span>
          <b>{item.replaceAll("_", " ")}</b>
        </div>
      ))}
      {status === "cancelled" && (
        <p className="alert">This order was cancelled.</p>
      )}
    </div>
  );
}

export function OrderConfirmation() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .get(`/orders/${id}`)
      .then(({ data }) => setOrder(data))
      .catch((e) => setError(apiError(e)));
  }, [id]);
  if (error) return <div className="container page-space alert">{error}</div>;
  if (!order) return <div className="page-loader">Loading your order…</div>;
  return (
    <div className="container page-space confirmation-page">
      <div className="confirmation-mark">
        <Check size={38} />
      </div>
      <span className="kicker">ORDER RECEIVED</span>
      <h1>Thanks for ordering!</h1>
      <p>
        Your order <strong>#{order.id}</strong> has been received. Follow its
        progress any time.
      </p>
      <div className="panel">
        <h2>Order #{order.id}</h2>
        <p className="muted">
          Placed {new Date(order.created_at).toLocaleString()}
        </p>
        <StatusTimeline status={order.status} />
        <div className="order-summary-lines">
          {order.items.map((item) => (
            <div key={item.id}>
              <span>
                {item.quantity} × {item.food_name}
              </span>
              <b>{money(item.subtotal)}</b>
            </div>
          ))}
          <div>
            <span>Subtotal</span>
            <b>{money(order.subtotal_amount)}</b>
          </div>
          <div>
            <span>Delivery</span>
            <b>{money(order.delivery_fee)}</b>
          </div>
          <div className="summary-total">
            <span>Total</span>
            <strong>{money(order.total_amount)}</strong>
          </div>
        </div>
        <p>
          <MapPin size={16} /> {order.delivery_name} · {order.delivery_address}
          <br />
          {order.delivery_email} · {order.delivery_phone}
        </p>
        <p>
          <CreditCard size={16} /> Cash on delivery · {order.payment?.status}
        </p>
      </div>
      <div className="center-actions">
        <Link to={`/orders/${order.id}`} className="btn btn-red">
          View order
        </Link>
        <Link to="/menu" className="btn btn-outline">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}

export function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .get(`/customers/${user.id}/orders?limit=100`)
      .then(({ data }) => setOrders(data))
      .catch((e) => setError(apiError(e)))
      .finally(() => setLoading(false));
  }, [user.id]);
  const visible =
    filter === "all"
      ? orders
      : orders.filter((order) => order.status === filter);
  return (
    <div className="container page-space">
      <span className="kicker">YOUR FOOD JOURNEY</span>
      <h1>My Orders</h1>
      <div className="filter-tabs">
        {["all", ...steps, "cancelled"].map((item) => (
          <button
            key={item}
            className={filter === item ? "active" : ""}
            onClick={() => setFilter(item)}
          >
            {item.replaceAll("_", " ")}
          </button>
        ))}
      </div>
      {loading && <div className="page-loader">Loading orders…</div>}
      {error && <p className="alert">{error}</p>}
      {!loading &&
        !error &&
        (visible.length ? (
          <div className="order-list">
            {visible.map((order) => (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="order-card"
              >
                <div>
                  <strong>Order #{order.id}</strong>
                  <span>{new Date(order.created_at).toLocaleString()}</span>
                  <span>
                    {order.items
                      .map((item) => `${item.quantity} × ${item.food_name}`)
                      .join(", ")}
                  </span>
                </div>
                <b>{money(order.total_amount)}</b>
                <span className={`status-chip ${order.status}`}>
                  {order.status.replaceAll("_", " ")}
                </span>
                <ChevronRight size={19} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-panel">
            No orders found. <Link to="/menu">Browse the menu.</Link>
          </div>
        ))}
    </div>
  );
}

export function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .get(`/orders/${id}`)
      .then(({ data }) => setOrder(data))
      .catch((e) => setError(apiError(e)));
  }, [id]);
  if (error) return <div className="container page-space alert">{error}</div>;
  if (!order) return <div className="page-loader">Loading order…</div>;
  return (
    <div className="container page-space order-detail-page">
      <Link to="/orders" className="subtle-link">
        ← My orders
      </Link>
      <span className="kicker">ORDER TRACKING</span>
      <h1>Order #{order.id}</h1>
      <p className="muted">
        Placed {new Date(order.created_at).toLocaleString()}
      </p>
      <div className="order-detail-grid">
        <div>
          <div className="panel">
            <h2>
              <Truck size={22} /> Order progress
            </h2>
            <StatusTimeline status={order.status} />
          </div>
          <div className="panel">
            <h2>Items</h2>
            {order.items.map((item) => (
              <div key={item.id} className="order-line">
                <span>
                  {item.quantity} × {item.food_name}
                </span>
                <b>{money(item.subtotal)}</b>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <h2>Delivery & payment</h2>
          <p>
            <strong>{order.delivery_name}</strong>
            <br />
            {order.delivery_email}
            <br />
            {order.delivery_phone}
            <br />
            {order.delivery_address}
          </p>
          {order.delivery_notes && <p>Note: {order.delivery_notes}</p>}
          <hr />
          <div className="order-line">
            <span>Subtotal</span>
            <b>{money(order.subtotal_amount)}</b>
          </div>
          <div className="order-line">
            <span>Delivery fee</span>
            <b>{money(order.delivery_fee)}</b>
          </div>
          <div className="order-line summary-total">
            <span>Total</span>
            <strong>{money(order.total_amount)}</strong>
          </div>
          <hr />
          <p>
            <CreditCard size={16} />{" "}
            {order.payment?.method?.replaceAll("_", " ")} ·{" "}
            {order.payment?.status}
          </p>
        </div>
      </div>
    </div>
  );
}
