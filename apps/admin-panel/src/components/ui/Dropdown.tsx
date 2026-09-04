import * as RadixDropdown from "@radix-ui/react-dropdown-menu";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export const DropdownRoot = RadixDropdown.Root;
export const DropdownTrigger = RadixDropdown.Trigger;

export function DropdownContent({
  children,
  align = "end",
  className,
}: {
  children: ReactNode;
  align?: "start" | "center" | "end";
  className?: string;
}) {
  return (
    <RadixDropdown.Portal>
      <RadixDropdown.Content
        align={align}
        sideOffset={8}
        className={cn(
          "z-50 min-w-[12rem] rounded-lg border border-border-default bg-surface-card p-1.5 shadow-popover",
          "data-[state=open]:animate-panel-in",
          className,
        )}
      >
        {children}
      </RadixDropdown.Content>
    </RadixDropdown.Portal>
  );
}

export function DropdownItem({
  children,
  onSelect,
  destructive = false,
  className,
}: {
  children: ReactNode;
  onSelect?: () => void;
  destructive?: boolean;
  className?: string;
}) {
  return (
    <RadixDropdown.Item
      onSelect={onSelect}
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-sm outline-none transition-colors",
        destructive ? "text-status-danger hover:bg-status-danger/10" : "text-text-primary hover:bg-surface-sunken",
        "focus:bg-surface-sunken",
        className,
      )}
    >
      {children}
    </RadixDropdown.Item>
  );
}

export function DropdownSeparator() {
  return <RadixDropdown.Separator className="my-1.5 h-px bg-border-default" />;
}

export function DropdownLabel({ children }: { children: ReactNode }) {
  return <RadixDropdown.Label className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-text-secondary">{children}</RadixDropdown.Label>;
}
