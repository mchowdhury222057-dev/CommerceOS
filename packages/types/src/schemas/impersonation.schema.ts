import { z } from "zod";

export const startImpersonationSchema = z.object({
  reason: z.string().min(1, "A reason is required before impersonating a store").max(500),
});
export type StartImpersonationInput = z.infer<typeof startImpersonationSchema>;

export const endImpersonationSchema = z.object({
  sessionId: z.string().min(1).optional(),
});
export type EndImpersonationInput = z.infer<typeof endImpersonationSchema>;

// Per Part D.2.2 and this milestone's merchant verification workflow -
// SUSPENDED and REJECTED always carry a reason; APPROVED (which covers
// both a first-time approval and a post-suspension reactivation - see
// store.service.ts's approveStore) does not require one.
export const storeStatusSchema = z
  .object({
    status: z.enum(["APPROVED", "SUSPENDED", "REJECTED"]),
    reason: z.string().min(1).optional(),
  })
  .refine((value) => value.status === "APPROVED" || Boolean(value.reason?.trim()), {
    message: "A reason is required",
    path: ["reason"],
  });
export type StoreStatusInput = z.infer<typeof storeStatusSchema>;
