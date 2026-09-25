import { Link, useParams } from "react-router-dom";
import { Mail, MapPin, Share2, ShieldCheck } from "lucide-react";
import type { FooterSettings } from "../lib/api-types";

// Bold Modern redesign - a deliberately dark footer band, independent of
// the store's own light/dark theme choice (Section 14 covers the THEME
// SYSTEM - product/nav/content colors - not this: a dark footer regardless
// of overall site theme is a near-universal e-commerce convention, not a
// bypass of per-store theming). Accent highlights still come from the
// store's own primary/accent tokens, so it stays visually tied to the rest
// of the site rather than a fixed, unrelated color.
export function Footer({ storeName, settings }: { storeName: string; settings: FooterSettings }) {
  const { storeSlug } = useParams();
  const contactEmail = settings.contactEmail || "support@example.com";

  return (
    <footer className="mt-16 bg-slate-950 text-slate-300">
      <div className="mx-auto max-w-theme px-4 py-14">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-2">
            <span className="font-heading text-xl font-bold tracking-tight text-white">{storeName}</span>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-400">
              {settings.description || `Thanks for shopping with ${storeName} — quality products, honest prices, delivered to your door.`}
            </p>
            {settings.showSocialLinks && (
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm text-slate-400">
                <Share2 size={16} aria-hidden="true" />
                Follow us
              </span>
            )}
          </div>

          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Quick Links</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to={`/${storeSlug}`} className="text-slate-400 transition-colors hover:text-white">
                  Home
                </Link>
              </li>
              <li>
                <Link to={`/${storeSlug}#products`} className="text-slate-400 transition-colors hover:text-white">
                  Shop
                </Link>
              </li>
              <li>
                <Link to={`/${storeSlug}/cart`} className="text-slate-400 transition-colors hover:text-white">
                  Cart
                </Link>
              </li>
              <li>
                <Link to={`/${storeSlug}/track-order`} className="text-slate-400 transition-colors hover:text-white">
                  Track Order
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Customer Support</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <a href={`mailto:${contactEmail}`} className="flex items-center gap-2 text-slate-400 transition-colors hover:text-white">
                  <Mail size={15} className="shrink-0 text-primary" aria-hidden="true" />
                  {contactEmail}
                </a>
              </li>
              <li className="flex items-center gap-2 text-slate-400">
                <ShieldCheck size={15} className="shrink-0 text-primary" aria-hidden="true" />
                Cash on Delivery
              </li>
              <li className="flex items-center gap-2 text-slate-400">
                <MapPin size={15} className="shrink-0 text-primary" aria-hidden="true" />
                We deliver to your door
              </li>
            </ul>
          </div>
        </div>

        <p className="mt-12 border-t border-white/10 pt-6 text-xs text-slate-500">
          © {new Date().getFullYear()} {storeName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
