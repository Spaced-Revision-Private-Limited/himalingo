import express from "express";
import multer from "multer";
import Joi from "joi"; // 👈 1. Import Joi at the top
import { getRagContext } from "../services/ragService.js";
import { askAI } from "../services/aiService.js";
import History from "../models/History.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// ── 🛡️ JOI VALIDATION SCHEMA ──────────────────────────────────────────────

const translateSchema = Joi.object({
  text: Joi.string().trim().min(1).max(1000).required().messages({
    "string.empty": "Please enter some text to translate.",
    "string.min": "Please enter some text to translate.",
    "string.max": "Translation text cannot exceed 1000 characters.",
    "any.required": "Translation text is required."
  }),
  chatId: Joi.string().required(),
  mode: Joi.string().valid("chat", "translate").required(),
  history: Joi.string().allow(""),
  targetLanguage: Joi.string().valid("Bhutia", "Lepcha", "Nepali").optional() // Optional structural fallback
});

// ── Helpers ───────────────────────────────────────────────────────────────

function isEcho(result, query) {
  const r = result.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  const q = query.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  return r === q || r.includes(q) || q.includes(r);
}

function hasEnglish(result) {
  const commonEnglish = ["the","is","are","you","how","what","good","morning","thank","hello","please","yes","no","my","name","water","food","mother","father","sister","brother","life","earth","heaven"];
  const words = result.toLowerCase().split(" ");
  return words.some(w => commonEnglish.includes(w));
}

function cleanOutput(text) {
  return text
    .split("\n")[0]
    .replace(/.*is translated as:?/gi, "")
    .replace(/.*can be translated as:?/gi, "")
    .replace(/.*in bhutia.*is:?/gi, "")
    .replace(/.*transliteration.*is:?/gi, "")
    .replace(/^[\d\.\-\*\•]+\s*/, "")
    .replace(/["'""''`]/g, "")
    .trim();
}

// ── Route ─────────────────────────────────────────────────────────────────

// ⚠️ NOTE: Make sure your auth/protect middleware is added here so req.user exists!
// 👈 2. Add the Joi validation handler inline before your main translation logic block
router.post("/", upload.single("image"), async (req, res, next) => {
  // Validate incoming fields from req.body against schema rules
  const { error } = translateSchema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const errorMessages = error.details.map(detail => detail.message).join(", ");
    return res.status(400).json({ success: false, error: errorMessages });
  }

  // ── Block Tibetan/Bhutia script loops ──
  // Checks for unicode block values \u0F00–\u0FFF covering Tibetan/Bhutia scripts
  if (req.body.text && /[\u0F00-\u0FFF]/.test(req.body.text)) {
    return res.status(400).json({ 
      success: false, 
      error: "The source text is already written in Bhutia script." 
    });
  }

  next();
}, async (req, res) => {
  try {
    const { text, chatId, history, mode } = req.body;

    // 1. Clean query
    const cleanQuery = text
      .replace(/translate|to bhutia|into bhutia|in bhutia|what is|how is|say|word/gi, "")
      .replace(/['"?.!,]/g, "")
      .trim();

    console.log(`\n[Translate] Query: "${text}" → cleaned: "${cleanQuery}"`);

    // 2. Search Pinecone
    const ragResult  = await getRagContext(cleanQuery, "Bhutia");
    const ragContext = ragResult && ragResult.context ? ragResult.context : null;
    const exactMatch = ragResult && ragResult.exactMatch ? ragResult.exactMatch : null;

    // 3. Exact dictionary match check
    let cleaned = "";
    if (exactMatch && exactMatch.bhutia) {
      console.log(`[Translate] Exact match: "${exactMatch.bhutia}"`);
      cleaned = exactMatch.bhutia;
    } else {
      // 4. Prompt Builder
      const buildPrompt = (strong = false) => {
        if (!ragContext) {
          return null; // signal: no context, don't call LLM
        }

        const strictness = strong ? `CRITICAL: Your previous answer was wrong. Output ONLY Bhutia Roman.` : "";

        return `You are a Bhutia (Sikkimese) language translator. Bhutia is spoken in Sikkim, India.

VERIFIED BHUTIA DICTIONARY (use these EXACTLY):
${ragContext}

STRICT RULES:
1. Output ONLY the Bhutia Roman transliteration — no explanations, no English, no Tibetan script.
2. Match the dictionary entry as closely as possible to the input.
3. If multiple words are in the input, combine their dictionary translations.
4. Do NOT invent words that are not in the dictionary.
${strictness}
Examples of correct output format:
- Input: "hello" → Output: Kuzu Zangpo La
- Input: "water" → Output: Chu
- Input: "thank you" → Output: Tashi Delek

Now translate the following input:`;
      };

      const systemPrompt = buildPrompt(false);

      // 5. No RAG context — don't hallucinate, return honest not-found
      if (!systemPrompt) {
        console.log(`[Translate] No dictionary context found — returning not-found`);
        cleaned = "__NOT_FOUND__";
      } else {
        // 5b. First LLM attempt
        let result = await askAI([
          { role: "system", content: systemPrompt },
          { role: "user",   content: cleanQuery },
        ], 0.0);

        cleaned = cleanOutput(result);
        console.log(`[Translate] First attempt: "${cleaned}"`);

        // 6. Retry if output echoes English back
        if (isEcho(cleaned, cleanQuery) || hasEnglish(cleaned)) {
          console.log(`[Translate] Bad output detected — retrying...`);
          result = await askAI([
            { role: "system",    content: buildPrompt(true) },
            { role: "user",      content: cleanQuery },
            { role: "assistant", content: cleaned },
            { role: "user",      content: `That was English. Give me ONLY the Bhutia Roman transliteration.` },
          ], 0.0);
          cleaned = cleanOutput(result);
        }

        // 7. Final extraction from RAG context if AI still fails
        if ((isEcho(cleaned, cleanQuery) || hasEnglish(cleaned)) && ragContext) {
          const lines = ragContext.split("\n");
          for (const line of lines) {
            // match: Dictionary entry: "X" translates to Bhutia word "Y"
            const dMatch = line.match(/translates to Bhutia word "([^"]+)"/i);
            if (dMatch && dMatch[1]) {
              cleaned = dMatch[1].trim();
              break;
            }
            // fallback for older format with transliteration label
            const tMatch = line.match(/[Tt]ransliteration[:\s]+([A-Za-z\s'\-]+)/);
            if (tMatch && tMatch[1]) {
              cleaned = tMatch[1].trim();
              break;
            }
          }
        }
      }
    }

    console.log(`[Translate] Final Result: "${cleaned}"`);

    // Return a user-friendly not-found response
    if (cleaned === "__NOT_FOUND__") {
      return res.json({
        success: true,
        translated: null,
        notFound: true,
        message: `Sorry, "${text}" was not found in the Bhutia dictionary. Try a simpler word or phrase.`,
        original: text,
      });
    }

    // ── ✅ NEW DATABASE AUTO-SAVE WORK USING USERID ──
    const activeUserId = req.user ? req.user.id || req.user._id : null;
    
    if (activeUserId) {
      const fallbackChatId = chatId || `chat_${Date.now()}`;
      const title = text.length > 35 ? text.substring(0, 35) + "..." : text;
      
      let compiledHistory = [];
      try {
        compiledHistory = typeof history === "string" ? JSON.parse(history) : (history || []);
      } catch (e) {
        compiledHistory = [];
      }

      const freshSessionBlock = [
        ...compiledHistory,
        { role: "user", content: text },
        { role: "ai", content: cleaned }
      ];

      console.log(`[Database] Saving log using userId: ${activeUserId}`);

      await History.findOneAndUpdate(
        { chatId: fallbackChatId },
        {
          userId: activeUserId,
          originalText: title, 
          translatedText: JSON.stringify(freshSessionBlock),
          mode: mode || "translate",
          updatedAt: new Date(),
        },
        { upsert: true, new: true }
      );
      
      console.log("[Database] Translation successfully saved!");
    } else {
      console.log("[Database Warning] Skipped auto-save because req.user.id was not found. Check auth middleware!");
    }

    return res.json({ 
      success: true, 
      translated: cleaned, 
      original: text 
    });

  } catch (err) {
    console.error("[Translate Error]:", err.message);
    if (!res.headersSent) {
        res.status(500).json({ success: false, error: "Translation failed" });
    }
  }
});

export default router;