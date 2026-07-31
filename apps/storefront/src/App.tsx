import { useEffect, useState } from "react";
import { Button, StatusBadge } from "@commerceos/ui";

// Placeholder shell for the public Storefront (mobile-first per Part A.2).
// Confirms Phase 0's checkpoint: the app runs and can reach the API.
export default function App() {
  const [apiStatus, setApiStatus] = useState<"checking" | "ok" | "down">("checking");

  useEffect(() => {
    fetch("http://localhost:4000/api/health")
      .then((r) => (r.ok ? setApiStatus("ok") : setApiStatus("down")))
      .catch(() => setApiStatus("down"));
  }, []);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border-default p-4">
        <div className="text-sm font-semibold tracking-wide">Storefront</div>
      </header>
      <main className="p-4">
        <h1 className="text-2xl font-bold mb-4">Welcome</h1>
        <div className="flex items-center gap-3 mb-6">
          <span className="text-sm text-text-secondary">API status:</span>
          <StatusBadge
            tone={apiStatus === "ok" ? "success" : apiStatus === "down" ? "danger" : "neutral"}
            label={apiStatus}
          />
        </div>
        <Button variant="primary" size="lg">
          Shop Now
        </Button>
      </main>
    </div>
  );
}
