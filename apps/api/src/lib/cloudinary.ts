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
