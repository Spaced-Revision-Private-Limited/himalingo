const path = require("node:path");
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const fetch = require("node-fetch");
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

/* ---------------------- DATABASE ---------------------- */

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err.message));

const HistorySchema = new mongoose.Schema({
  chatId: { type: String, unique: true, required: true },
  userEmail: { type: String, required: true },
  originalText: String,
  translatedText: String,
  mode: String,
  pinned: { type: Boolean, default: false },
  updatedAt: { type: Date, default: Date.now },
});

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
});

const History = mongoose.models.History || mongoose.model("History", HistorySchema);
const User = mongoose.models.User || mongoose.model("User", UserSchema);

/* ---------------------- RAG HELPER ---------------------- */

function getLocalLanguageContext(query, lang) {
  return new Promise((resolve) => {
    try {
      const searchLang = lang.toLowerCase().trim();
      const pythonScriptPath = path.join(__dirname, "search_pinecone.py");
      
      // Determine correct python command based on OS
      const pythonCmd = process.platform === "win32" ? "python" : "python3";
      
      console.log(`[RAG] Querying Pinecone: "${query}" (${searchLang})`);

      const pythonProcess = spawn(pythonCmd, [pythonScriptPath, query, searchLang]);
      
      let stdout = '';
      let stderr = '';
      
      const timeoutId = setTimeout(() => {
        console.error(`[RAG] Python timeout - killing process`);
        pythonProcess.kill();
        resolve(null);
      }, 8000); // 8 second limit
      
      pythonProcess.stdout.on('data', (data) => stdout += data.toString());
      pythonProcess.stderr.on('data', (data) => stderr += data.toString());
      
      pythonProcess.on('close', (code) => {
        clearTimeout(timeoutId);
        const result = stdout.trim();
        
        if (code !== 0 || result === "NO_MATCH" || result.includes("ERROR")) {
          console.log(`[RAG] No match or Python error: ${stderr}`);
          resolve(null);
        } else {
          console.log(`[RAG] Success: Match found`);
          resolve(result);
        }
      });
    } catch (error) {
      console.error("[RAG ERROR]", error.message);
      resolve(null);
    }
  });
}

/* ---------------------- AI HELPER ---------------------- */

async function askAI(question, imageFile, chatHistory = [], systemInstruction = "") {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return "__API_KEY_MISSING__";

  // List of models: Pro/Paid first, then Free Fallbacks
  const models = [
    "google/gemini-2.0-flash-001", 
    "meta-llama/llama-3.3-70b-instruct:free",
    "google/gemma-3-27b-it:free" // Reliable backup
  ];

  let userContent = question;
  if (imageFile) {
    userContent = [
      { type: "text", text: question },
      { type: "image_url", image_url: { url: `data:${imageFile.mimetype};base64,${imageFile.buffer.toString("base64")}` } }
    ];
  }

  const messages = [];
  if (systemInstruction) messages.push({ role: "system", content: systemInstruction });
  
  chatHistory.forEach(m => {
    messages.push({ role: m.role === "ai" ? "assistant" : "user", content: m.content });
  });
  messages.push({ role: "user", content: userContent });

  for (const modelId of models) {
    try {
      console.log(`[AI] Attempting ${modelId}...`);
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000", 
          "X-Title": "Himalingo"
        },
        body: JSON.stringify({ model: modelId, messages, temperature: 0.2 }) 
      });

      const data = await response.json();
      
      if (data.choices?.[0]?.message?.content) {
        return data.choices[0].message.content;
      } else if (data.error) {
        console.error(`[AI] Model ${modelId} error:`, data.error.message);
      }
    } catch (e) {
      console.error(`[AI] Model ${modelId} failed fetch:`, e.message);
    }
  }
  return "__AI_SERVICE_UNAVAILABLE__";
}

/* ---------------------- ROUTES ---------------------- */

// Auth
app.post("/api/signup", async (req, res) => {
  try {
    const { email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: "User exists" });
    await new User({ email, password }).save();
    res.json({ success: true, token: "login-token" });
  } catch (err) { res.status(500).json({ success: false }); }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });
    if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });
    res.json({ success: true, token: "login-token" });
  } catch (err) { res.status(500).json({ success: false }); }
});

// Translation with RAG logic
app.post('/translate', upload.single("image"), async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;
    let context = "";
    
    // Check if it's a priority native language
    const priorityLangs = ["Bhutia", "Lepcha", "Limbu", "Magar", "Rai"];
    
    if (priorityLangs.includes(targetLanguage)) {
      context = await getLocalLanguageContext(text, targetLanguage);
    }

    let systemInstruction = `You are a translator for ${targetLanguage}.`;
    if (context) {
      systemInstruction += `\nCRITICAL: Use ONLY this verified translation data: ${context}. Output ONLY the English transliteration (e.g. "Tashi Delek"). No native scripts.`;
    } else {
      systemInstruction += `\nOutput ONLY the translated text in English letters (transliteration). No quotes.`;
    }

    const aiResult = await askAI(text, req.file, [], systemInstruction);
    
    if (aiResult === "__AI_SERVICE_UNAVAILABLE__" || aiResult === "__API_KEY_MISSING__") {
      return res.json({ success: true, translated: "Translation service currently unavailable. Please try again later." });
    }

    // Sanitize output
    const finalResult = aiResult.replace(/[".!]/g, "").trim();
    res.json({ success: true, translated: finalResult });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// History & Chat Management
app.post("/chat", upload.single("image"), async (req, res) => {
  try {
    const { text, history } = req.body;
    const parsedHistory = typeof history === "string" ? JSON.parse(history) : (history || []);
    const result = await askAI(text || "Hello", req.file, parsedHistory, "You are Himalingo, a helpful assistant.");
    
    if (result.includes("__AI_")) {
      return res.json({ success: true, response: "I'm having trouble connecting to my brain. Check back in a minute!" });
    }
    res.json({ success: true, response: result });
  } catch (err) { res.status(500).json({ success: false }); }
});

app.post("/history/save-session", async (req, res) => {
  try {
    const { email, chatId, firstQuery, finalResult, mode } = req.body;
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
  } catch (err) { res.status(500).json({ success: false }); }
});

app.get("/history", async (req, res) => {
  try {
    const history = await History.find({ userEmail: req.query.email }).sort({ updatedAt: -1 });
    res.json({ success: true, history });
  } catch (err) { res.status(500).json({ success: false }); }
});

app.delete("/history/session/:chatId", async (req, res) => {
  try {
    await History.findOneAndDelete({ chatId: req.params.chatId, userEmail: req.query.email });
    res.json({ success: true });
  } catch { res.status(500).json({ success: false }); }
});

app.patch("/history/session/:chatId/pin", async (req, res) => {
  try {
    const history = await History.findOne({ chatId: req.params.chatId, userEmail: req.query.email });
    if (history) {
      history.pinned = !history.pinned;
      await history.save();
      res.json({ success: true, pinned: history.pinned });
    } else {
      res.status(404).json({ success: false });
    }
  } catch (err) { res.status(500).json({ success: false }); }
});

app.delete("/history", async (req, res) => {
  try {
    await History.deleteMany({ userEmail: req.query.email });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false }); }
});

app.get("/test-ai", async (req, res) => {
  const result = await askAI("Respond with 'READY'", null, [], "Test system.");
  res.json({ 
    success: !result.includes("__AI_"), 
    status: result, 
    apiKeySet: !!process.env.OPENROUTER_API_KEY 
  });
});

app.listen(PORT, () => console.log(`🚀 Himalingo Server running on port ${PORT}`));