import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const uploadLatexToCloudinary = async (latexString, threadId, userId) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `hackmnd26/${userId}/documents`,
        public_id: `${threadId}_final_manuscript`, // .tex extension is automatic via format
        resource_type: "raw",       
        type: "authenticated",      
        format: "tex"
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    const buffer = Buffer.from(latexString, 'utf-8');
    uploadStream.end(buffer);
  });
};

export const generateDownloadUrl = (publicId) => {
  return cloudinary.url(publicId, {
    resource_type: 'raw',
    type: 'authenticated',
    sign_url: true,
    expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hr
  });
};

export default cloudinary;
