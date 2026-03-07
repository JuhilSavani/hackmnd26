import express from "express";
import { getUserThreads, deleteThread, getThreadById } from "./controllers.js";

const router = express.Router();

router.get("/", getUserThreads);
router.get("/:threadId", getThreadById);
router.delete("/:threadId", deleteThread);

export default router;
