// upload.mjs — Bhutia ONLY uploader
// Run with: NODE_ENV=dev node upload.mjs   (or NODE_ENV=prod for production env)

import dotenv from "dotenv";
dotenv.config({
  path: process.env.NODE_ENV === "dev" ? ".env.local" : ".env.prod",
});

import fs   from "fs";
import path from "path";
import { Pinecone } from "@pinecone-database/pinecone";

if (!process.env.PINECONE_API_KEY) {
  console.error("PINECONE_API_KEY missing — check your .env.local / .env.prod file and NODE_ENV setting.");
  process.exit(1);
}

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
function normalizeText(value) {
  return String(value ?? "")
    .replace(/<[^>]*>/g, "")
    .trim();
}

function createRecord(english, translit, native = "", label = "") {
  const eng = normalizeText(english);
  const trans = normalizeText(translit);
  const nat = normalizeText(native);

  if (!eng && !trans && !nat) return null;

  const searchText = label
    ? `English: ${eng} | Bhutia: ${trans}${nat ? ` | Bhutia script: ${nat}` : ""} | ${label}`
    : `English: ${eng} | Bhutia: ${trans}${nat ? ` | Bhutia script: ${nat}` : ""}`;

  return {
    english: eng,
    trans,
    native: nat,
    searchText,
  };
}

function buildRecordsForFile(fileName, data) {
  const records = [];
  const pushPair = (eng, bhu, label = "") => {
    const record = createRecord(eng, bhu, "", label);
    if (record) records.push(record);
  };

  switch (fileName) {
    // FIX: entries use "transliteration", not "transliteration_bhutia"/"bhutia"
    case "dictionary.json": {
      const entries = Array.isArray(data) ? data : [];
      entries.forEach(entry => {
        if (entry?.english && entry?.transliteration) {
          pushPair(entry.english, entry.transliteration, "dictionary");
        }
      });
      break;
    }

    case "food_conversations.json": {
      const entries = [
        ...(data?.formal || []),
        ...(data?.informal || []),
      ].filter(entry => entry?.english && entry?.bhutia);

      entries.forEach(entry => pushPair(entry.english, entry.bhutia, "food_conversation"));
      break;
    }

    // FIX: same wrong-field bug as dictionary.json — uses "transliteration"
    case "numbers_31_40.json": {
      const entries = Array.isArray(data) ? data : (data?.numbers || []);
      entries.forEach(entry => {
        if (entry?.english && entry?.transliteration) {
          pushPair(entry.english, entry.transliteration, "numbers");
        }
      });
      break;
    }

    case "bhutia_full_question_bank.json": {
      const entries = Array.isArray(data) ? data : [];
      entries.forEach(entry => {
        if (entry?.question && entry?.answer !== undefined && entry?.options) {
          const question = normalizeText(entry.question);
          const answer = normalizeText(entry.options[entry.answer]);
          if (question || answer) {
            records.push(createRecord(question, answer, "", "question_bank"));
          }
        }
      });
      break;
    }

    // FIX: some entries use capital "Bhutia" instead of "bhutia" — check both
    case "bhutia_dictionary.json": {
      const entries = Array.isArray(data) ? data : [];
      entries.forEach(entry => {
        const bhu = entry?.bhutia || entry?.Bhutia;
        if (entry?.english && bhu) {
          pushPair(entry.english, bhu, "bhutia_dictionary");
        }
      });
      break;
    }

    case "bhutia_full_question_banks.json": {
      const entries = Array.isArray(data) ? data : [];
      entries.forEach(entry => {
        if (entry?.english && entry?.transliteration) {
          pushPair(entry.english, entry.transliteration, `question_bank_${entry.category || "general"}`);
        }
      });
      break;
    }

    case "bhutia_lessons.json": {
      const entries = Array.isArray(data) ? data : [];
      entries.forEach(entry => {
        if (entry?.heading && entry?.content) {
          records.push(createRecord(entry.heading, entry.content, "", "lesson"));
        }
      });
      break;
    }

    case "bhutia_mcq_bank.json": {
      const entries = Array.isArray(data) ? data : [];
      entries.forEach(entry => {
        if (entry?.english && entry?.transliteration) {
          pushPair(entry.english, entry.transliteration, "mcq_bank");
        }
      });
      break;
    }

    case "clean_bhutia_conversations.json": {
      const entries = Array.isArray(data) ? data : [];
      entries.forEach(entry => {
        if (entry?.heading && entry?.content) {
          records.push(createRecord(entry.heading, entry.content, "", "conversation"));
        }
      });
      break;
    }

    case "final_bhutia_mcqs.json": {
      const entries = Array.isArray(data) ? data : [];
      entries.forEach(entry => {
        if (entry?.english && entry?.transliteration) {
          pushPair(entry.english, entry.transliteration, "final_mcq");
        }
      });
      break;
    }

    case "separated_bhutia_mcqs.json": {
      const entries = Array.isArray(data) ? data : [];
      entries.forEach(entry => {
        if (entry?.raw && entry.raw.trim().length > 10) {
          records.push(createRecord("", entry.raw, "", "separated_mcq"));
        }
      });
      break;
    }

    case "temporary_fixed.json": {
      const pushFromObject = (eng, bhu, section = "") => {
        if (eng && bhu) {
          records.push(createRecord(eng, bhu, "", section || "temporary_fixed"));
        }
      };

      if (Array.isArray(data?.how_sentences)) {
        data.how_sentences.forEach(entry => {
          if (entry?.english && entry?.bhutia) pushFromObject(entry.english, entry.bhutia, "how_sentences");
          else if (entry?.english && entry?.formal) pushFromObject(entry.english, entry.formal, "how_sentences_formal");
        });
      }

      if (Array.isArray(data?.common_greetings)) {
        data.common_greetings.forEach(entry => pushFromObject(entry?.english, entry?.bhutia, "common_greetings"));
      }

      if (Array.isArray(data?.days)) {
        data.days.forEach(entry => pushFromObject(entry?.day, entry?.bhutia, "days"));
      }

      if (Array.isArray(data?.months)) {
        data.months.forEach(entry => pushFromObject(entry?.month, entry?.bhutia, "months"));
      }

      if (Array.isArray(data?.weather)) {
        data.weather.forEach(entry => pushFromObject(entry?.english, entry?.bhutia, "weather"));
      }

      if (Array.isArray(data?.activities)) {
        data.activities.forEach(entry => pushFromObject(entry?.english, entry?.bhutia, "activities"));
      }

      if (data?.pronouns && typeof data.pronouns === "object") {
        Object.entries(data.pronouns).forEach(([key, val]) => {
          if (typeof val === "string") pushFromObject(key, val, "pronouns");
          else if (val && typeof val === "object") {
            Object.entries(val).forEach(([subKey, subVal]) => pushFromObject(`${key} (${subKey})`, subVal, "pronouns"));
          }
        });
      }

      if (data?.tenses && typeof data.tenses === "object") {
        Object.entries(data.tenses).forEach(([key, val]) => pushFromObject(key, val, "tenses"));
      }

      if (data?.numbers && typeof data.numbers === "object") {
        ["1_30", "31_40", "hundreds"].forEach(sec => {
          if (Array.isArray(data.numbers[sec])) {
            data.numbers[sec].forEach(entry => pushFromObject(entry?.number, entry?.word, `numbers_${sec}`));
          }
        });
      }

      if (data?.question_types && typeof data.question_types === "object") {
        Object.entries(data.question_types).forEach(([qType, arr]) => {
          if (Array.isArray(arr)) {
            arr.forEach(entry => {
              if (entry?.english && entry?.formal) pushFromObject(entry.english, entry.formal, `question_types_${qType}_formal`);
              if (entry?.english && entry?.informal) pushFromObject(entry.english, entry.informal, `question_types_${qType}_informal`);
            });
          }
        });
      }

      if (data?.food_sentences && typeof data.food_sentences === "object") {
        Object.entries(data.food_sentences).forEach(([ftype, arr]) => {
          if (Array.isArray(arr)) {
            arr.forEach(entry => {
              if (entry?.english && entry?.bhutia) pushFromObject(entry.english, entry.bhutia, `food_sentences_${ftype}`);
            });
          }
        });
      }
      break;
    }

    case "bhutia_core_vocabulary.json": {
      const entries = Array.isArray(data) ? data : [];
      entries.forEach(entry => {
        if (entry?.english && entry?.transliteration) {
          pushPair(entry.english, entry.transliteration, `core_vocabulary_${entry.category || "general"}`);
        }
      });
      break;
    }

    case "bhutia_vocabulary_expansion.json": {
      const entries = Array.isArray(data) ? data : [];
      entries.forEach(entry => {
        if (entry?.english && entry?.transliteration && !String(entry.transliteration).includes("NEEDS_NATIVE_SPEAKER")) {
          pushPair(entry.english, entry.transliteration, `vocabulary_expansion_${entry.category || "general"}`);
        }
      });
      break;
    }

    default: {
      if (Array.isArray(data)) {
        data.forEach(entry => {
          if (entry && typeof entry === "object") {
            const bhu = entry.transliteration || entry.bhutia || entry.Bhutia || entry.transliteration_bhutia;
            if (entry.english && bhu) {
              pushPair(entry.english, bhu, fileName);
            }
          }
        });
      }
      break;
    }
  }

  return records;
}

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
  const dataFiles = fs.readdirSync(DATA_DIR)
    .filter(fileName => fileName.endsWith(".json") || fileName.endsWith(".txt"))
    .sort();

  for (const fileName of dataFiles) {
    const filePath = path.join(DATA_DIR, fileName);
    if (!fs.existsSync(filePath)) continue;

    console.log(`Processing ${fileName}...`);

    let records = [];

    if (fileName.endsWith(".txt")) {
      const lines = fs.readFileSync(filePath, "utf-8")
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 5);

      records = lines.map(line => ({
        english: "",
        trans: line,
        native: "",
        searchText: line,
      }));
    } else {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      records = buildRecordsForFile(fileName, data);
    }

    total += await uploadRecords(records, fileName.replace(/\.[^.]+$/, ""));
    console.log(`${fileName} done.\n`);
  }

  console.log(`\nAll done! Total Bhutia vectors uploaded: ${total}`);
  console.log("Now run: node server.js");
}

syncData().catch(err => {
  console.error("Upload failed:", err.message);
  process.exit(1);
});