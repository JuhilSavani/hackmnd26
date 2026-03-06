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

/**
 * Streams the document processing events using Server-Sent Events (SSE).
 * Returns an object containing the stream generator and an abort function.
 */
export function streamDocumentExtraction({ threadId, publicId, fileName, instructionsUrl }) {
  const controller = new AbortController();

  async function* generateStream() {
    try {
      // 1. Initiate Fetch Request securely, pointing to the proxy/backend
      // Use the environment variable VITE_BASE_API_ENDPOINT to match .env
      const apiUrl = import.meta.env.VITE_BASE_API_ENDPOINT || 'http://localhost:4000/api';
      
      const response = await fetch(`${apiUrl}/main/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Important: Include credentials to send the sessionCookie for authenticateJWT
        credentials: "include", 
        body: JSON.stringify({ threadId, publicId, fileName, instructionsUrl }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`Process request failed: ${response.status}`);
      if (!response.body) throw new Error("No response body received for processing stream.");

      // 2. Build the Custom SSE Parser Transformer
      const sseParser = () => new TransformStream({
        transform(chunk, controller) {
          const lines = chunk.split("\n");
          for (const line of lines) {
            // Process lines starting with "data: " and ignore the [DONE] marker
            if (line.startsWith("data: ") && !line.includes("[DONE]")) {
              try {
                // Strip the exact 6 characters of "data: "
                const json = JSON.parse(line.slice(6)); 
                controller.enqueue(json);
              } catch (e) {
                // Ignore partial/malformed chunk intersections gracefully
              }
            }
          }
        },
      });

      // 3. Pipe the processing pipeline
      const stream = response.body
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(sseParser());

      // 4. Yield parsed JSON chunks directly
      for await (const chunk of stream) {
        yield chunk;
      }

    } catch (error) {
      if (error.name !== 'AbortError') {
        yield { type: 'error', val: error.message || "Network error during extraction stream." };
      }
    }
  }

  // 5. Expose simplified UI interface
  return {
    stream: generateStream(),
    abort: () => controller.abort()
  };
}
