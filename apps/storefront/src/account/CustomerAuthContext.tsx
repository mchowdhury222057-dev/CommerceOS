import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { CustomerAccount, CustomerAuthResult } from "../lib/api-types";

interface CustomerSession {
  token: string;
  customer: CustomerAccount;
}

interface CustomerAuthValue {
  customer: CustomerAccount | null;
  token: string | null;
  signIn: (result: CustomerAuthResult) => void;
  signOut: () => void;
}

const CustomerAuthContext = createContext<CustomerAuthValue | null>(null);

// One session per store: a customer account belongs to a single store (the
// backend rejects a token on any other store's URLs), so the saved session
// is keyed by store slug and never leaks into another store's pages.
function storageKey(storeSlug: string) {
  return `commerceos-customer:${storeSlug}`;
}

function readSession(storeSlug: string): CustomerSession | null {
  try {
    const raw = localStorage.getItem(storageKey(storeSlug));
    return raw ? (JSON.parse(raw) as CustomerSession) : null;
  } catch {
    return null;
  }
}

export function CustomerAuthProvider({ storeSlug, children }: { storeSlug: string; children: ReactNode }) {
  const [session, setSession] = useState<CustomerSession | null>(() => readSession(storeSlug));
  const [trackedSlug, setTrackedSlug] = useState(storeSlug);

  if (trackedSlug !== storeSlug) {
    setTrackedSlug(storeSlug);
    setSession(readSession(storeSlug));
  }

  const signIn = useCallback(
    (result: CustomerAuthResult) => {
      const next = { token: result.token, customer: result.customer };
      setSession(next);
      try {
        localStorage.setItem(storageKey(storeSlug), JSON.stringify(next));
      } catch {
        // Storage blocked (private mode etc.) - session still works for this tab.
      }
    },
    [storeSlug],
  );

  const signOut = useCallback(() => {
    setSession(null);
    try {
      localStorage.removeItem(storageKey(storeSlug));
    } catch {
      // ignore
    }
  }, [storeSlug]);

  const value = useMemo(
    () => ({ customer: session?.customer ?? null, token: session?.token ?? null, signIn, signOut }),
    [session, signIn, signOut],
  );

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}

export function useCustomerAuth(): CustomerAuthValue {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error("useCustomerAuth must be used within a CustomerAuthProvider");
  return ctx;
}
