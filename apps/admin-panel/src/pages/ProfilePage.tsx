import { useState } from "react";
import { KeyRound, LogOut, Mail, Shield } from "lucide-react";
import { Button } from "@commerceos/ui";
import { logout, requestPasswordReset } from "../api/auth";
import { useAuthStore } from "../stores/auth.store";
import { toast } from "../components/ui/Toaster";
import { ApiError } from "../lib/api-client";
import { SectionHeader } from "../components/ui/SectionHeader";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";

// This page (and a "change password while logged in" endpoint) didn't
// exist anywhere in this codebase before this milestone - checked before
// building. What's real and already built is the dev-mode password-reset
// link flow (reused for both Store Owners and Master Admins, role-aware
// since two milestones ago). "Change Password" here reuses that exact
// flow rather than a fake "enter your current password" form against an
// endpoint that doesn't exist.
export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      clear();
    }
  }

  async function handleRequestReset() {
    if (!user) return;
    setSending(true);
    try {
      const result = await requestPasswordReset(user.email);
      setResetLink(result.resetLink ?? null);
      toast.success("Reset link generated");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not generate a reset link");
    } finally {
      setSending(false);
    }
  }

  if (!user) return null;

  return (
    <div>
      <SectionHeader title="Profile" description="Your Master Administrator account." />

      <Card className="mb-6 max-w-2xl">
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="mb-6 flex items-center gap-4">
            <Avatar name={user.email} size="lg" />
            <div>
              <div className="text-base font-semibold text-text-primary">{user.email}</div>
              <Badge tone="primary" size="sm">
                Master Administrator
              </Badge>
            </div>
          </div>

          <div className="space-y-4">
            <ProfileRow icon={<Mail size={16} aria-hidden="true" />} label="Email" value={user.email} />
            <ProfileRow icon={<Shield size={16} aria-hidden="true" />} label="Role" value="Master Administrator" />
          </div>

          <div className="mt-6 border-t border-border-default pt-6">
            <Button variant="destructive" onClick={handleLogout}>
              <LogOut size={14} aria-hidden="true" />
              Sign out
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardBody>
          {resetLink ? (
            <div className="rounded-lg border border-dashed border-amber-400 bg-amber-50 p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">Dev Mode — no email sending yet</p>
              <p className="mb-2 text-xs text-amber-800">In production this link would be emailed to you. For now, use it directly:</p>
              <a href={resetLink} className="break-all text-xs font-medium text-amber-900 underline hover:no-underline">
                {resetLink}
              </a>
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-text-secondary">
                We'll generate a password reset link for <span className="font-medium text-text-primary">{user.email}</span>, the same flow used for
                self-service resets.
              </p>
              <Button variant="secondary" loading={sending} onClick={handleRequestReset}>
                <KeyRound size={14} aria-hidden="true" />
                Send me a reset link
              </Button>
            </>
          )}
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
