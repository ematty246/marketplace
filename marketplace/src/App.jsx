import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import CustomerLayout from "./layouts/CustomerLayout.jsx";
import ProtectedCustomerRoute from "./components/customer/ProtectedCustomerRoute.jsx";
import ShopPage from "./pages/customer/ShopPage.jsx";
import CustomerLoginPage from "./pages/customer/CustomerLoginPage.jsx";
import CustomerRegisterPage from "./pages/customer/CustomerRegisterPage.jsx";
import CartPage from "./pages/customer/CartPage.jsx";
import CheckoutPage from "./pages/customer/CheckoutPage.jsx";
import OrderSuccessPage from "./pages/customer/OrderSuccessPage.jsx";
import MyOrdersPage from "./pages/customer/MyOrdersPage.jsx";
import AccountPage from "./pages/customer/AccountPage.jsx";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute.jsx";
import AdminLayout from "./layouts/AdminLayout.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import MicButton from "./components/MicButton.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import ProductsPage from "./pages/ProductsPage.jsx";
import InventoryPage from "./pages/InventoryPage.jsx";
import AdminOrdersPage from "./pages/AdminOrdersPage.jsx";
import AddProduct from "./pages/AddProduct.jsx";
import EditProduct from "./pages/EditProduct.jsx";

// The mic is for shoppers only: never on /admin pages and never for a signed-in administrator.
function CustomerMic() {
  const { status } = useAuth();
  const { pathname } = useLocation();
  if (status === "loading" || status === "authed" || pathname.startsWith("/admin")) return null;
  return <MicButton />;
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        <Routes>
          <Route path="/" element={<Navigate to="/shop" replace />} />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Admin area: ProtectedAdminRoute only lets signed-in administrators through */}
          <Route element={<ProtectedAdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/products" element={<ProductsPage />} />
              <Route path="/admin/inventory" element={<InventoryPage />} />
              <Route path="/admin/orders" element={<AdminOrdersPage />} />
              <Route path="/admin/products/new" element={<AddProduct />} />
              <Route path="/admin/products/:id/edit" element={<EditProduct />} />
            </Route>
          </Route>

          {/* Customer sign in / sign up: full-page, same design as the admin login */}
          <Route path="/customer/login" element={<CustomerLoginPage />} />
          <Route path="/customer/register" element={<CustomerRegisterPage />} />

          {/* Customer storefront */}
          <Route element={<CustomerLayout />}>
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route element={<ProtectedCustomerRoute />}>
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/orders" element={<MyOrdersPage />} />
              <Route path="/orders/:orderId" element={<OrderSuccessPage />} />
              <Route path="/account" element={<AccountPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/shop" replace />} />
        </Routes>

        <CustomerMic />
      </CartProvider>
    </AuthProvider>
  );
}