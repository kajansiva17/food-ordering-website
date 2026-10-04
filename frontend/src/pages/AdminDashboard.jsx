import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Flame,
  Package,
  ShoppingBag,
  Star,
  Truck,
  Users,
} from "lucide-react";
import { api, apiError, money } from "../services/api";

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api.get("/dashboard/", { signal: controller.signal }),
      api.get("/orders/", { params: { limit: 5 }, signal: controller.signal }),
    ])
      .then(([stats, recent]) => {
        setSummary(stats.data);
        setOrders(recent.data);
      })
      .catch((err) => {
        if (err.code !== "ERR_CANCELED") setError(apiError(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const cards = summary
    ? [
        ["Categories", summary.category_count, BookOpen],
        ["Foods", summary.food_count, Package],
        ["Orders", summary.order_count, ShoppingBag],
        ["Customers", summary.customer_count, Users],
        ["Pending orders", summary.pending_order_count, Flame],
        ["Delivered orders", summary.delivered_order_count, Truck],
        ["Reviews", summary.review_count, Star],
        ["Paid revenue", money(summary.delivered_revenue), Flame],
      ]
    : [];

  return (
    <>
      <div className="admin-heading">
        <div>
          <span className="kicker">ADMIN WORKSPACE</span>
          <h1>Admin dashboard</h1>
          <p className="muted">Live activity from the restaurant database.</p>
        </div>
        <Link className="btn btn-red" to="/admin/foods">
          Manage foods <ArrowRight size={17} />
        </Link>
      </div>
      {loading && <div className="page-loader">Loading admin dashboard…</div>}
      {error && <p className="alert">{error}</p>}
      {!loading && !error && (
        <>
          <div className="admin-stats">
            {cards.map(([label, value, Icon]) => (
              <div className="stat-card" key={label}>
                <Icon size={21} />
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <div className="admin-dashboard-links">
            <Link to="/admin/orders" className="panel">
              <ShoppingBag size={23} />
              <strong>Manage orders</strong>
              <span>Update kitchen and delivery status</span>
              <ArrowRight size={18} />
            </Link>
            <Link to="/admin/categories" className="panel">
              <BookOpen size={23} />
              <strong>Categories</strong>
              <span>Organize the menu</span>
              <ArrowRight size={18} />
            </Link>
            <Link to="/admin/users" className="panel">
              <Users size={23} />
              <strong>Customers</strong>
              <span>Manage account access</span>
              <ArrowRight size={18} />
            </Link>
          </div>
          <div className="panel">
            <div className="section-heading">
              <h2>Recent orders</h2>
              <Link to="/admin/orders" className="subtle-link">
                View all <ArrowRight size={17} />
              </Link>
            </div>
            {orders.length ? (
              <div className="admin-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id}>
                        <td>#{order.id}</td>
                        <td>{order.delivery_name}</td>
                        <td>{money(order.total_amount)}</td>
                        <td>
                          <span className={`status-chip ${order.status}`}>
                            {order.status.replaceAll("_", " ")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-panel">No orders yet.</div>
            )}
          </div>
        </>
      )}
    </>
  );
}
