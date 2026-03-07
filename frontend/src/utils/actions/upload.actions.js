import axios from "../axios.js";

/**
 * Uploads a PDF (or any file) to Cloudinary using signed upload.
 * 
 * Flow:
 * 1. Request a signature from our backend
 * 2. Upload directly to Cloudinary using that signature
 * 
 * @param {File} file - The file to upload
 * @returns {Promise<{secure_url, public_id, ...}>} Cloudinary response
 */
export async function uploadPdfToCloudinary(file) {
  // 1. Get signature from our backend
  const { data: signData } = await axios.post("/upload/sign");
  const { signature, timestamp, folder, apiKey, cloudName } = signData;

  // 2. Build FormData for Cloudinary's upload API
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", timestamp);
  formData.append("signature", signature);
  formData.append("folder", folder);
  
  // These must perfectly match the signed params in the backend
  formData.append("use_filename", "true");
  formData.append("unique_filename", "true");
  formData.append("type", "authenticated");
  formData.append("access_mode", "authenticated");

  // 3. Upload directly to Cloudinary
  // Note: Use "/raw/upload" for non-image/video files like PDFs. 
  // Change "raw" to "image" or "video" appropriately based on file type.
  const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`;

  const response = await fetch(cloudinaryUrl, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Cloudinary upload failed (${response.status})`);
  }

  return response.json();
}

