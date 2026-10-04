import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Flame,
  LayoutDashboard,
  LogOut,
  Package,
  ShoppingBag,
  Star,
  Users,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api, apiError, foodImage, money } from "../services/api";

const nav = [
  ["/admin", "Dashboard", LayoutDashboard],
  ["/admin/categories", "Categories", BookOpen],
  ["/admin/foods", "Foods", Package],
  ["/admin/orders", "Orders", ShoppingBag],
  ["/admin/users", "Users", Users],
  ["/admin/reviews", "Reviews", Star],
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="brand">
          <span className="brand-mark">
            <Flame size={23} fill="currentColor" />
          </span>
          <span>
            <b>நம்ம கடை</b>
          </span>
        </div>
        <span className="admin-label">ADMIN WORKSPACE</span>
        <nav>
          {nav.map(([path, label, Icon]) => (
            <NavLink key={path} to={path} end={path === "/admin"}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            <LogOut size={17} /> Log out
          </button>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <span>Welcome back, {user?.name}</span>
          <Link to="/profile" className="admin-avatar">
            {user?.name?.[0]?.toUpperCase()}
          </Link>
        </header>
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function useAdminData(path) {
  const [data, setData] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const reload = () => {
    setLoading(true);
    api
      .get(path)
      .then(({ data }) => {
        setData(data);
        setError("");
      })
      .catch((e) => setError(apiError(e)))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    reload();
  }, [path]);
  return { data, error, loading, reload, setError };
}
function AdminHeading({ eyebrow, title, children }) {
  return (
    <div className="admin-heading">
      <div>
        <span className="kicker">{eyebrow}</span>
        <h1>{title}</h1>
      </div>
      {children}
    </div>
  );
}

export function AdminCategories() {
  const { data, error, reload, setError } = useAdminData(
    "/categories/?limit=100",
  );
  const [form, setForm] = useState({ name: "", description: "" });
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      editing
        ? await api.patch(`/categories/${editing}`, form)
        : await api.post("/categories/", form);
      setForm({ name: "", description: "" });
      setEditing(null);
      reload();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };
  const edit = (item) => {
    setEditing(item.id);
    setForm({ name: item.name, description: item.description || "" });
  };
  const remove = async (item) => {
    if (!confirm(`Delete ${item.name}?`)) return;
    try {
      await api.delete(`/categories/${item.id}`);
      reload();
    } catch (err) {
      setError(apiError(err));
    }
  };
  return (
    <>
      <AdminHeading eyebrow="ORGANIZE YOUR MENU" title="Categories" />
      <div className="admin-two-col">
        <div className="panel">
          <h2>{editing ? "Edit category" : "Add category"}</h2>
          <form className="form-stack" onSubmit={submit}>
            <label>
              Name
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              Description
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </label>
            <div className="step-actions">
              <button className="btn btn-red" disabled={busy}>
                {editing ? "Save changes" : "Create category"}
              </button>
              {editing && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setEditing(null);
                    setForm({ name: "", description: "" });
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
        <div className="panel">
          <h2>All categories</h2>
          {error && <p className="alert">{error}</p>}
          {data.length ? (
            data.map((item) => (
              <div className="admin-list-row" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <small>{item.description || "No description"}</small>
                </div>
                <button onClick={() => edit(item)}>Edit</button>
                <button className="danger-text" onClick={() => remove(item)}>
                  Delete
                </button>
              </div>
            ))
          ) : (
            <p className="muted">No categories yet.</p>
          )}
        </div>
      </div>
    </>
  );
}

export function AdminFoods() {
  const { data, error, reload, setError } = useAdminData(
    "/foods/?include_unavailable=true&limit=100",
  );
  const { data: categories } = useAdminData("/categories/?limit=100");
  const initial = {
    name: "",
    category_id: "",
    description: "",
    ingredients: "",
    price: "",
    image_url: "",
    is_available: true,
  };
  const [form, setForm] = useState(initial);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [nutritionFood, setNutritionFood] = useState(null);
  const [nutrition, setNutrition] = useState({
    calories: "",
    protein: "",
    carbohydrates: "",
    fat: "",
    fiber: "",
    sugar: "",
    sodium: "",
  });
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        ...form,
        category_id: Number(form.category_id),
        price: String(form.price),
        image_url: form.image_url || null,
      };
      const { data: saved } = editing
        ? await api.patch(`/foods/${editing}`, payload)
        : await api.post("/foods/", payload);
      if (imageFile) {
        setEditing(saved.id);
        const upload = new FormData();
        upload.append("image", imageFile);
        await api.post(`/foods/${saved.id}/image`, upload);
      }
      setImageFile(null);
      setImagePreview("");
      setEditing(null);
      setForm(initial);
      reload();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };
  const edit = (food) => {
    setImageFile(null);
    setImagePreview("");
    setEditing(food.id);
    setForm({
      name: food.name,
      category_id: String(food.category_id),
      description: food.description || "",
      ingredients: food.ingredients || "",
      price: food.price,
      image_url: food.image_url || "",
      is_available: food.is_available,
    });
  };
  const remove = async (food) => {
    if (!confirm(`Delete ${food.name}?`)) return;
    try {
      await api.delete(`/foods/${food.id}`);
      reload();
    } catch (err) {
      setError(apiError(err));
    }
  };
  const setAvailable = async (food) => {
    try {
      await api.patch(`/foods/${food.id}`, {
        is_available: !food.is_available,
      });
      reload();
    } catch (err) {
      setError(apiError(err));
    }
  };
  const saveNutrition = async (e) => {
    e.preventDefault();
    try {
      const payload = Object.fromEntries(
        Object.entries(nutrition).map(([key, value]) => [
          key,
          value === "" ? null : value,
        ]),
      );
      await api.put(`/admin/foods/${nutritionFood.id}/nutrition`, payload);
      setNutritionFood(null);
      reload();
    } catch (err) {
      setError(apiError(err));
    }
  };
  return (
    <>
      <AdminHeading eyebrow="FROM KITCHEN TO MENU" title="Foods" />
      <div className="admin-two-col">
        <div className="panel">
          <h2>{editing ? "Edit food" : "Add food"}</h2>
          <form className="form-stack" onSubmit={submit}>
            <label>
              Name
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              Category
              <select
                required
                value={form.category_id}
                onChange={(e) =>
                  setForm({ ...form, category_id: e.target.value })
                }
              >
                <option value="">Choose category</option>
                {categories.map((category) => (
                  <option value={category.id} key={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Price (LKR)
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </label>
            <label>
              Description
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </label>
            <label>
              Ingredients
              <textarea
                value={form.ingredients}
                onChange={(e) =>
                  setForm({ ...form, ingredients: e.target.value })
                }
              />
            </label>
            <label>
              Food image
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  setImageFile(file || null);
                  setImagePreview(file ? URL.createObjectURL(file) : "");
                }}
              />
            </label>
            {(imagePreview || form.image_url) && (
              <div className="image-upload-preview">
                <img src={imagePreview || foodImage(form)} alt="Food preview" />
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview("");
                    setForm({ ...form, image_url: null });
                  }}
                >
                  Remove image
                </button>
              </div>
            )}
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.is_available}
                onChange={(e) =>
                  setForm({ ...form, is_available: e.target.checked })
                }
              />{" "}
              Available for ordering
            </label>
            <div className="step-actions">
              <button className="btn btn-red" disabled={busy}>
                {editing ? "Save food" : "Add food"}
              </button>
              {editing && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setEditing(null);
                    setForm(initial);
                    setImageFile(null);
                    setImagePreview("");
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
        <div className="panel">
          <h2>Menu items</h2>
          {error && <p className="alert">{error}</p>}
          {data.length ? (
            data.map((food) => (
              <div key={food.id} className="admin-food-row">
                {foodImage(food) ? (
                  <img src={foodImage(food)} alt="" />
                ) : (
                  <span className="food-image-empty">No image</span>
                )}
                <div>
                  <strong>{food.name}</strong>
                  <small>
                    {money(food.price)} ·{" "}
                    {food.is_available ? "Available" : "Unavailable"}
                  </small>
                </div>
                <div className="admin-row-actions">
                  <button onClick={() => edit(food)}>Edit</button>
                  <button onClick={() => setAvailable(food)}>
                    {food.is_available ? "Hide" : "Show"}
                  </button>
                  <button
                    onClick={() => {
                      setNutritionFood(food);
                      setNutrition({
                        calories: food.nutrition?.calories ?? "",
                        protein: food.nutrition?.protein ?? "",
                        carbohydrates: food.nutrition?.carbohydrates ?? "",
                        fat: food.nutrition?.fat ?? "",
                        fiber: food.nutrition?.fiber ?? "",
                        sugar: food.nutrition?.sugar ?? "",
                        sodium: food.nutrition?.sodium ?? "",
                      });
                    }}
                  >
                    Nutrition
                  </button>
                  <button className="danger-text" onClick={() => remove(food)}>
                    Delete
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="muted">No food items yet.</p>
          )}
        </div>
      </div>
      {nutritionFood && (
        <div className="modal-backdrop">
          <div className="panel modal">
            <h2>Nutrition · {nutritionFood.name}</h2>
            <form onSubmit={saveNutrition}>
              <div className="form-grid">
                {Object.keys(nutrition).map((key) => (
                  <label key={key}>
                    {key}
                    <input
                      type="number"
                      min="0"
                      step={key === "calories" ? "1" : "0.01"}
                      value={nutrition[key]}
                      onChange={(e) =>
                        setNutrition({ ...nutrition, [key]: e.target.value })
                      }
                    />
                  </label>
                ))}
              </div>
              <div className="step-actions">
                <button className="btn btn-red">Save nutrition</button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setNutritionFood(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function AdminOrders() {
  const { data, error, reload, setError } = useAdminData("/orders/?limit=100");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const next = {
    pending: "confirmed",
    confirmed: "preparing",
    preparing: "out_for_delivery",
    out_for_delivery: "delivered",
  };
  const change = async (order) => {
    try {
      await api.patch(`/orders/${order.id}/status`, {
        status: next[order.status],
      });
      reload();
      setSelected(null);
    } catch (err) {
      setError(apiError(err));
    }
  };
  const markPaid = async (order) => {
    try {
      await api.patch(`/admin/payments/${order.payment.id}/status`, {
        status: "paid",
      });
      reload();
      setSelected(null);
    } catch (err) {
      setError(apiError(err));
    }
  };
  const visible = data.filter(
    (order) =>
      (filter === "all" || order.status === filter) &&
      (!search ||
        String(order.id).includes(search) ||
        order.delivery_name.toLowerCase().includes(search.toLowerCase())),
  );
  return (
    <>
      <AdminHeading eyebrow="KITCHEN COMMAND" title="Orders" />
      <div className="admin-filters">
        <input
          placeholder="Search order or customer…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          {[
            "all",
            "pending",
            "confirmed",
            "preparing",
            "out_for_delivery",
            "delivered",
            "cancelled",
          ].map((item) => (
            <option key={item} value={item}>
              {item.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="alert">{error}</p>}
      <div className="panel admin-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Payment</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((order) => (
              <tr key={order.id}>
                <td>#{order.id}</td>
                <td>{order.delivery_name}</td>
                <td>{order.items.length}</td>
                <td>{money(order.total_amount)}</td>
                <td>
                  <span className={`status-chip ${order.status}`}>
                    {order.status.replaceAll("_", " ")}
                  </span>
                </td>
                <td>{order.payment?.status}</td>
                <td>
                  <button onClick={() => setSelected(order)}>View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && (
          <div className="empty-panel">No matching orders.</div>
        )}
      </div>
      {selected && (
        <div className="modal-backdrop">
          <div className="panel modal">
            <h2>Order #{selected.id}</h2>
            <p>
              {selected.delivery_name}
              <br />
              {selected.delivery_phone}
              <br />
              {selected.delivery_address}
            </p>
            {selected.items.map((item) => (
              <div className="order-line" key={item.id}>
                <span>
                  {item.quantity} × {item.food_name}
                </span>
                <b>{money(item.subtotal)}</b>
              </div>
            ))}
            <div className="order-line summary-total">
              <span>Total</span>
              <strong>{money(selected.total_amount)}</strong>
            </div>
            <p>
              Payment: {selected.payment?.method?.replaceAll("_", " ")} ·{" "}
              {selected.payment?.status}
            </p>
            <div className="step-actions">
              {next[selected.status] && (
                <button
                  className="btn btn-red"
                  onClick={() => change(selected)}
                >
                  Move to {next[selected.status].replaceAll("_", " ")}
                </button>
              )}
              {selected.status === "delivered" &&
                selected.payment?.status === "pending" && (
                  <button
                    className="btn btn-red"
                    onClick={() => markPaid(selected)}
                  >
                    Record cash received
                  </button>
                )}
              <button
                className="btn btn-outline"
                onClick={() => setSelected(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function AdminUsers() {
  const { user: currentUser } = useAuth();
  const { data, error, loading, reload, setError } = useAdminData(
    "/admin/users?limit=100",
  );
  const [search, setSearch] = useState("");
  const [workingId, setWorkingId] = useState(null);
  const [message, setMessage] = useState("");
  const changeRole = async (account, role) => {
    if (account.role === role) return;
    if (!window.confirm(`Change ${account.name}'s role to ${role}?`)) return;
    setWorkingId(account.id);
    setError("");
    setMessage("");
    try {
      await api.patch(`/admin/users/${account.id}/role`, { role });
      setMessage(`${account.name} is now ${role}.`);
      reload();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setWorkingId(null);
    }
  };
  const toggle = async (account) => {
    setWorkingId(account.id);
    setError("");
    setMessage("");
    try {
      await api.patch(`/admin/users/${account.id}/active`, {
        is_active: !account.is_active,
      });
      setMessage(
        `${account.name} ${account.is_active ? "deactivated" : "activated"}.`,
      );
      reload();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setWorkingId(null);
    }
  };
  const visible = data.filter((account) =>
    `${account.name} ${account.email}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <AdminHeading eyebrow="ACCOUNT MANAGEMENT" title="Users" />
      <p className="muted">
        Set account roles and control access. New registrations start as users.
      </p>
      <input
        className="admin-search"
        placeholder="Search users…"
        aria-label="Search users"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {error && <p className="alert">{error}</p>}
      {message && <p className="success">{message}</p>}
      <div className="panel admin-table-wrap">
        {loading ? (
          <div className="page-loader">Loading users…</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th>Access</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((account) => (
                <tr key={account.id}>
                  <td>{account.name}</td>
                  <td>{account.email}</td>
                  <td>{account.phone}</td>
                  <td>
                    <select
                      className="role-select"
                      aria-label={`Role for ${account.name}`}
                      value={account.role}
                      disabled={
                        account.id === currentUser?.id ||
                        workingId === account.id
                      }
                      onChange={(e) => changeRole(account, e.target.value)}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    <span
                      className={`status-chip ${account.is_active ? "delivered" : "cancelled"}`}
                    >
                      {account.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <button
                      disabled={
                        account.id === currentUser?.id ||
                        workingId === account.id
                      }
                      onClick={() => toggle(account)}
                    >
                      {account.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && !visible.length && (
          <div className="empty-panel">No users found.</div>
        )}
      </div>
    </>
  );
}

export function AdminReviews() {
  const { data, error, reload, setError } = useAdminData(
    "/admin/reviews?limit=100",
  );
  const remove = async (review) => {
    if (!confirm("Remove this review?")) return;
    try {
      await api.delete(`/admin/reviews/${review.id}`);
      reload();
    } catch (err) {
      setError(apiError(err));
    }
  };
  return (
    <>
      <AdminHeading eyebrow="WHAT GUESTS SAY" title="Reviews" />
      {error && <p className="alert">{error}</p>}
      <div className="panel">
        {data.length ? (
          data.map((review) => (
            <div className="admin-list-row" key={review.id}>
              <div>
                <strong>
                  {review.customer_name} · Food #{review.food_id} ·{" "}
                  {"★".repeat(review.rating)}
                </strong>
                <small>{review.comment}</small>
              </div>
              <button className="danger-text" onClick={() => remove(review)}>
                Remove
              </button>
            </div>
          ))
        ) : (
          <div className="empty-panel">No reviews yet.</div>
        )}
      </div>
    </>
  );
}
