import { Router } from "express";
import { submitVerificationSchema, type SubmitVerificationInput } from "@commerceos/types";
import { asyncHandler } from "../middleware/error-handler.js";
import { validateBody } from "../middleware/validate.js";
import { uploadVerificationDocuments } from "../middleware/upload.js";
import { getVerificationByToken, submitVerification } from "../services/verification.service.js";

// Per Section 7/10 - PUBLIC, token-gated (not requireAuth). The token
// itself is the credential: it lets an owner complete verification even
// from a device/browser where they aren't logged in (e.g. opening the
// emailed link on their phone). No sensitive info ever appears in the
// URL beyond the opaque token itself.
export const verificationRouter = Router();

verificationRouter.get(
  "/:token",
  asyncHandler(async (req, res) => {
    const view = await getVerificationByToken(req.params.token);
    res.json(view);
  }),
);

type UploadedFiles = Record<"nidDocument" | "tradeLicenseDocument" | "supportingDocument", Express.Multer.File[] | undefined>;

verificationRouter.post(
  "/:token/submit",
  uploadVerificationDocuments,
  validateBody(submitVerificationSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as SubmitVerificationInput;
    const files = req.files as UploadedFiles | undefined;
    await submitVerification(req.params.token, input, {
      nidDocument: files?.nidDocument?.[0]?.buffer,
      tradeLicenseDocument: files?.tradeLicenseDocument?.[0]?.buffer,
      supportingDocument: files?.supportingDocument?.[0]?.buffer,
    });
    res.status(200).json({ message: "Verification submitted" });
  }),
);
