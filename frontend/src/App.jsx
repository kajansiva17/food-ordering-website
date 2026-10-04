import { Route, Routes, Navigate, Outlet, Link } from "react-router-dom";
import Navbar from "./components/Navbar";
import { ProtectedRoute, AdminRoute } from "./components/Guards";
import { Home, Menu, FoodDetails } from "./pages/Storefront";
import { Login, Register, Profile } from "./pages/Account";
import UserDashboard from "./pages/UserDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import {
  Cart,
  Checkout,
  OrderConfirmation,
  Orders,
  OrderDetails,
} from "./pages/Ordering";
import {
  AdminLayout,
  AdminCategories,
  AdminFoods,
  AdminOrders,
  AdminUsers,
  AdminReviews,
} from "./pages/Admin";

const protectedPage = (page) => <ProtectedRoute>{page}</ProtectedRoute>;
function StorefrontPages() {
  return (
    <>
      <Navbar />
      <main>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container footer-content">
          <div>
            <strong className="footer-brand">
              நம்ம கடை<span>✦</span>
            </strong>
            <p>
              Fresh food. Good moments.
              <br />
              From our kitchen to your table.
            </p>
          </div>
          <nav aria-label="Footer navigation">
            <span>Explore</span>
            <Link to="/">Home</Link>
            <Link to="/menu">Menu</Link>
            <Link to="/orders">My orders</Link>
          </nav>
          <nav aria-label="Account links">
            <span>Your account</span>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/profile">Profile</Link>
            <Link to="/cart">Cart</Link>
          </nav>
        </div>
        <div className="container footer-bottom">
          © {new Date().getFullYear()} நம்ம கடை
        </div>
      </footer>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<StorefrontPages />}>
        <Route path="/" element={<Home />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/food/:id" element={<FoodDetails />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={protectedPage(<Checkout />)} />
        <Route
          path="/confirmation/:id"
          element={protectedPage(<OrderConfirmation />)}
        />
        <Route path="/orders" element={protectedPage(<Orders />)} />
        <Route path="/orders/:id" element={protectedPage(<OrderDetails />)} />
        <Route path="/profile" element={protectedPage(<Profile />)} />
        <Route path="/dashboard" element={protectedPage(<UserDashboard />)} />
      </Route>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="foods" element={<AdminFoods />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="reviews" element={<AdminReviews />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
