// config/pinecone.js — Pinecone setup
import { Pinecone } from "@pinecone-database/pinecone";
import { envConfig } from "./env.config.js";

console.log(envConfig)
// 1. Initialize Pinecone
export const pc = new Pinecone({ apiKey: envConfig.PINECONE_API_KEY});
export const index = pc.Index("translation"); 

// ── Embed a query for searching ───────────────────────────────────────────
export async function embedQuery(text) {
  try {
    const response = await pc.inference.embed(
      "llama-text-embed-v2",
      [text],
      { inputType: "query", truncate: "END" }
    );

    console.log("response:", response.data);
    
    
    // Check if data exists to prevent crashes
    if (!response.data || response.data.length === 0) {
      throw new Error("Embedding failed: No data returned from Pinecone Inference.");
    }
    
    return response.data[0].values;
  } catch (err) {
    console.error("[Pinecone] Embedding error:", err.message);
    throw err; // Re-throw so the service knows it failed
  }
}

// ── Search Pinecone with language filter ──────────────────────────────────
export async function searchPinecone(query, language, topK = 5) {
  try {
    // Ensure the language name is normalized to match your metadata (e.g., "Bhutia")
    // This is safer than doing it only in the service.
    const normalizedLang = language.charAt(0).toUpperCase() + language.slice(1).toLowerCase();
    
    const vector = await embedQuery(query);

    const results = await index.query({
      vector,
      topK,
      includeMetadata: true,
      // FIX: Metadata filtering is case-sensitive! 
      // This matches your dashboard's "language": "Bhutia"
      filter: { language: { $eq: normalizedLang } },
    });

    return results.matches || [];
  } catch (err) {
    // Detailed error logging
    console.error(`[Pinecone] Search error for ${language}:`, err.message);
    return [];
  }
}