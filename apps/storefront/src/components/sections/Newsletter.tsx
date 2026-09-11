import { useState } from "react";
import type { FormEvent } from "react";
import { Mail } from "lucide-react";
import { Button } from "@commerceos/ui";
import type { NewsletterSectionSettings } from "../../lib/api-types";

// Per Section 17 - visual only, no email is actually sent/stored this
// milestone ("does NOT need to actually send emails... a simple success
// message" is the explicit spec).
export function Newsletter({ settings }: { settings: NewsletterSectionSettings }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
  }

  return (
    <section className="mx-auto max-w-theme px-4" style={{ paddingBlock: "var(--theme-section-spacing)" }}>
      <div
        className="relative flex flex-col items-center gap-4 overflow-hidden bg-primary-subtle px-6 py-14 text-center sm:py-16"
        style={{ borderRadius: "var(--radius-lg)" }}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-accent/10 blur-3xl"
          aria-hidden="true"
        />
        <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-white shadow-md" aria-hidden="true">
          <Mail size={19} />
        </span>
        <h2 className="relative font-heading text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">{settings.heading}</h2>
        {settings.subheading && <p className="relative max-w-md text-sm text-text-secondary">{settings.subheading}</p>}

        {submitted ? (
          <p className="relative text-sm font-medium text-primary">Thanks for subscribing!</p>
        ) : (
          <form onSubmit={handleSubmit} className="relative mt-2 flex w-full max-w-sm flex-col gap-2 sm:flex-row">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full flex-1 border border-border-default bg-surface-card px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-disabled focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              style={{ borderRadius: "var(--theme-button-radius)" }}
            />
            <Button type="submit" variant="primary">
              Subscribe
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
