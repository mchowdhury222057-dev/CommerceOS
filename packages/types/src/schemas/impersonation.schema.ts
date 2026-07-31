import { z } from "zod";

export const startImpersonationSchema = z.object({
  reason: z.string().min(1, "A reason is required before impersonating a store").max(500),
});
export type StartImpersonationInput = z.infer<typeof startImpersonationSchema>;

export const endImpersonationSchema = z.object({
  sessionId: z.string().min(1).optional(),
});
export type EndImpersonationInput = z.infer<typeof endImpersonationSchema>;

// Per Part D.2.2 - a suspension always carries a reason; reactivation does
// not require one.
export const storeStatusSchema = z
  .object({
    status: z.enum(["ACTIVE", "SUSPENDED"]),
    reason: z.string().min(1).optional(),
  })
  .refine((value) => value.status !== "SUSPENDED" || Boolean(value.reason?.trim()), {
    message: "A suspension reason is required",
    path: ["reason"],
  });
export type StoreStatusInput = z.infer<typeof storeStatusSchema>;
