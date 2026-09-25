// Only whitelisted in-store destinations - a ?redirect= value is never used
// as a raw URL, so sign-in can't be turned into an open redirect.
export function redirectTarget(storeSlug: string, redirect: string | null): string {
  return redirect === "checkout" ? `/${storeSlug}/checkout` : `/${storeSlug}/account`;
}
