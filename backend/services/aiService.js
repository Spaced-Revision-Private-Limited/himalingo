import fetch from "node-fetch";

const MODELS = [
  "gemini-3.1-flash-lite",  // fast, cheap, current free-tier model
  "gemini-flash-latest",    // alias that always points to the latest stable Flash model
];

export async function askAI(messages, temperature = 0.05) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[AI] GEMINI_API_KEY missing from .env");
    return "__API_KEY_MISSING__";
  }

  for (const modelId of MODELS) {
    let timeoutId;
    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 15000);

      console.log(`[AI] Trying ${modelId}...`);

      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: modelId,
          messages,
          temperature: temperature,
          top_p: 1,
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[AI] ${modelId} HTTP ${response.status}:`, errText);
        const waitTime = response.status === 429 ? 2000 : 500;
        await new Promise(function (r) { return setTimeout(r, waitTime); });
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
        await new Promise(function (r) { return setTimeout(r, 500); });
      }

    } catch (e) {
      clearTimeout(timeoutId);
      if (e.name === "AbortError") {
        console.error(`[AI] ${modelId} timed out`);
      } else {
        console.error(`[AI] ${modelId} failed:`, e.message);
      }
      await new Promise(function (r) { return setTimeout(r, 500); });
    }
  }

  console.error("[AI] All models failed");
  return "__AI_SERVICE_UNAVAILABLE__";
}