import { envConfig } from "../config/env.config.js";
import { searchPinecone } from "../config/pinecone.js";

const CONFIDENCE_THRESHOLD = Number(envConfig.CONFIDENCE_THRESHOLD);
const TOP_K = Number(process.env.RAG_TOP_K ?? 5);

function cleanQueryForSearch(input) {
  if (typeof input !== "string") return "";

  return input
    // Remove apostrophes (e.g., "you'" -> "you")
    .replace(/'/g, "")
    // Remove punctuation: ['". , ! ? ; : ( )]
    .replace(/[\"\'\.,!?;:\(\)]/g, " ")
    // Normalize whitespace
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function extractEnglishWord(meta) {
  if (!meta || typeof meta !== "object") return "";
  return (
    meta.english ||
    meta.text ||
    meta.word ||
    meta.English ||
    meta.number ||
    meta.Word ||
    ""
  );
}

function extractBhutiaWord(meta) {
  if (!meta || typeof meta !== "object") return "";
  return (
    meta.bhutia ||
    meta.transliteration ||
    meta.native ||
    meta.bhutiaRoman ||
    meta.Bhutia ||
    ""
  );
}

function normalizeEnglishForExact(eng) {
  return cleanQueryForSearch(String(eng ?? ""));
}

function extractKeywords(cleanedQuery) {
  const stopWords = new Set([
    // common
    "the",
    "is",
    "are",
    "a",
    "an",
    "and",
    "or",
    "to",
    "of",
    "in",
    "on",
    "for",
    "with",
    "without",
    "that",
    "this",
    "it",
    "as",
    "at",
    // pronouns/determiners
    "i",
    "you",
    "he",
    "she",
    "we",
    "they",
    "them",
    "your",
    "my",
    "our",
    "their",
    // question words
    "how",
    "what",
    "why",
    "where",
    "when",
    "who",
    "which",
    // common translation helpers
    "please",
    "thanks",
    "thank",
    "hello",
    "good",
    "morning",
    "evening",
    "night",
    // duplicates
    "am",
    "be"
  ]);

  return cleanedQuery
    .split(" ")
    .map(w => w.trim())
    .filter(Boolean)
    // keep short keywords only if they are at least 2 chars
    .filter(w => w.length >= 2)
    .filter(w => !stopWords.has(w));
}

function formatContextPart(englishWord, bhutiaWord) {
  return `Dictionary entry: "${englishWord}" translates to Bhutia word "${bhutiaWord}"`;
}

function dedupeByEnglish(contextParts) {
  const seen = new Set();
  const out = [];

  for (const part of contextParts) {
    const match = part.match(/Dictionary entry:\s+"(.+?)"/);
    const eng = match?.[1] ?? part;
    const key = String(eng).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(part);
  }

  return out;
}

/**
 * getRagContext
 * Searches Pinecone for the most relevant Bhutia translations
 * and returns them as a context string for the AI.
 */
export async function getRagContext(query, language) {
  try {
    const formattedLang = language
      ? language.charAt(0).toUpperCase() + language.slice(1).toLowerCase()
      : "";

    const cleanedQuery = cleanQueryForSearch(query);
    if (!cleanedQuery) return null;

    console.log(`[RAG] Searching "${cleanedQuery}" in ${formattedLang}...`);

    // Phrase search
    const matches = await searchPinecone(cleanedQuery, formattedLang, TOP_K);

    console.log(`[Pinecone] Found ${matches.length} matches`);

    if (!matches || matches.length === 0) return null;

    const top3 = [...matches]
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 3);

    console.log(
      `[RAG] Top 3 matches: ${top3
        .map(m => `${m.metadata?.english ?? m.metadata?.text ?? "?"}: ${m.score}`)
        .join(", ")}`
    );

    // CRITICAL FIX: Wrong filter -> keep score >= CONFIDENCE_THRESHOLD
    const threshold = CONFIDENCE_THRESHOLD;
    const goodMatches = matches.filter(m => (m.score ?? 0) >= threshold);

    console.log(
      `[RAG] Confidence: ${goodMatches.length}/${matches.length} above ${threshold}`
    );

    // Keyword fallback:
    // If phrase search fails (best score < 0.5)
    const bestScore = Math.max(...matches.map(m => m.score ?? 0));
    let finalMatches = goodMatches;

    if (finalMatches.length === 0 && bestScore < 0.5) {
      const keywords = extractKeywords(cleanedQuery);

      const combined = [];
      const seen = new Set();

      for (const kw of keywords) {
        const kwMatches = await searchPinecone(kw, formattedLang, Math.min(3, TOP_K));
        for (const m of kwMatches) {
          const meta = m.metadata || {};
          const eng = extractEnglishWord(meta);
          const bhu = extractBhutiaWord(meta);
          if (!eng || !bhu) continue;
          const key = `${eng.toLowerCase()}|||${bhu.toLowerCase()}`;
          if (seen.has(key)) continue;
          seen.add(key);
          combined.push({ ...m, _eng: eng, _bhu: bhu });
        }
      }

      finalMatches = combined
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    }

    if (!finalMatches || finalMatches.length === 0) return null;

    const exactQuery = cleanedQuery;
    let exactMatch = null;

    const contextParts = [];

    for (const m of finalMatches) {
      const meta = m.metadata || {};
      const eng = extractEnglishWord(meta);
      const bhu = extractBhutiaWord(meta);
      if (!eng || !bhu) continue;

      const normalizedEng = normalizeEnglishForExact(eng);
      if (!exactMatch && normalizedEng === exactQuery) {
        exactMatch = { english: eng, bhutia: bhu };
      }

      contextParts.push(formatContextPart(eng, bhu));
    }

    if (contextParts.length === 0) return null;

    const uniqueContext = dedupeByEnglish(contextParts);

    console.log(`[RAG] Found ${uniqueContext.length} relevant dictionary matches.`);

    return {
      context: uniqueContext.join("\n"),
    };
  } catch (error) {
    console.error("[RAG] Error fetching context:", error);
    return null;
  }
}