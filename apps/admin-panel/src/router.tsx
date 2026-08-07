import { createBrowserRouter, Navigate } from "react-router-dom";
import { AdminLayout } from "./components/AdminLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import AdminSignupPage from "./pages/AdminSignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import StoreManagementPage from "./pages/StoreManagementPage";
import ThemeEditorPage from "./pages/ThemeEditorPage";
import AuditLogPage from "./pages/AuditLogPage";
import StoreActivityPage from "./pages/StoreActivityPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/admin-signup", element: <AdminSignupPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "stores", element: <StoreManagementPage /> },
      { path: "stores/:storeId/theme", element: <ThemeEditorPage /> },
      { path: "stores/:storeId/activity", element: <StoreActivityPage /> },
      { path: "audit-logs", element: <AuditLogPage /> },
    ],
  },
]);
