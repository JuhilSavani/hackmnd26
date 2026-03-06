import { v2 as cloudinary } from "cloudinary";
import { Thread } from "../models/thread.models.js";
import { extractDocument } from "../utils/extract.js";

const APP_NAME = "hackmnd26";

/**
 * @route   POST /api/upload/sign
 * @desc    Generate a Cloudinary upload signature for authenticated client-side uploads
 */
export const generateUploadSignature = (req, res) => {
  try {
    // Determine user ID from auth middleware (e.g., Passport/JWT)
    const userId = req.user.id || req.user.userId || "anon";
    // Customize folder path
    const folder = `${APP_NAME}/${userId}/docs`;
    const timestamp = Math.round(Date.now() / 1000);

    // Sign only the params that Cloudinary requires for validation.
    // The keys must match the `FormData` attributes appended on the client.
    const signature = cloudinary.utils.api_sign_request(
      { 
        folder, 
        timestamp, 
        use_filename: true, 
        unique_filename: true, 
        type: 'authenticated', 
        access_mode: 'authenticated' 
      },
      process.env.CLOUDINARY_API_SECRET
    );

    res.status(200).json({
      signature,
      timestamp,
      folder,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    });
  } catch (error) {
    console.error("Upload Signature Error:", error);
    res.status(500).json({ message: "Failed to generate upload signature." });
  }
};

