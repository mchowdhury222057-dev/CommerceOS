import multer from "multer";
import { AppError } from "../lib/errors.js";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// Per Part 8.1 - memory storage (not disk) since the file only needs to
// live long enough to stream straight through to Cloudinary; nothing here
// ever touches the local filesystem.
export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new AppError(400, "INVALID_FILE_TYPE", "Only image files are accepted"));
      return;
    }
    cb(null, true);
  },
}).single("image");

// Verification documents (NID, trade license, supporting docs) - image
// scans or PDFs, same memory-storage rationale as uploadImage. The
// verification form submits up to three named files in ONE request
// (Section 10's single-page multi-step wizard submits everything at
// once), hence `.fields()` instead of `.single()` - each field is
// individually optional at the multer level; verification.service.ts's
// submitVerification() is what actually requires the NID document.
export const uploadVerificationDocuments = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 3 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/") && file.mimetype !== "application/pdf") {
      cb(new AppError(400, "INVALID_FILE_TYPE", "Only image or PDF files are accepted"));
      return;
    }
    cb(null, true);
  },
}).fields([
  { name: "nidDocument", maxCount: 1 },
  { name: "tradeLicenseDocument", maxCount: 1 },
  { name: "supportingDocument", maxCount: 1 },
]);
