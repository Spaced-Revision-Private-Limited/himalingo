import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { loginSchema, signUpSchema } from "../validators/auth.validator.js";
import { validate } from "../middlewares/validator.middleware.js";
const router = express.Router();

// helper to set the refresh cookie consistently
function setRefreshCookie(res, token) {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: isProduction,               // only require HTTPS in production
    sameSite: isProduction ? "strict" : "lax", // "lax" is more forgiving for localhost
    maxAge: 7 * 24 * 60 * 60 * 1000,    // 7 days
  });
}

// 1. SIGNUP ROUTE
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    if (await User.findOne({ email: normalizedEmail })) {
      return res.status(400).json({ success: false, message: "User exists" });
    }
    const user = new User({ name: name || "Admin Staff", email: normalizedEmail, password });
    await user.save();

    const token = user.generateJwtToken();
    const refreshToken = user.generateRefreshToken();
    setRefreshCookie(res, refreshToken);

    res.status(201).json({ success: true, token });
  } catch (err) {
    console.error("Signup Error:", err);
    res.status(500).json({ success: false, message: "Server error during registration" });
  }
});

// 2. LOGIN ROUTE — logic untouched, just added refresh token issuance
router.post("/login", validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = user.generateJwtToken();
    const refreshToken = user.generateRefreshToken();
    setRefreshCookie(res, refreshToken);

    res.status(200).json({ success: true, token });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

// 3. REFRESH ROUTE — new
router.post("/refresh", async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: "No refresh token" });
    }

    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ success: false, message: "Invalid or expired refresh token" });
      }
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      const newAccessToken = user.generateJwtToken();
      res.status(200).json({ success: true, token: newAccessToken });
    });
  } catch (err) {
    console.error("Refresh Error:", err);
    res.status(500).json({ success: false, message: "Server error during refresh" });
  }
});

// 4. LOGOUT ROUTE — new, clears the cookie
router.post("/logout", (req, res) => {
  const isProduction = process.env.NODE_ENV === "production";
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
  });
  res.status(200).json({ success: true, message: "Logged out" });
});

export default router;