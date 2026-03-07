import express from "express";
import { streamAgent } from "./controllers.js";

const router = express.Router();

router.post("/stream", streamAgent);

export default router;
