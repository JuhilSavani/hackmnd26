import express from "express";
import { processDocumentStream, getUserThreads, deleteThread, getThreadById } from "./controllers.js";

const router = express.Router();

/**
 * @route   POST /api/main/process
 * @desc    Process document fetching and extraction via SSE
 */
router.post("/process", processDocumentStream);

router.get("/threads", getUserThreads);
router.get("/threads/:threadId", getThreadById);
router.delete("/threads/:threadId", deleteThread);

export default router;
