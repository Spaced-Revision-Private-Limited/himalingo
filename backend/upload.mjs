// upload.mjs — Bhutia ONLY uploader
// Run with: node upload.mjs

import "dotenv/config";
import fs   from "fs";
import path from "path";
import { Pinecone } from "@pinecone-database/pinecone";

const pc    = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.Index("translation");

const DATA_DIR   = path.join(process.cwd(), "data");
const BATCH_SIZE = 50;

// ── Embed using Pinecone's llama-text-embed-v2 (matches your index) ───────
async function getEmbeddings(texts) {
  const response = await pc.inference.embed(
    "llama-text-embed-v2",
    texts,
    { inputType: "passage", truncate: "END" }
  );
  return response.data.map(item => item.values);
}

async function upsertBatch(vectors) {
  if (vectors.length === 0) return;
  await index.upsert(vectors);
  await new Promise(r => setTimeout(r, 300));
}

function makeId(prefix, i) {
  return `${prefix}_${i}_${Date.now()}`;
}

// ── Upload a list of records to Pinecone ──────────────────────────────────
async function uploadRecords(records, label) {
  if (records.length === 0) {
    console.log(`  No valid records in ${label}, skipping.`);
    return 0;
  }

  let uploaded = 0;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch  = records.slice(i, i + BATCH_SIZE);
    const texts  = batch.map(r => r.searchText);
    const embeds = await getEmbeddings(texts);

    const vectors = batch.map((r, j) => ({
      id:       makeId(label, i + j),
      values:   embeds[j],
      metadata: {
        text:            r.searchText,
        language:        "Bhutia",
        english:         r.english   || "",
        transliteration: r.trans     || "",
        native:          r.native    || "",
      },
    }));

    await upsertBatch(vectors);
    uploaded += vectors.length;
    console.log(`  [${label}] Uploaded ${uploaded} vectors...`);
  }
  return uploaded;
}

// ── Main ──────────────────────────────────────────────────────────────────
async function syncData() {
  console.log("Clearing Pinecone index...");
  try {
    await index.deleteAll();
  } catch (e) {
    console.log("Index already empty, continuing...");
  }
  await new Promise(r => setTimeout(r, 2000));
  console.log("Index cleared.\n");

  let total = 0;

  // ── 1. dictionary.json — Bhutia entries only ───────────────────────────
  const dictPath = path.join(DATA_DIR, "dictionary.json");
  if (fs.existsSync(dictPath)) {
    console.log("Processing dictionary.json (Bhutia only)...");
    const data = JSON.parse(fs.readFileSync(dictPath, "utf-8"));

    const records = data
      .filter(e => e.english && (e.transliteration_bhutia || e.bhutia))
      .map(e => ({
        english:    e.english.trim(),
        trans:      (e.transliteration_bhutia || "").trim(),
        native:     (e.bhutia || "").trim(),
        searchText: `English: ${e.english.trim()} | Bhutia transliteration: ${(e.transliteration_bhutia || "").trim()} | Bhutia script: ${(e.bhutia || "").trim()}`,
      }));

    total += await uploadRecords(records, "dict");
    console.log("dictionary.json done.\n");
  }

  // ── 2. food_conversations.json ─────────────────────────────────────────
  const foodPath = path.join(DATA_DIR, "food_conversations.json");
  if (fs.existsSync(foodPath)) {
    console.log("Processing food_conversations.json...");
    const data = JSON.parse(fs.readFileSync(foodPath, "utf-8"));

    const entries = [
      ...(data.formal   || []),
      ...(data.informal || []),
    ].filter(e => e.english && e.bhutia);

    const records = entries.map(e => ({
      english:    e.english.trim(),
      trans:      e.bhutia.trim(),
      native:     "",
      searchText: `English: ${e.english.trim()} | Bhutia: ${e.bhutia.trim()}`,
    }));

    total += await uploadRecords(records, "food");
    console.log("food_conversations.json done.\n");
  }

  // ── 3. numbers_31_40.json ─────────────────────────────────────────────
  const numbersPath = path.join(DATA_DIR, "numbers_31_40.json");
  if (fs.existsSync(numbersPath)) {
    console.log("Processing numbers_31_40.json...");
    const data = JSON.parse(fs.readFileSync(numbersPath, "utf-8"));
    // File is { "numbers": [...] }, not a plain array
    const entries = Array.isArray(data) ? data : (data.numbers || []);

    const records = entries
      .filter(e => e.english && (e.transliteration_bhutia || e.bhutia))
      .map(e => ({
        english:    String(e.english).trim(),
        trans:      (e.transliteration_bhutia || e.bhutia || "").trim(),
        native:     (e.bhutia || "").trim(),
        searchText: `English: ${String(e.english).trim()} | Bhutia: ${(e.transliteration_bhutia || e.bhutia || "").trim()}`,
      }));

    total += await uploadRecords(records, "nums");
    console.log("numbers_31_40.json done.\n");
  }

  // ── 4. bhutia_full_question_bank.txt ──────────────────────────────────
  const txtPath = path.join(DATA_DIR, "bhutia_full_question_bank.txt");
  if (fs.existsSync(txtPath)) {
    console.log("Processing bhutia_full_question_bank.txt...");
    const lines = fs.readFileSync(txtPath, "utf-8")
      .split("\n")
      .map(l => l.trim())
      .filter(l => l.length > 5);

    const records = lines.map(line => ({
      english:    "",
      trans:      line,
      native:     "",
      searchText: line,
    }));

    total += await uploadRecords(records, "txt");
    console.log("bhutia_full_question_bank.txt done.\n");
  }

  // ── 5. bhutia_full_question_bank.json ─────────────────────────────────
  const qbPath = path.join(DATA_DIR, "bhutia_full_question_bank.json");
  if (fs.existsSync(qbPath)) {
    console.log("Processing bhutia_full_question_bank.json...");
    const data = JSON.parse(fs.readFileSync(qbPath, "utf-8"));

    const records = data
      .filter(e => e.question && e.answer !== undefined && e.options)
      .map(e => {
        const q   = e.question.replace(/<[^>]*>/g, "").trim();
        const ans = (e.options[e.answer] || "").replace(/<[^>]*>/g, "").trim();
        return {
          english:    q,
          trans:      ans,
          native:     "",
          searchText: `Question: ${q} | Answer: ${ans}`,
        };
      });

    total += await uploadRecords(records, "qbank");
    console.log("bhutia_full_question_bank.json done.\n");
  }

  // ── 6. bhutia_dictionary.json ─────────────────────────────────────────
  const bdPath = path.join(DATA_DIR, "bhutia_dictionary.json");
  if (fs.existsSync(bdPath)) {
    console.log("Processing bhutia_dictionary.json...");
    const data = JSON.parse(fs.readFileSync(bdPath, "utf-8"));
    const records = data
      .filter(e => e.english && e.bhutia)
      .map(e => ({
        english:    e.english.trim(),
        trans:      e.bhutia.trim(),
        native:     "",
        searchText: `English: ${e.english.trim()} | Bhutia: ${e.bhutia.trim()}`,
      }));
    total += await uploadRecords(records, "bdict");
    console.log("bhutia_dictionary.json done.\n");
  }

  // ── 7. bhutia_full_question_banks.json ────────────────────────────────
  const qbsPath = path.join(DATA_DIR, "bhutia_full_question_banks.json");
  if (fs.existsSync(qbsPath)) {
    console.log("Processing bhutia_full_question_banks.json...");
    const data = JSON.parse(fs.readFileSync(qbsPath, "utf-8"));
    const records = data
      .filter(e => e.english && e.transliteration)
      .map(e => ({
        english:    e.english.trim(),
        trans:      e.transliteration.trim(),
        native:     "",
        searchText: `English: ${e.english.trim()} | Bhutia: ${e.transliteration.trim()} | Category: ${e.category || ""}`,
      }));
    total += await uploadRecords(records, "qbanks");
    console.log("bhutia_full_question_banks.json done.\n");
  }

  // ── 8. bhutia_lessons.json ────────────────────────────────────────────
  const lessonsPath = path.join(DATA_DIR, "bhutia_lessons.json");
  if (fs.existsSync(lessonsPath)) {
    console.log("Processing bhutia_lessons.json...");
    const data = JSON.parse(fs.readFileSync(lessonsPath, "utf-8"));
    const records = data
      .filter(e => e.heading && e.content)
      .map(e => ({
        english:    e.heading.trim(),
        trans:      e.content.replace(/<[^>]*>/g, "").trim(),
        native:     "",
        searchText: `Lesson: ${e.heading.trim()} | Content: ${e.content.replace(/<[^>]*>/g, "").trim()}`,
      }));
    total += await uploadRecords(records, "lessons");
    console.log("bhutia_lessons.json done.\n");
  }

  // ── 9. bhutia_mcq_bank.json ───────────────────────────────────────────
  const mcqPath = path.join(DATA_DIR, "bhutia_mcq_bank.json");
  if (fs.existsSync(mcqPath)) {
    console.log("Processing bhutia_mcq_bank.json...");
    const data = JSON.parse(fs.readFileSync(mcqPath, "utf-8"));
    // Data format is { english, transliteration } — not MCQ format
    const records = data
      .filter(e => e.english && e.transliteration)
      .map(e => ({
        english:    e.english.trim(),
        trans:      e.transliteration.trim(),
        native:     "",
        searchText: `English: ${e.english.trim()} | Bhutia: ${e.transliteration.trim()}`,
      }));
    total += await uploadRecords(records, "mcq");
    console.log("bhutia_mcq_bank.json done.\n");
  }

  // ── 10. clean_bhutia_conversations.json ───────────────────────────────
  const convPath = path.join(DATA_DIR, "clean_bhutia_conversations.json");
  if (fs.existsSync(convPath)) {
    console.log("Processing clean_bhutia_conversations.json...");
    const data = JSON.parse(fs.readFileSync(convPath, "utf-8"));
    const records = data
      .filter(e => e.heading && e.content)
      .map(e => ({
        english:    e.heading.trim(),
        trans:      e.content.replace(/<[^>]*>/g, "").trim(),
        native:     "",
        searchText: `Topic: ${e.heading.trim()} | Conversation: ${e.content.replace(/<[^>]*>/g, "").trim()}`,
      }));
    total += await uploadRecords(records, "conv");
    console.log("clean_bhutia_conversations.json done.\n");
  }

  // ── 11. final_bhutia_mcqs.json ────────────────────────────────────────
  const fmcqPath = path.join(DATA_DIR, "final_bhutia_mcqs.json");
  if (fs.existsSync(fmcqPath)) {
    console.log("Processing final_bhutia_mcqs.json...");
    const data = JSON.parse(fs.readFileSync(fmcqPath, "utf-8"));
    // Data format is { english, transliteration } — not MCQ format
    const records = data
      .filter(e => e.english && e.transliteration)
      .map(e => ({
        english:    e.english.trim(),
        trans:      e.transliteration.trim(),
        native:     "",
        searchText: `English: ${e.english.trim()} | Bhutia: ${e.transliteration.trim()}`,
      }));
    total += await uploadRecords(records, "fmcq");
    console.log("final_bhutia_mcqs.json done.\n");
  }

  // ── 12. separated_bhutia_mcqs.json ────────────────────────────────────
  const smcqPath = path.join(DATA_DIR, "separated_bhutia_mcqs.json");
  if (fs.existsSync(smcqPath)) {
    console.log("Processing separated_bhutia_mcqs.json...");
    const data = JSON.parse(fs.readFileSync(smcqPath, "utf-8"));
    const records = data
      .filter(e => e.raw && e.raw.trim().length > 10)
      .map(e => ({
        english:    "",
        trans:      e.raw.trim(),
        native:     "",
        searchText: e.raw.trim(),
      }));
    total += await uploadRecords(records, "smcq");
    console.log("separated_bhutia_mcqs.json done.\n");
  }

  // ── 13. temporary_fixed.json ──────────────────────────────────────────
  const tmpPath = path.join(DATA_DIR, "temporary_fixed.json");
  if (fs.existsSync(tmpPath)) {
    console.log("Processing temporary_fixed.json...");
    const data = JSON.parse(fs.readFileSync(tmpPath, "utf-8"));
    const records = [];

    const pushPair = (eng, bhu, section = "") => {
      if (eng && bhu) {
        records.push({
          english:    String(eng).trim(),
          trans:      String(bhu).trim(),
          native:     "",
          searchText: `English: ${String(eng).trim()} | Bhutia: ${String(bhu).trim()}${section ? ` | Section: ${section}` : ""}`,
        });
      }
    };

    if (Array.isArray(data.how_sentences)) {
      data.how_sentences.forEach(e => {
        if (e.english && e.bhutia) pushPair(e.english, e.bhutia, "how_sentences");
        else if (e.english && e.formal) pushPair(e.english, e.formal, "how_sentences_formal");
      });
    }

    if (Array.isArray(data.common_greetings)) {
      data.common_greetings.forEach(e => pushPair(e.english, e.bhutia, "common_greetings"));
    }

    if (Array.isArray(data.days)) {
      data.days.forEach(e => pushPair(e.day, e.bhutia, "days"));
    }

    if (Array.isArray(data.months)) {
      data.months.forEach(e => pushPair(e.month, e.bhutia, "months"));
    }

    if (Array.isArray(data.weather)) {
      data.weather.forEach(e => pushPair(e.english, e.bhutia, "weather"));
    }

    if (Array.isArray(data.activities)) {
      data.activities.forEach(e => pushPair(e.english, e.bhutia, "activities"));
    }

    if (data.pronouns && typeof data.pronouns === "object") {
      Object.entries(data.pronouns).forEach(([key, val]) => {
        if (typeof val === "string") pushPair(key, val, "pronouns");
        else if (val && typeof val === "object") {
          Object.entries(val).forEach(([subKey, subVal]) => pushPair(`${key} (${subKey})`, subVal, "pronouns"));
        }
      });
    }

    if (data.tenses && typeof data.tenses === "object") {
      Object.entries(data.tenses).forEach(([key, val]) => pushPair(key, val, "tenses"));
    }

    if (data.numbers && typeof data.numbers === "object") {
      ["1_30", "31_40", "hundreds"].forEach(sec => {
        if (Array.isArray(data.numbers[sec])) {
          data.numbers[sec].forEach(e => pushPair(e.number, e.word, `numbers_${sec}`));
        }
      });
    }

    if (data.question_types && typeof data.question_types === "object") {
      Object.entries(data.question_types).forEach(([qType, arr]) => {
        if (Array.isArray(arr)) {
          arr.forEach(e => {
            if (e.english && e.formal) pushPair(e.english, e.formal, `question_types_${qType}_formal`);
            if (e.english && e.informal) pushPair(e.english, e.informal, `question_types_${qType}_informal`);
          });
        }
      });
    }

    if (data.food_sentences && typeof data.food_sentences === "object") {
      Object.entries(data.food_sentences).forEach(([ftype, arr]) => {
        if (Array.isArray(arr)) {
          arr.forEach(e => {
            if (e.english && e.bhutia) pushPair(e.english, e.bhutia, `food_sentences_${ftype}`);
          });
        }
      });
    }

    total += await uploadRecords(records, "tmp");
    console.log("temporary_fixed.json done.\n");
  }

  // ── 14. bhutia_core_vocabulary.json ───────────────────────────────────
  const coreVocabPath = path.join(DATA_DIR, "bhutia_core_vocabulary.json");
  if (fs.existsSync(coreVocabPath)) {
    console.log("Processing bhutia_core_vocabulary.json...");
    const data = JSON.parse(fs.readFileSync(coreVocabPath, "utf-8"));
    const records = data
      .filter(e => e.english && e.transliteration)
      .map(e => ({
        english:    e.english.trim(),
        trans:      e.transliteration.trim(),
        native:     "",
        searchText: `English: ${e.english.trim()} | Bhutia: ${e.transliteration.trim()} | Category: ${e.category || ""}`,
      }));
    total += await uploadRecords(records, "corevocab");
    console.log("bhutia_core_vocabulary.json done.\n");
  }

  // ── 15. bhutia_vocabulary_expansion.json ──────────────────────────────
  const expansionPath = path.join(DATA_DIR, "bhutia_vocabulary_expansion.json");
  if (fs.existsSync(expansionPath)) {
    console.log("Processing bhutia_vocabulary_expansion.json...");
    const data = JSON.parse(fs.readFileSync(expansionPath, "utf-8"));
    const records = data
      // Skip placeholder entries that need native speaker review
      .filter(e => e.english && e.transliteration && !e.transliteration.includes("NEEDS_NATIVE_SPEAKER"))
      .map(e => ({
        english:    e.english.trim(),
        trans:      e.transliteration.trim(),
        native:     "",
        searchText: `English: ${e.english.trim()} | Bhutia: ${e.transliteration.trim()} | Category: ${e.category || ""}`,
      }));
    total += await uploadRecords(records, "expansion");
    console.log("bhutia_vocabulary_expansion.json done.\n");
  }

  console.log(`\nAll done! Total Bhutia vectors uploaded: ${total}`);
  console.log("Now run: node server.js");
}

syncData().catch(err => {
  console.error("Upload failed:", err.message);
  process.exit(1);
});

