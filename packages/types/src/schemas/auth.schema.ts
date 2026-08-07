import { z } from "zod";

// Per SRS Part E.5 - a Zod schema is authored once here and imported by both
// a frontend form (once built) and the backend route handler (apps/api), so
// a validation rule is never duplicated and left to drift between layers.

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const redeemInviteSchema = z.object({
  token: z.string().min(1, "token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type RedeemInviteInput = z.infer<typeof redeemInviteSchema>;

// Per Part 4/20.1 - a second Master Administrator account creation path,
// gated by a shared secret (ADMIN_SETUP_KEY) rather than open signup like
// signupSchema's Store Owner path, since this role is platform-wide.
export const adminSignupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  setupKey: z.string().min(1, "Setup key is required"),
});
export type AdminSignupInput = z.infer<typeof adminSignupSchema>;

export const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1, "token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;
