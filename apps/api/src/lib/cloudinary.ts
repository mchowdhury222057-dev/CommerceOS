import { Readable } from "node:stream";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

// The SDK reads CLOUDINARY_URL (cloudinary://api_key:api_secret@cloud_name)
// from the environment automatically - no manual parsing needed, this call
// just forces secure (https) delivery URLs.
cloudinary.config({ secure: true });

export { cloudinary };

// multer's memoryStorage gives a Buffer, but the SDK's simple `upload()`
// wants a file path or data URI - upload_stream is the documented way to
// send a Buffer directly, wrapped in a Promise since it's callback-based.
export function uploadImageBuffer(buffer: Buffer, folder: string): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream({ folder, resource_type: "image" }, (error, result) => {
      if (error || !result) {
        reject(error ?? new Error("Cloudinary upload returned no result"));
        return;
      }
      resolve(result);
    });
    Readable.from(buffer).pipe(uploadStream);
  });
}

// PRIVATE DELIVERY - verification documents (NID, trade license) are
// sensitive and must NOT be reachable the same way product images are.
// `type: "authenticated"` tells Cloudinary to reject any request for this
// asset that isn't signed; there is no public delivery URL for it at all,
// unlike uploadImageBuffer's product photos. `resource_type: "auto"` lets
// the same function accept both image scans and PDFs (verification docs
// can be either - see middleware/upload.ts's uploadDocument).
export function uploadPrivateDocumentBuffer(buffer: Buffer, folder: string): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "auto", type: "authenticated" },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload returned no result"));
          return;
        }
        resolve(result);
      },
    );
    Readable.from(buffer).pipe(uploadStream);
  });
}

// Generates a short-lived signed URL for a private document, on demand,
// server-side only - never persisted. Only ever called from the
// Master-Admin-only verification review endpoint (verification.routes.ts);
// a Store Owner views their own submitted documents through the same
// signed-URL mechanism, generated fresh per request, never a stored link.
export function getSignedDocumentUrl(publicId: string, resourceType: "image" | "raw" | "video" = "image"): string {
  // Empty format - the stored asset's own format is served as-is; this
  // isn't requesting a transformation/conversion, just a signed link to
  // the exact bytes uploadPrivateDocumentBuffer stored.
  return cloudinary.utils.private_download_url(publicId, "", {
    resource_type: resourceType,
    type: "authenticated",
    expires_at: Math.floor(Date.now() / 1000) + 5 * 60, // 5 minutes
  });
}
