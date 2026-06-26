
import express from 'express';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import Translation from '../models/Translation.js';

const router = express.Router();

const ADMIN_EMAIL = "admin@himalingo.com";
const ADMIN_PASSWORD = "himalingo@2026**";

// Admin auth middleware
const verifyAdmin = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    if (!decoded.isAdmin) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: "Invalid token" });
  }
};

// Admin login — separate from normal user login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password required" });
    }

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { email: ADMIN_EMAIL, isAdmin: true },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "8h" }
    );

    res.json({ success: true, token });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all data
router.get("/all-data", verifyAdmin, async (req, res) => {
  try {
    const translations = await Translation.find().sort({ createdAt: -1 });
    res.json({ success: true, translations });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Sync JSON
router.post("/sync-json", verifyAdmin, async (req, res) => {
  try {
    const dataPath = path.join(process.cwd(), 'data');
    const files = fs.readdirSync(dataPath);
    const allData = [];

    files.forEach(file => {
      if (!file.endsWith('.json')) return;
      try {
        const content = JSON.parse(fs.readFileSync(path.join(dataPath, file), 'utf-8'));
        const items = Array.isArray(content) ? content : [content];
        items.forEach(item => {
          const eng = (item.english || item.English || item.text || item.question || "").trim();
          const bhu = (
            item.transliteration_bhutia ||
            item.transliteration ||
            item.bhutia ||
            item.Bhutia ||
            item.answer || ""
          ).trim();
          if (eng && bhu) {
            allData.push({
              english: eng,
              transliteration: bhu,
              language: "Bhutia"
            });
          }
        });
      } catch (e) { console.error(`Error in ${file}`); }
    });

    if (allData.length > 0) {
      await Translation.deleteMany({});
      await Translation.insertMany(allData, { ordered: false });
      return res.json({ success: true, message: `Synced ${allData.length} items!` });
    }

    res.json({ success: false, message: "No data found." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Toggle status
router.post("/toggle-status/:id", verifyAdmin, async (req, res) => {
  try {
    const item = await Translation.findById(req.params.id);
    if (item) {
      item.isChecked = !item.isChecked;
      await item.save();
      return res.json({ success: true, isChecked: item.isChecked });
    }
    res.status(404).json({ success: false, message: "Item not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete item
router.delete("/delete/:id", verifyAdmin, async (req, res) => {
  try {
    const deletedItem = await Translation.findByIdAndDelete(req.params.id);
    if (deletedItem) {
      return res.json({ success: true, message: "Item deleted successfully" });
    }
    res.status(404).json({ success: false, message: "Item not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
