import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import { router } from "./router";
import { bootstrapSession } from "./lib/api-client";
import { tryConsumeImpersonationToken } from "./lib/impersonation";
import { ThemeProvider } from "./lib/theme";
import { Toaster } from "./components/ui/Toaster";
import { TooltipProvider } from "./components/ui/Tooltip";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

// Fire-and-forget: the auth store starts in "checking" status, and
// ProtectedRoute reacts to it once this resolves - the access token is
// never persisted (Part E.3), so every page load must re-derive the
// session from the httpOnly refresh cookie. An impersonation token in the
// URL (Part 15.2's Admin Panel hand-off) always takes priority over that -
// it's adopted directly instead, since it's already a live session.
if (!tryConsumeImpersonationToken()) {
  void bootstrapSession();
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <RouterProvider router={router} />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
