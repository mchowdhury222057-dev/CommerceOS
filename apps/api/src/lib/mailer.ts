import { logger } from "./logger.js";

// DEV ONLY - real email/SMS dispatch is Phase-14 scope (Part 17) and needs
// external provider infra not yet set up. This is the entire seam: swapping
// in a real provider later means changing what happens inside this one
// function (e.g. calling an email API), not touching the auth.service.ts
// callers that invoke it. For now it just logs the link to the backend
// console so the reset flow is fully testable without that infra.
export async function sendPasswordResetLink(email: string, resetLink: string): Promise<void> {
  logger.info({ msg: "Password reset link (DEV ONLY - not actually emailed)", email, resetLink });
}
