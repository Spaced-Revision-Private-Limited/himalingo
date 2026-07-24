


import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();
const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../data");

function loadVocabulary() {
  const raw = [];
  const sources = [
    "bhutia_core_vocabulary.json",
    "bhutia_vocabulary_expansion.json",
    "final_bhutia_mcqs.json",
    "bhutia_full_question_banks.json",
  ];

  for (const file of sources) {
    const fpath = path.join(DATA_DIR, file);
    if (!fs.existsSync(fpath)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(fpath, "utf-8"));
      if (!Array.isArray(data)) continue;
      for (const e of data) {
        const english = (e.english || "").trim();
        const bhutia  = (e.transliteration || e.bhutia || "").trim();
        if (!english || !bhutia) continue;
        if (bhutia.includes("NEEDS_NATIVE_SPEAKER")) continue;
        // Keep only single words / short phrases suitable for flashcards
        if (english.length > 40) continue;
        raw.push({
          english,
          bhutia,
          category: String(e.category || "general"),
        });
      }
    } catch (err) {
      console.error(`[Quiz] Failed to load ${file}:`, err.message);
    }
  }

  // Deduplicate by lowercased English
  const seen = new Set();
  return raw.filter(w => {
    const key = w.english.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const VOCAB = loadVocabulary();
console.log(`[Quiz] ${VOCAB.length} words loaded for practice`);

// GET /api/quiz/words?n=10&category=greetings
router.get("/words", (req, res) => {
  const n   = Math.min(parseInt(req.query.n) || 10, 20);
  const cat = (req.query.category || "").toLowerCase();

  let pool = cat
    ? VOCAB.filter(w => w.category.toLowerCase().includes(cat))
    : VOCAB;
  if (pool.length === 0) pool = VOCAB;

  const picked = [...pool].sort(() => Math.random() - 0.5).slice(0, n);
  res.json({ success: true, words: picked, total: pool.length });
});

// GET /api/quiz/word-of-day — deterministic for the calendar day
router.get("/word-of-day", (req, res) => {
  if (VOCAB.length === 0) return res.json({ success: false, word: null });
  const d = new Date();
  const dayIndex = d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate();
  res.json({ success: true, word: VOCAB[dayIndex % VOCAB.length] });
});

// GET /api/quiz/categories — list available categories
router.get("/categories", (req, res) => {
  const cats = [...new Set(VOCAB.map(w => w.category))].sort();
  res.json({ success: true, categories: cats });
});

export default router;