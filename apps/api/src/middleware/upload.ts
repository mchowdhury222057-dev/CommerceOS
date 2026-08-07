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
