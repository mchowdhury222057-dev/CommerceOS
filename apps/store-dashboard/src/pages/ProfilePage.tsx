import { useQuery } from "@tanstack/react-query";
import { LogOut, Mail, Shield, Store } from "lucide-react";
import { Button } from "@commerceos/ui";
import { getMyStore } from "../api/store";
import { logout } from "../api/auth";
import { useAuthStore } from "../stores/auth.store";
import { SectionHeader } from "../components/ui/SectionHeader";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";

const ROLE_LABEL: Record<string, string> = {
  STORE_OWNER: "Store Owner",
  STORE_MANAGER: "Store Manager",
  INVENTORY_MANAGER: "Inventory Manager",
  ORDER_MANAGER: "Order Manager",
  CUSTOMER_SUPPORT: "Customer Support",
};

// Sourced entirely from data already available client-side (the auth store)
// or already fetched elsewhere (getMyStore) - no new backend endpoint.
export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const storeQuery = useQuery({ queryKey: ["my-store", user?.storeId], queryFn: () => getMyStore(user!.storeId as string), enabled: Boolean(user?.storeId) });

  async function handleLogout() {
    try {
      await logout();
    } finally {
      clear();
    }
  }

  if (!user) return null;

  return (
    <div>
      <SectionHeader title="Profile" description="Your account details." />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="mb-6 flex items-center gap-4">
            <Avatar name={user.email} size="lg" />
            <div>
              <div className="text-base font-semibold text-text-primary">{user.email}</div>
              <Badge tone="primary" size="sm">
                {ROLE_LABEL[user.role] ?? user.role}
              </Badge>
            </div>
          </div>

          <div className="space-y-4">
            <ProfileRow icon={<Mail size={16} aria-hidden="true" />} label="Email" value={user.email} />
            <ProfileRow icon={<Shield size={16} aria-hidden="true" />} label="Role" value={ROLE_LABEL[user.role] ?? user.role} />
            {storeQuery.data && <ProfileRow icon={<Store size={16} aria-hidden="true" />} label="Store" value={storeQuery.data.store.name} />}
          </div>

          <div className="mt-6 border-t border-border-default pt-6">
            <Button variant="destructive" onClick={handleLogout}>
              <LogOut size={14} aria-hidden="true" />
              Sign out
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function ProfileRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border-default pb-3 last:border-b-0 last:pb-0">
      <span className="flex items-center gap-2 text-sm text-text-secondary">
        {icon}
        {label}
      </span>
      <span className="text-sm font-medium text-text-primary">{value}</span>
    </div>
  );
}
