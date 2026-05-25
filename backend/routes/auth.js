import express from "express";
import User from "../models/User.js";
import { loginSchema, signUpSchema } from "../validators/auth.validator.js";
import { validate } from "../middlewares/validator.middleware.js";

const router = express.Router();

// 1. SIGNUP ROUTE
router.post("/signup", validate(signUpSchema), async (req, res) => {
  try {
    // If your schema includes 'name', extract it here to save it!
    const { name, email, password } = req.body; 
    
    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists using the normalized email
    if (await User.findOne({ email: normalizedEmail })) {
      return res.status(400).json({ success: false, message: "User exists" });
    }

    // Save user with the normalized email
    await new User({ name, email: normalizedEmail, password }).save();
    res.status(201).json({ success: true, token: "login-token" });

  } catch (err) {
    console.error("Signup Error:", err);
    res.status(500).json({ success: false, message: "Server error during registration" });
  }
});

// 2. LOGIN ROUTE
router.post("/login", validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Normalize email to match what was saved during signup
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    res.status(200).json({ success: true, token: "login-token" });

  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

export default router;