import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@commerceos/ui";
import { endImpersonation, getActiveImpersonationSession } from "../api/impersonation";

// Per SRS Part 15.2 - persistent, unmissable, on every page, for the entire
// duration of a session. Polled rather than pushed (no WebSocket in this
// milestone) so the banner also correctly disappears if the session's
// server-side TTL expires without an explicit End Session click.
export function ImpersonationBanner() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["impersonation", "active"],
    queryFn: getActiveImpersonationSession,
    refetchInterval: 15_000,
  });

  const session = data?.session;
  if (!session) return null;

  async function handleEndSession() {
    if (!session) return;
    await endImpersonation(session.id);
    await queryClient.invalidateQueries({ queryKey: ["impersonation", "active"] });
  }

  return (
    <div
      role="status"
      className="flex items-center justify-between gap-4 bg-amber-impersonation px-6 py-3 text-sm font-medium text-text-primary"
    >
      <span>
        Editing as Master Admin — <strong>{session.targetStore?.name ?? session.targetStoreId}</strong>
        {session.reason ? <span className="font-normal opacity-80"> · {session.reason}</span> : null}
      </span>
      <Button variant="secondary" size="sm" onClick={handleEndSession}>
        End Session
      </Button>
    </div>
  );
}
