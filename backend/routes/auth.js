import express from "express";
import User from "../models/User.js";
import { loginSchema } from "../validators/auth.validator.js";
import {validate} from "../middlewares/validator.middleware.js";

const router = express.Router();

router.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (await User.findOne({ email })) {
      return res.status(400).json({ success: false, message: "User exists" });
    }

    await new User({ email, password }).save();
    res.status(201).json({ success: true, token: "login-token" });

  } catch {
    res.status(500).json({ success: false });
  }
});

router.post("/login", validate(loginSchema),async (req, res) => {
  try {

    const {email, password} = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });

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