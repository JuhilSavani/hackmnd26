import crypto from "crypto";
import jwt from "jsonwebtoken";
import { fn, col, where } from "sequelize";
import { User } from "../models/user.models.js";
import { supabase } from "../clients/supabase.clients.js";
import { oauth2Client } from "../clients/googleoauth2.clients.js";

const IS_PRODUCTION = process.env.NODE_ENV !== "development";
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "7d";

const signSessionCookie = (userId) => jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

const sessionCookieOpt =  {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: IS_PRODUCTION ? "None" : "Lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
}

export const register = async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) 
    return res.status(400).json({
      message: "Please provide all registration details.",
    });

  try {    
    // Check username uniqueness (case-insensitive)
    const existingUser = await User.findOne({
      where: where(fn("LOWER", col("username")), "=", username.toLowerCase()),
    });

    if (existingUser) 
      return res.status(409).json({ message: "Username already taken." });

    // Check email uniqueness
    const existingEmail = await User.findOne({
      where: where(fn("LOWER", col("email")), "=", email.toLowerCase()),
    });

    if (existingEmail)
      return res.status(409).json({ message: "An account with this email already exists." });

    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,   
      options: { emailRedirectTo: `${process.env.APP_ORIGIN_URL || "http://localhost:3000"}/login` }
    });

    if (error || !data.user) 
      return res.status(400).json({ message: error?.message || "Signup failed." });

    await User.create({
      id: data.user.id,
      username: username.toLowerCase(),
      email
    });

    // Created — user still needs to verify email before logging in
    res.status(201).json({ message: "User registered. Please verify your email." }); 
  } catch (error) {
    console.error(error.stack);
    return res
      .status(500)
      .json({ message: "Server error. Please try again later." });
  }
};

export const login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({
      message: "Please, provide complete credentials to login.",
    });
  try {
    const user = await User.findOne({
      where: where(fn("LOWER", col("username")), "=", username.toLowerCase()),
    });

    if (!user) 
      return res.status(404).json({ message: "User not found." });

    // Supabase verifies the password
    const { data, error } = await supabase.auth.signInWithPassword({ email: user.email, password });
    
    if (error?.message === "Email not confirmed")
      return res.status(401).json({ message: "Please verify your email first." });

    if (error || !data.session) 
      return res.status(401).json({ message: "Invalid credentials." });
  
    // Sign our own JWT and set it as the auth cookie
    const sessionCookie = signSessionCookie(user.id);
    res.cookie("sessionCookie", sessionCookie, sessionCookieOpt)

    return res.status(200).json({ 
      isAuthenticated: true,  
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt
      }, 
    }); 
  } catch (error) {
    console.error(error.stack);
    return res
      .status(500)
      .json({ message: "Server error. Please try again later." });
  }
};

export const googleCallback = async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).json({ message: "No code provided." });

  try {
    // 🔑 Exchange authorization code for Google tokens
    const { tokens: { id_token } } = await oauth2Client.getToken(code);

    // 🔑 Sign in with Supabase using the Google ID token
    // This returns a Supabase session whose access_token is a valid
    // Supabase JWT — verifiable by the existing authenticateJWT middleware.
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: id_token,
    });

    if (error || !data.session)
      return res.status(401).json({ message: error?.message || "Google sign-in failed." });

    // 🗄️ Upsert user in local DB (ensures username exists for new Google users)
    const supabaseUser = data.user;
    let user = await User.findByPk(supabaseUser.id);

    if (!user) {
      const name = supabaseUser.user_metadata?.full_name || supabaseUser.email.split("@")[0];
      const base = name.replace(/\s+/g, "_").toLowerCase();
      const shortId = crypto.createHash("md5").update(supabaseUser.id).digest("hex").slice(0, 6);
      const username = `${base}_${shortId}`;

      user = await User.create({
        id: supabaseUser.id,
        username,
        email: supabaseUser.email,
        oauthProviders: ["google"],
      });
    } else if (!user.oauthProviders.includes("google")) {
      user.oauthProviders = [...user.oauthProviders, "google"];
      await user.save();
    }

    // 🍪 Sign our own JWT and set it as the auth cookie
    const sessionCookie = signSessionCookie(user.id);
    res.cookie("sessionCookie", sessionCookie, sessionCookieOpt)

    // ↩️ Redirect back to the client app
    res.redirect(process.env.APP_ORIGIN_URL || "http://localhost:3000");
  } catch (error) {
    console.error(error.stack);
    res.status(500).json({ message: "Google sign-in failed. Please try again." });
  }
};

export const logout = (req, res) => {
  res.clearCookie("sessionCookie", {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: IS_PRODUCTION ? "None" : "Lax",
  });
  return res.sendStatus(204);
};
