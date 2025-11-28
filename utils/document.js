import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadDocument(file) {
  if (!file?.buffer) {
    console.error("No file buffer available");
    return null;
  }

  try {
    // Directly pass the buffer to Cloudinary's upload_stream method
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'org-docs',
          resource_type: 'auto',  // Automatically detects file type (image, pdf, etc.)
        },
        (error, uploadResult) => {
          if (error) {
            reject(error);
          } else {
            resolve(uploadResult);
          }
        }
      ).end(file.buffer);  // End the stream with the buffer directly
    });

    console.log("Cloudinary upload result:", result);  // Log the result from Cloudinary
    return result.secure_url;
  } catch (err) {
    console.error("Cloudinary document upload error:", err);
    throw new Error("Document upload failed");
  }
}
