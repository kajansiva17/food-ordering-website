import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ChefHat,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  UserRound,
  MapPin,
  ShoppingBag,
  LogOut,
  House,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api, apiError } from "../services/api";

function AuthShell({ children, title, subtitle }) {
  return (
    <div className="auth-layout">
      <div className="auth-panel">
        <Link to="/" className="brand">
          <span className="brand-mark"><ChefHat size={29} strokeWidth={2.2} /></span>
          <span>நம்ம கடை</span>
        </Link>
        <div className="auth-content">
          <span className="kicker">WELCOME TO நம்ம கடை</span>
          <h1>{title}</h1>
          <p>{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(form);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(apiError(err, "Unable to log in."));
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to order food and see your account."
    >
      <form className="form-stack" onSubmit={submit}>
        <label>
          <Mail size={18} />
          <input
            type="email"
            aria-label="Email address"
            placeholder="Email address"
            autoComplete="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
        <label>
          <LockKeyhole size={18} />
          <input
            type={showPassword ? "text" : "password"}
            aria-label="Password"
            placeholder="Password"
            autoComplete="current-password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <button
            type="button"
            className="field-icon"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </label>
        {error && <p className="alert">{error}</p>}
        <button className="btn btn-red wide" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"} <ArrowRight size={17} />
        </button>
      </form>
      <p className="form-bottom">
        New here? <Link to="/register">Create an account</Link>
      </p>
    </AuthShell>
  );
}

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirm_password: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const field = (key, placeholder, type = "text", Icon = UserRound) => (
    <label key={key}>
      <Icon size={18} />
      <input
        type={type}
        aria-label={placeholder}
        placeholder={placeholder}
        autoComplete={
          key === "name"
            ? "name"
            : key === "email"
              ? "email"
              : key === "phone"
                ? "tel"
                : key === "password"
                  ? "new-password"
                  : "off"
        }
        required
        minLength={key.includes("password") ? 8 : undefined}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </label>
  );
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (form.password !== form.confirm_password) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await register(form);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(apiError(err, "Unable to create your account."));
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthShell
      title="Create your account"
      subtitle="Join நம்ம கடை to order and keep track of your food."
    >
      <form className="form-stack" onSubmit={submit}>
        {field("name", "Full name")}
        {field("email", "Email address", "email", Mail)}
        {field("phone", "Phone number", "tel", Phone)}
        {field("password", "Password", "password", LockKeyhole)}
        {field("confirm_password", "Confirm password", "password", LockKeyhole)}
        {error && <p className="alert">{error}</p>}
        <button className="btn btn-red wide" disabled={busy}>
          {busy ? "Creating account…" : "Create account"}{" "}
          <ArrowRight size={17} />
        </button>
      </form>
      <p className="form-bottom">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthShell>
  );
}

export function Profile() {
  const { user, refresh, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    address: user?.address || "",
  });
  const [passwords, setPasswords] = useState({
    current_password: "",
    new_password: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(
    () =>
      setForm({
        name: user?.name || "",
        phone: user?.phone || "",
        address: user?.address || "",
      }),
    [user],
  );
  const save = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await api.patch(`/customers/${user.id}`, {
        name: form.name,
        phone: form.phone,
        ...(form.address.trim() && { address: form.address.trim() }),
      });
      await refresh();
      setMessage("Profile saved.");
    } catch (e) {
      setError(apiError(e));
    }
  };
  const changePassword = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await api.post("/auth/change-password", passwords);
      setPasswords({ current_password: "", new_password: "" });
      setMessage("Password changed.");
    } catch (e) {
      setError(apiError(e));
    }
  };
  return (
    <div className="container page-space profile-page">
      <span className="kicker">YOUR ACCOUNT</span>
      <h1>My profile</h1>
      <div className="profile-grid">
        <aside className="profile-card">
          <div className="avatar">
            <UserRound size={32} />
          </div>
          <h2>{user?.name}</h2>
          <p>{user?.email}</p>
          <span className="role-chip">{user?.role}</span>
          <nav>
            <Link to="/dashboard">
              <House size={17} /> Dashboard
            </Link>
            <Link to="/orders">
              <ShoppingBag size={17} /> My orders
            </Link>
            <a href="#delivery-address">
              <MapPin size={17} /> My address
            </a>
            {user?.role === "admin" && (
              <Link to="/admin">
                <LockKeyhole size={17} /> Admin panel
              </Link>
            )}
            <button
              onClick={() => {
                logout();
                navigate("/");
              }}
            >
              <LogOut size={17} /> Log out
            </button>
          </nav>
        </aside>
        <div className="profile-forms">
          <form className="panel" onSubmit={save}>
            <h2>Personal details</h2>
            <p>Keep your delivery details up to date.</p>
            <div className="form-grid">
              <label>
                Full name
                <input
                  value={form.name}
                  required
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label>
                Phone
                <input
                  value={form.phone}
                  required
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </label>
              <label className="span-two">
                Email
                <input value={user?.email || ""} disabled />
              </label>
              <label className="span-two" id="delivery-address">
                Default delivery address
                <textarea
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                />
              </label>
            </div>
            <button className="btn btn-red">Save changes</button>
          </form>
          <form className="panel" onSubmit={changePassword}>
            <h2>Change password</h2>
            <div className="form-grid">
              <label>
                Current password
                <input
                  type="password"
                  required
                  value={passwords.current_password}
                  onChange={(e) =>
                    setPasswords({
                      ...passwords,
                      current_password: e.target.value,
                    })
                  }
                />
              </label>
              <label>
                New password
                <input
                  type="password"
                  minLength={8}
                  required
                  value={passwords.new_password}
                  onChange={(e) =>
                    setPasswords({ ...passwords, new_password: e.target.value })
                  }
                />
              </label>
            </div>
            <button className="btn btn-outline">Update password</button>
          </form>
          {message && <p className="success">{message}</p>}
          {error && <p className="alert">{error}</p>}
        </div>
      </div>
    </div>
  );
}
