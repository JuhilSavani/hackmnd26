import express from "express";
import { generateUploadSignature } from "./controllers.js";

const router = express.Router();

/**
 * @route   POST /api/upload/sign
 * @desc    Generate a signed upload params for Cloudinary
 */
router.post("/sign", generateUploadSignature);

export default router;
