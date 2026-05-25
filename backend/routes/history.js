// routes/history.js — handles all /history endpoints
import express from "express";
import History from "../models/History.js";

const router = express.Router();

// Save or update a chat session
router.post("/save-session", async (req, res) => {
  try {
    const { chatId, firstQuery, finalResult, mode } = req.body;
    await History.findOneAndUpdate(
      { chatId },
      {
        userEmail: email,
        $setOnInsert: { originalText: firstQuery || "New Chat" },
        $set: {
          translatedText: typeof finalResult === "string" ? finalResult : JSON.stringify(finalResult),
          mode: mode || "chat",
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
    res.json({ success: true });
  } catch { res.status(500).json({ success: false }); }
});

// Get all history for a user
router.get("/", async (req, res) => {
  try {
    const history = await History.find({ userEmail: req.query.email }).sort({ updatedAt: -1 });
    res.json({ success: true, history });
  } catch { res.status(500).json({ success: false }); }
});

// Delete one chat session
router.delete("/session/:chatId", async (req, res) => {
  try {
    await History.findOneAndDelete({ chatId: req.params.chatId, userEmail: req.query.email });
    res.json({ success: true });
  } catch { res.status(500).json({ success: false }); }
});

// Pin or unpin a chat session
router.patch("/session/:chatId/pin", async (req, res) => {
  try {
    const h = await History.findOne({ chatId: req.params.chatId, userEmail: req.query.email });
    if (!h) return res.status(404).json({ success: false });
    h.pinned = !h.pinned;
    await h.save();
    res.json({ success: true, pinned: h.pinned });
  } catch { res.status(500).json({ success: false }); }
});

// Delete all history for a user
router.delete("/", async (req, res) => {
  try {
    await History.deleteMany({ userEmail: req.query.email });
    res.json({ success: true });
  } catch { res.status(500).json({ success: false }); }
});

export default router;