import { createBrowserRouter } from "react-router-dom";
import { StoreLayout } from "./components/StoreLayout";
import HomePage from "./pages/HomePage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderConfirmationPage from "./pages/OrderConfirmationPage";
import OrderLookupPage from "./pages/OrderLookupPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <div className="flex min-h-screen flex-col items-center justify-center text-center">
        <h1 className="mb-2 text-lg font-semibold text-text-primary">CommerceOS Storefront</h1>
        <p className="text-sm text-text-secondary">Visit a store at /your-store-slug</p>
      </div>
    ),
  },
  {
    path: "/:storeSlug",
    element: <StoreLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "products/:productId", element: <ProductDetailPage /> },
      { path: "cart", element: <CartPage /> },
      { path: "checkout", element: <CheckoutPage /> },
      { path: "order-confirmation", element: <OrderConfirmationPage /> },
      { path: "track-order", element: <OrderLookupPage /> },
    ],
  },
]);
