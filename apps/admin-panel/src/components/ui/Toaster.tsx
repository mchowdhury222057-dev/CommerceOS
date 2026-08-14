import { Toaster as SonnerToaster } from "sonner";
import { useTheme } from "../../lib/theme";

export function Toaster() {
  const { theme } = useTheme();
  return (
    <SonnerToaster
      theme={theme}
      position="top-right"
      toastOptions={{
        classNames: {
          toast: "!rounded-xl !border !border-border-default !bg-surface-card !text-text-primary !shadow-popover",
          title: "!text-sm !font-medium",
          description: "!text-xs !text-text-secondary",
          success: "!border-status-success/30",
          error: "!border-status-danger/30",
          icon: "!text-current",
        },
      }}
    />
  );
}

export { toast } from "sonner";
