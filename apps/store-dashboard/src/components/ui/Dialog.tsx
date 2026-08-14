import * as RadixDialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

const sizeClass = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-2xl" };

// Radix supplies focus trap, Escape-to-close, and click-outside-to-close;
// AnimatePresence supplies the 160ms fade+scale (Part 22.8's motion
// tokens) on both open AND close, which Radix's own unmount alone can't
// do without this wrapper.
export function Dialog({ open, onOpenChange, title, description, children, footer, size = "md" }: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <RadixDialog.Portal forceMount>
            <RadixDialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              />
            </RadixDialog.Overlay>
            {/* Radix warns in dev if a Dialog has no accessible description;
                explicitly opting out (rather than leaving it implicit) when
                this instance genuinely has none. */}
            <RadixDialog.Content asChild forceMount aria-describedby={description ? undefined : ""}>
              <motion.div
                className={cn(
                  "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border-default bg-surface-card p-6 shadow-popover",
                  sizeClass[size],
                )}
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.16, ease: "easeInOut" }}
              >
                <div className="mb-1 flex items-start justify-between gap-4">
                  <RadixDialog.Title className="text-base font-semibold text-text-primary">{title}</RadixDialog.Title>
                  <RadixDialog.Close
                    aria-label="Close"
                    className="shrink-0 rounded-md p-1 text-text-secondary transition-colors hover:bg-surface-sunken hover:text-text-primary"
                  >
                    <X size={16} aria-hidden="true" />
                  </RadixDialog.Close>
                </div>
                {description && <RadixDialog.Description className="mb-4 text-sm text-text-secondary">{description}</RadixDialog.Description>}
                {children && <div className={description ? "" : "mt-4"}>{children}</div>}
                {footer && <div className="mt-6 flex items-center justify-end gap-2">{footer}</div>}
              </motion.div>
            </RadixDialog.Content>
          </RadixDialog.Portal>
        )}
      </AnimatePresence>
    </RadixDialog.Root>
  );
}
