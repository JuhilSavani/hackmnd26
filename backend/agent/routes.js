import express from "express";
import { streamAgent, detectIssues } from "./controllers.js";

const router = express.Router();

router.post("/stream", streamAgent);
router.post("/detect-issues", detectIssues);

export default router;
