import { v2 as cloudinary } from "cloudinary";
import fs from "fs/promises";
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log(process.env.CLOUDINARY_CLOUD_NAME)
console.log(process.env.CLOUDINARY_API_KEY)
console.log(process.env.CLOUDINARY_API_SECRET)

export async function uploadImage(file) {
  if (!file?.path) return null;

  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: "events",
      resource_type: "image",
    });

    await fs.unlink(file.path); // deletes temp file after upload
    return result.secure_url;
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    await fs.unlink(file.path).catch(() => {});
    throw new Error("Image upload failed");
  }
}

export async function updateImage(oldUrl, newFile) {
  try {
    if (oldUrl) {
      const publicId = extractPublicId(oldUrl);
      if (publicId) await cloudinary.uploader.destroy(publicId);
    }
    return await uploadImage(newFile);
  } catch (err) {
    console.error("Image update failed:", err);
    return await uploadImage(newFile);
  }
}

export async function deleteImage(imageUrl) {
  if (!imageUrl) return;
  try {
    const publicId = extractPublicId(imageUrl);
    if (publicId) await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error("Delete image failed:", err);
  }
}

function extractPublicId(url) {
  if (!url) return null;
  const parts = url.split("/");
  const last = parts[parts.length - 1];
  return `events/${last.split(".")[0]}`;
}
