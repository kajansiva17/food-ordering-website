import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShoppingBag, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api, apiError, money } from "../services/api";

export default function UserDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    api
      .get(`/customers/${user.id}/orders`, {
        params: { limit: 100 },
        signal: controller.signal,
      })
      .then(({ data }) => setOrders(data))
      .catch((err) => {
        if (err.code !== "ERR_CANCELED") setError(apiError(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [user.id]);

  return (
    <div className="container page-space user-dashboard">
      <div className="dashboard-welcome">
        <div>
          <span className="kicker">YOUR ACCOUNT</span>
          <h1>Welcome, {user.name}.</h1>
          <p>Find your next meal and keep track of what you have ordered.</p>
          <Link to="/menu" className="btn btn-red">
            Browse the menu <ArrowRight size={17} />
          </Link>
        </div>
        <span className="dashboard-welcome-icon">
          <ShoppingBag size={70} />
        </span>
      </div>
      <div className="dashboard-shortcuts">
        <Link to="/orders" className="panel">
          <ShoppingBag size={24} />
          <strong>My orders</strong>
          <span>View status and order details</span>
          <ArrowRight size={17} />
        </Link>
        <Link to="/profile" className="panel">
          <UserRound size={24} />
          <strong>My profile</strong>
          <span>Manage your account and address</span>
          <ArrowRight size={17} />
        </Link>
      </div>
      <div className="section-heading">
        <div>
          <span className="kicker">ORDER HISTORY</span>
          <h2>Recent orders</h2>
        </div>
        <Link to="/orders" className="subtle-link">
          View all <ArrowRight size={17} />
        </Link>
      </div>
      {loading ? (
        <div className="page-loader">Loading orders…</div>
      ) : error ? (
        <p className="alert">{error}</p>
      ) : orders.length ? (
        <div className="order-list">
          {orders.slice(0, 3).map((order) => (
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
              <ArrowRight size={17} />
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-panel">
          <h2>No orders yet.</h2>
          <p>Your orders will appear here after checkout.</p>
          <Link to="/menu" className="btn btn-red">
            Explore the menu
          </Link>
        </div>
      )}
    </div>
  );
}
