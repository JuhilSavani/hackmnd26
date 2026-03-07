import express from "express";
import { processDocumentStream, finalizeDocument } from "./controllers.js";

const router = express.Router();

/**
 * @route   POST /api/document/process
 * @desc    Process document fetching and extraction via SSE
 */
router.post("/process", processDocumentStream);

/**
 * @route   GET /api/document/finalize/:threadId
 * @desc    Fetch LangGraph state, upload to Cloudinary (if first time), and return signed URL
 */
router.get("/finalize/:threadId", finalizeDocument);

export default router;
