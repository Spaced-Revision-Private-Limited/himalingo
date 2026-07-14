import express from "express";
import History from "../models/History.js";

const router = express.Router();

// Create a new empty chat session for the logged-in user
router.post("/session", async (req, res) => {
  try {
    const activeUserId = req.user ? req.user.id || req.user._id : null;
    if (!activeUserId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { chatId, title, mode } = req.body || {};
    if (!chatId) return res.status(400).json({ success: false, message: "chatId is required" });

    const entry = await History.findOneAndUpdate(
      { chatId, userId: activeUserId },
      {
        userId: activeUserId,
        originalText: title || "New chat",
        translatedText: JSON.stringify([]),
        mode: mode || "chat",
        updatedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, history: entry });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get all history for the logged-in user
router.get("/", async (req, res) => {
  try {
    // 💡 Security fix: pull from req.user.id directly instead of req.query.email
    const activeUserId = req.user ? req.user.id || req.user._id : null;
    if (!activeUserId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const history = await History.find({ userId: activeUserId }).sort({ updatedAt: -1 });
    res.json({ success: true, history });
  } catch (err) { 
    res.status(500).json({ success: false, error: err.message }); 
  }
});

// Delete one chat session
router.delete("/session/:chatId", async (req, res) => {
  try {
    const activeUserId = req.user ? req.user.id || req.user._id : null;
    await History.findOneAndDelete({ chatId: req.params.chatId, userId: activeUserId });
    res.json({ success: true });
  } catch { 
    res.status(500).json({ success: false }); 
  }
});

// Pin or unpin a chat session
router.patch("/session/:chatId/pin", async (req, res) => {
  try {
    const activeUserId = req.user ? req.user.id || req.user._id : null;
    const h = await History.findOne({ chatId: req.params.chatId, userId: activeUserId });
    if (!h) return res.status(404).json({ success: false });
    h.pinned = !h.pinned;
    await h.save();
    res.json({ success: true, pinned: h.pinned });
  } catch { 
    res.status(500).json({ success: false }); 
  }
});

// Delete all history for a user
router.delete("/", async (req, res) => {
  try {
    const activeUserId = req.user ? req.user.id || req.user._id : null;
    await History.deleteMany({ userId: activeUserId });
    res.json({ success: true });
  } catch { 
    res.status(500).json({ success: false }); 
  }
});

export default router;