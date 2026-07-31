import { createBrowserRouter } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import OrdersListPage from "./pages/OrdersListPage";
import OrderDetailPage from "./pages/OrderDetailPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "orders", element: <OrdersListPage /> },
      { path: "orders/:orderId", element: <OrderDetailPage /> },
    ],
  },
]);
