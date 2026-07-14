// services/aiService.js — calls OpenAI for translation and chat
// Uses GPT5_NANO_API_KEY directly (no OpenRouter)
// Fixed: removed optional chaining (?.) for older Node.js compatibility

import fetch from "node-fetch";

const MODELS = [
  "gpt-4o-mini",     // fast, cheap — sufficient when RAG context is provided
  "gpt-4o",          // stronger fallback for difficult inputs
  "gpt-3.5-turbo",   // last resort
];

export async function askAI(messages, temperature = 0.05) {
  const apiKey = process.env.GPT5_NANO_API_KEY;
  if (!apiKey) {
    console.error("[AI] GPT5_NANO_API_KEY missing from .env");
    return "__API_KEY_MISSING__";
  }

  for (const modelId of MODELS) {
    let timeoutId;
    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 15000);

      console.log(`[AI] Trying ${modelId}...`);

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization:  `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model:       modelId,
          messages,
          temperature: temperature,
          top_p:       1,
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[AI] ${modelId} HTTP ${response.status}:`, errText);
        const waitTime = response.status === 429 ? 2000 : 500;
        await new Promise(function(r) { return setTimeout(r, waitTime); });
        continue;
      }

      const data = await response.json();

      // Fixed: no optional chaining — works on all Node.js versions
      if (
        data.choices &&
        data.choices[0] &&
        data.choices[0].message &&
        data.choices[0].message.content
      ) {
        console.log(`[AI] Success with ${modelId}`);
        return data.choices[0].message.content.trim();
      }

      if (data.error) {
        console.error(`[AI] ${modelId} error:`, data.error && data.error.message);
        await new Promise(function(r) { return setTimeout(r, 500); });
      }

    } catch (e) {
      clearTimeout(timeoutId);
      if (e.name === "AbortError") {
        console.error(`[AI] ${modelId} timed out`);
      } else {
        console.error(`[AI] ${modelId} failed:`, e.message);
      }
      await new Promise(function(r) { return setTimeout(r, 500); });
    }
  }

  console.error("[AI] All models failed");
  return "__AI_SERVICE_UNAVAILABLE__";
}