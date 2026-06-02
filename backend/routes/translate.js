import express from "express";
import multer from "multer";
import { getRagContext } from "../services/ragService.js";
import { askAI } from "../services/aiService.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

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

router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, error: "No text provided" });
    }

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
    if (exactMatch && exactMatch.bhutia) {
      console.log(`[Translate] Exact match: "${exactMatch.bhutia}"`);
      return res.json({ success: true, translated: exactMatch.bhutia });
    }

    // 4. Prompt Builder
    const buildPrompt = (strong = false) => {
      const contextSection = ragContext
        ? `VERIFIED BHUTIA DICTIONARY:\n${ragContext}`
        : `No dictionary match found. Use your knowledge of Sikkimese Bhutia.`;

      const strictness = strong ? `FINAL WARNING: Output ONLY Bhutia Roman script.` : "";

      return `You are a Bhutia (Sikkimese) translator. 
      ${contextSection}
      RULES:
      1. Output ONLY Bhutia Roman transliteration.
      2. No English, no Tibetan script, no explanations.
      ${strictness}
      Input to translate:`;
    };

    // 5. First attempt
    let result = await askAI([
      { role: "system", content: buildPrompt(false) },
      { role: "user",   content: cleanQuery },
    ], 0.0);

    let cleaned = cleanOutput(result);
    console.log(`[Translate] First attempt: "${cleaned}"`);

    // 6. Retry logic if output is bad
    if (isEcho(cleaned, cleanQuery) || hasEnglish(cleaned)) {
      console.log(`[Translate] Bad output detected — retrying...`);
      result = await askAI([
        { role: "system",    content: buildPrompt(true) },
        { role: "user",      content: cleanQuery },
        { role: "assistant", content: cleaned },
        { role: "user",      content: `That was English. Give me ONLY Bhutia.` },
      ], 0.0);
      cleaned = cleanOutput(result);
    }

    // 7. Final extraction from RAG if AI still fails
    if ((isEcho(cleaned, cleanQuery) || hasEnglish(cleaned)) && ragContext) {
      const lines = ragContext.split("\n");
      for (const line of lines) {
        const match = line.match(/[Tt]ransliteration[:\s]+([A-Za-z\s']+)/);
        if (match && match[1]) {
          cleaned = match[1].trim();
          break;
        }
      }
    }

    console.log(`[Translate] Final Result: "${cleaned}"`);

    const userId = req.user.id

    // now save it to the History collection

    // --- THE FIX: SEND THE RESPONSE TO THE BROWSER ---
    return res.json({ 
      success: true, 
      translated: cleaned, 
      original: text 
    });
    // ------------------------------------------------

  } catch (err) {
    console.error("[Translate Error]:", err.message);
    // Ensure we always send a response even on error
    if (!res.headersSent) {
        res.status(500).json({ success: false, error: "Translation failed" });
    }
  }
});

export default router;