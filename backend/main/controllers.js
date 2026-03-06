import cloudinary from "../configs/cloudinary.configs.js";
import { Thread } from "../models/thread.models.js";
import { extractDocument } from "../utils/extract.js";

/**
 * @route   POST /api/main/process
 * @desc    Main entry point for handling document extraction via Server-Sent Events (SSE)
 */
export const processDocumentStream = async (req, res) => {
  const { threadId, publicId, fileName, instructionsUrl } = req.body;
  const userId = req.user?.id || req.user?.userId || "anon";

  // 1. Set SSE Required Headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const controller = new AbortController();
  res.on('close', () => controller.abort());

  // Connection acknowledged
  res.write(`data: ${JSON.stringify({ type: "connection", val: "Connected to processing pipeline." })}\n\n`);

  try {
    if (!threadId || !publicId || !fileName) {
      throw new Error("Missing required fields: threadId, publicId, or fileName.");
    }

    // 2. Database validation/update
    res.write(`data: ${JSON.stringify({ type: "loading", val: "Authorizing thread access..." })}\n\n`);
    
    // We assume the thread might have been created already by the workspace UI, 
    // or we create/update it here with the newly uploaded artifacts.
    await Thread.upsert({
      threadId,
      userId,
      publicId,
      instructionsUrl
    });

    if (controller.signal.aborted) return;

    // 3. SECURE FETCH FROM CLOUDINARY
    res.write(`data: ${JSON.stringify({ type: "loading", val: "Downloading document securely from storage..." })}\n\n`);
    
    const signedUrl = cloudinary.utils.private_download_url(
      publicId, 
      "",
      {
        resource_type: "raw",   // Documents are raw
        type: "authenticated",
        expires_at: Math.floor(Date.now() / 1000) + 300, 
        attachment: false
      }
    );

    const docResponse = await fetch(signedUrl, { signal: controller.signal });

    console.log(signedUrl);
    if (!docResponse.ok) {
      throw new Error(`Cloudinary fetch failed: ${docResponse.status} ${docResponse.statusText}`);
    }

    const buffer = await docResponse.arrayBuffer();

    if (controller.signal.aborted) return;

    // 4. EXTRACTION PIPELINE
    res.write(`data: ${JSON.stringify({ type: "processing", val: "Parsing underlying file structure and metadata..." })}\n\n`);
    
    const { text, metadata } = await extractDocument(buffer, fileName);

    if (controller.signal.aborted) return;

    // 5. SERVER LOGGING
    res.write(`data: ${JSON.stringify({ type: "processing", val: "Consolidating extraction payload..." })}\n\n`);
    
    console.log(`\n================================`);
    console.log(`🟢 EXTRACTION SUCCESS: ${fileName}`);
    console.log(`Thread ID: ${threadId}`);
    console.log(`Extracted Text Length: ${text.length} chars`);
    console.log(`Extracted Text Sample (first 500 chars):\n${text.substring(0, 500)}...`);
    console.log(`\n--- Full Extracted Text ---\n${text}\n---------------------------`);
    if (metadata) {
       console.log(`Extracted Metadata Keys: ${Object.keys(metadata).join(', ')}`);
    } else {
       console.log(`Extracted Metadata: null (PDF)`);
    }
    console.log(`================================\n`);

    // 6. DB PERSISTENCE (e.g. into an Attachment table or Thread)
    // *If you add an Attachment table later, this is where \`Attachment.create({ content: text, ... })\` happens.*
    res.write(`data: ${JSON.stringify({ type: "success", status: "done", val: "Parsing finished and context initialized." })}\n\n`);

  } catch (error) {
    if (error.name === 'AbortError' || error.message === 'Abort') {
      console.log('🚫 Document Stream aborted by client');
      return;
    }
    console.error("Document Processing Error:", error);
    res.write(`data: ${JSON.stringify({ type: "error", val: error.message || "Internal server error during document processing." })}\n\n`);
  } finally {
    // 7. Signal end of stream
    res.write("data: [DONE]\n\n");
    res.end();
  }
};

/**
 * @route   GET /api/main/threads
 * @desc    Get all threads for the authenticated user
 */
export const getUserThreads = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const threads = await Thread.findAll({
      where: { userId },
      order: [['updatedAt', 'DESC']]
    });

    res.status(200).json({ threads });
  } catch (error) {
    console.error("Fetch Threads Error:", error);
    res.status(500).json({ message: "Failed to fetch threads." });
  }
};

/**
 * @route   DELETE /api/main/threads/:threadId
 * @desc    Delete a thread and its resources
 */
export const deleteThread = async (req, res) => {
  try {
    const { threadId } = req.params;
    const userId = req.user?.id || req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const thread = await Thread.findOne({ where: { threadId, userId } });
    
    if (!thread) {
      return res.status(404).json({ message: "Thread not found." });
    }

    // Optional: Delete resource from Cloudinary if needed
    // if (thread.publicId) {
    //   await cloudinary.uploader.destroy(thread.publicId);
    // }

    await thread.destroy();
    res.status(200).json({ message: "Thread deleted successfully." });
  } catch (error) {
    console.error("Delete Thread Error:", error);
    res.status(500).json({ message: "Failed to delete thread." });
  }
};

/**
 * @route   GET /api/main/threads/:threadId
 * @desc    Get details of a specific thread
 */
export const getThreadById = async (req, res) => {
  try {
    const { threadId } = req.params;
    const userId = req.user?.id || req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const thread = await Thread.findOne({ where: { threadId, userId } });
    
    if (!thread) {
      return res.status(404).json({ message: "Thread not found." });
    }

    res.status(200).json({ thread });
  } catch (error) {
    console.error("Fetch Thread Details Error:", error);
    res.status(500).json({ message: "Failed to fetch thread details." });
  }
};
