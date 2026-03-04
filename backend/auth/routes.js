import { Router } from "express";
import { login, register, logout, googleCallback } from "./controllers.js";
import { authenticateJWT } from "../configs/passport.configs.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/google/callback", googleCallback);
router.post("/logout", logout);
router.get("/me", authenticateJWT, (req, res) => {
  res.status(200).json({ isAuthenticated: true, user: req.user });
});

export default router;