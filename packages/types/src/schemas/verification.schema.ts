import { z } from "zod";
import { PHONE_PATTERN } from "./store.schema.js";

// Per Section 11 - not every field is mandatory. Owner info and NID
// number/document are required (identity verification is the core of
// this feature); business type/address/description and trade license are
// optional ("if applicable").
export const submitVerificationSchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(200),
  phone: z.string().regex(PHONE_PATTERN, "Enter a valid phone number"),
  businessType: z.string().max(200).optional(),
  businessAddress: z.string().max(500).optional(),
  description: z.string().max(1000).optional(),
  nidNumber: z.string().min(1, "NID number is required").max(50),
  tradeLicenseNumber: z.string().max(100).optional(),
});
export type SubmitVerificationInput = z.infer<typeof submitVerificationSchema>;
