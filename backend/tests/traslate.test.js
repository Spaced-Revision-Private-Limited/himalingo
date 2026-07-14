// backend/tests/translate.test.js
import { describe, it, expect } from "vitest";
import { buildDictionaryTranslation } from "../routes/translate.js";

// ── Helper functions copied from translate.js ─────────────────────────────
// In future: export these from translate.js and import here

function isEcho(result, query) {
  const r = result.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  const q = query.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  return r === q || r.includes(q) || q.includes(r);
}

function hasEnglish(result) {
  const commonEnglish = [
    "the","is","are","you","how","what","good","morning",
    "thank","hello","please","yes","no","water","food",
    "mother","father","sister","brother","life","earth"
  ];
  const words = result.toLowerCase().split(" ");
  return words.some(w => commonEnglish.includes(w));
}

function cleanOutput(text) {
  return text
    .split("\n")[0]
    .replace(/.*is translated as:?/gi, "")
    .replace(/.*can be translated as:?/gi, "")
    .replace(/.*in bhutia.*is:?/gi, "")
    .replace(/^[\d\.\-\*\•]+\s*/, "")
    .replace(/["'""''`]/g, "")
    .trim();
}

// ── isEcho tests ──────────────────────────────────────────────────────────
describe("isEcho()", () => {
  it("detects AI returning same English word", () => {
    expect(isEcho("hello", "hello")).toBe(true);
  });

  it("does NOT flag correct Bhutia translation", () => {
    expect(isEcho("Kuzu Zangpo", "hello")).toBe(false);
  });

  it("does NOT flag Bhutia for 'how are you'", () => {
    expect(isEcho("Kuzu de le ga", "how are you")).toBe(false);
  });

  it("is case insensitive", () => {
    expect(isEcho("HELLO", "hello")).toBe(true);
  });

  it("detects partial echo", () => {
    expect(isEcho("hello there friend", "hello")).toBe(true);
  });
});

// ── hasEnglish tests ──────────────────────────────────────────────────────
describe("hasEnglish()", () => {
  it("detects English word 'water' in output", () => {
    expect(hasEnglish("water is Chu")).toBe(true);
  });

  it("detects English word 'hello' in output", () => {
    expect(hasEnglish("hello means Kuzu Zangpo")).toBe(true);
  });

  it("does NOT flag correct Bhutia output", () => {
    expect(hasEnglish("Kuzu Zangpo")).toBe(false);
  });

  it("does NOT flag Thuchi-chi", () => {
    expect(hasEnglish("Thuchi-chi")).toBe(false);
  });

  it("does NOT flag Thopa Delek", () => {
    expect(hasEnglish("Thopa Delek")).toBe(false);
  });
});

// ── cleanOutput tests ─────────────────────────────────────────────────────
describe("buildDictionaryTranslation()", () => {
  it("translates multi-word phrases using dictionary entries", () => {
    const entries = [
      { english: "thank", bhutia: "Tashi" },
      { english: "you", bhutia: "Khyu" },
    ];

    expect(buildDictionaryTranslation("thank you", entries)).toBe("Tashi Khyu");
  });

  it("falls back to phrase matches when the full phrase exists", () => {
    const entries = [
      { english: "good morning", bhutia: "Kuzu Zangpo" },
      { english: "good", bhutia: "Kuzu" },
      { english: "morning", bhutia: "Zangpo" },
    ];

    expect(buildDictionaryTranslation("good morning", entries)).toBe("Kuzu Zangpo");
  });
});

describe("cleanOutput()", () => {
  it("keeps only first line", () => {
    expect(cleanOutput("Kuzu Zangpo\nextra line")).toBe("Kuzu Zangpo");
  });

  it("removes 'is translated as:' prefix", () => {
    expect(cleanOutput("Hello is translated as: Kuzu Zangpo")).toBe("Kuzu Zangpo");
  });

  it("removes bullet points", () => {
    expect(cleanOutput("• Kuzu Zangpo")).toBe("Kuzu Zangpo");
  });

  it("removes numbered list prefix", () => {
    expect(cleanOutput("1. Kuzu Zangpo")).toBe("Kuzu Zangpo");
  });

  it("removes quotes", () => {
    expect(cleanOutput('"Kuzu Zangpo"')).toBe("Kuzu Zangpo");
  });

  it("trims whitespace", () => {
    expect(cleanOutput("  Kuzu Zangpo  ")).toBe("Kuzu Zangpo");
  });

  it("handles already clean output", () => {
    expect(cleanOutput("Kuzu de le ga")).toBe("Kuzu de le ga");
  });
});
