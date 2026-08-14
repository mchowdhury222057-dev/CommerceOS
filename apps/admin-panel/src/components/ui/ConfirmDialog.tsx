import { useState } from "react";
import { Button } from "@commerceos/ui";
import { Dialog } from "./Dialog";
import { Textarea } from "./Input";

// This app's "Alert Dialog" (per the component list) - a Dialog used
// specifically for a single confirm/cancel action, not a general-purpose
// Modal. Replaces window.confirm() throughout the app with a styled,
// on-brand dialog carrying the exact same semantics.
export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button type="button" variant={destructive ? "destructive" : "primary"} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}

export interface PromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  label: string;
  placeholder?: string;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onSubmit: (value: string) => void;
}

// Replaces window.prompt() (used by StoreManagementPage for a suspend
// reason and an impersonation reason) - same contract, a required
// free-text reason, as a real form field instead of a native browser prompt.
export function PromptDialog({
  open,
  onOpenChange,
  title,
  description,
  label,
  placeholder,
  confirmLabel = "Submit",
  destructive = false,
  loading = false,
  onSubmit,
}: PromptDialogProps) {
  const [value, setValue] = useState("");

  function handleOpenChange(next: boolean) {
    if (!next) setValue("");
    onOpenChange(next);
  }

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant={destructive ? "destructive" : "primary"} loading={loading} disabled={!value.trim()} onClick={handleSubmit}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <Textarea label={label} placeholder={placeholder} value={value} onChange={(e) => setValue(e.target.value)} rows={3} autoFocus />
    </Dialog>
  );
}
