import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { ChefHat, Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const close = () => setOpen(false);
  const submit = (event) => {
    event.preventDefault();
    navigate(
      `/menu${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ""}`,
    );
    close();
  };
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="brand" onClick={close}>
          <span className="brand-mark">
            <ChefHat size={29} strokeWidth={2.2} />
          </span>
          <span>நம்ம கடை</span>
        </Link>
        <nav
          className={`main-nav ${open ? "open" : ""}`}
          aria-label="Main navigation"
        >
          <NavLink to="/" end onClick={close}>
            Home
          </NavLink>
          <NavLink to="/menu" onClick={close}>
            Menu
          </NavLink>
          <NavLink to="/orders" onClick={close}>
            Orders
          </NavLink>
          {user && (
            <NavLink to="/dashboard" onClick={close}>
              Dashboard
            </NavLink>
          )}
          <form className="mobile-search" onSubmit={submit}>
            <Search size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search food..."
              aria-label="Search food"
            />
            <button aria-label="Search">
              <Search size={18} />
            </button>
          </form>
          {user?.role === "admin" && (
            <NavLink to="/admin" onClick={close}>
              Admin Dashboard
            </NavLink>
          )}
          <div className="mobile-account">
            {user ? (
              <>
                <NavLink to="/profile" onClick={close}>
                  Profile
                </NavLink>
                <button
                  onClick={() => {
                    logout();
                    close();
                    navigate("/");
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" onClick={close}>
                  Login
                </NavLink>
                <NavLink to="/register" onClick={close}>
                  Register
                </NavLink>
              </>
            )}
          </div>
        </nav>
        <form className="header-search" onSubmit={submit}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search food..."
            aria-label="Search food"
          />
          <button aria-label="Search">
            <Search size={19} />
          </button>
        </form>
        <div className="header-actions">
          <Link
            to="/cart"
            aria-label={`Cart with ${count} items`}
            className="icon-link"
          >
            <ShoppingBag size={22} />
            {count > 0 && <span className="cart-count">{count}</span>}
          </Link>
          {user ? (
            <>
              <Link to="/dashboard" className="icon-link" aria-label="Account">
                <UserRound size={22} />
              </Link>
              <Link className="account-link" to="/profile">
                Profile
              </Link>
              <button
                className="account-link"
                onClick={() => {
                  logout();
                  navigate("/");
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <Link className="btn btn-red account-register" to="/login">
              Sign In
            </Link>
          )}
        </div>
        <button
          className="mobile-toggle"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}
