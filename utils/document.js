import { v2 as cloudinary } from "cloudinary";
import fs from "fs/promises";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads PDF or image to Cloudinary inside folder: org-docs
 * Returns secure_url
 */
export async function uploadDocument(file) {
  if (!file?.path) return null;

  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: "org-docs",
      resource_type: "auto",
    });

    await fs.unlink(file.path);
    return result.secure_url;
  } catch (err) {
    console.error("Cloudinary document upload error:", err);
    await fs.unlink(file.path).catch(() => {});
    throw new Error("Document upload failed");
  }
}
