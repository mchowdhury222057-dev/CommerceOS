import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import { router } from "./router";
import { bootstrapSession } from "./lib/api-client";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

// Fire-and-forget: the auth store starts in "checking" status, and
// ProtectedRoute reacts to it once this resolves - the access token is
// never persisted (Part E.3), so every page load must re-derive the
// session from the httpOnly refresh cookie.
void bootstrapSession();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
