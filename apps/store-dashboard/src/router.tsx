import { createBrowserRouter } from "react-router-dom";
import { StoreAccessGate } from "./components/StoreAccessGate";
import { ProtectedRoute } from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import StoreVerificationPage from "./pages/StoreVerificationPage";
import DashboardPage from "./pages/DashboardPage";
import OrdersListPage from "./pages/OrdersListPage";
import OrderDetailPage from "./pages/OrderDetailPage";
import ProductsPage from "./pages/ProductsPage";
import AddProductPage from "./pages/AddProductPage";
import EditProductPage from "./pages/EditProductPage";
import CustomersPage from "./pages/CustomersPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/signup", element: <SignupPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  // Public, token-gated (Section 7) - not wrapped in ProtectedRoute, since
  // the owner may open the emailed link on a device/browser where they
  // aren't logged in at all. The token itself is the credential.
  { path: "/store-verification/:token", element: <StoreVerificationPage /> },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <StoreAccessGate />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "orders", element: <OrdersListPage /> },
      { path: "orders/:orderId", element: <OrderDetailPage /> },
      { path: "products", element: <ProductsPage /> },
      { path: "products/new", element: <AddProductPage /> },
      { path: "products/:productId/edit", element: <EditProductPage /> },
      { path: "customers", element: <CustomersPage /> },
      { path: "analytics", element: <AnalyticsPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "profile", element: <ProfilePage /> },
    ],
  },
]);
