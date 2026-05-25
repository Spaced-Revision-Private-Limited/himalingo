import { describe, it, expect, vi } from "vitest";
import request from "supertest";

// THE SIMPLEST MOCK: Provides everything your Model needs to not crash
vi.mock('mongoose', () => {
  const m = {
    Schema: class { constructor() { return {}; } },
    model: vi.fn().mockReturnValue({
      findOne: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
    }),
    models: {}, // This fixes the "reading User" error
    connect: vi.fn().mockResolvedValue(true),
    connection: { readyState: 1 },
  };
  return { ...m, default: m };
});

// Mock Pinecone
vi.mock('@pinecone-database/pinecone', () => ({
  Pinecone: class { constructor() { this.Index = vi.fn().mockReturnValue({ query: vi.fn() }); } }
}));

import app from "../app.js";

describe("Auth routes", () => {
  it("should expose auth routes under both path prefixes", async () => {
    const loginPayload = {
      email: "user@example.com",
      password: "password123",
    };

    const legacyResponse = await request(app)
      .post("/api/login")
      .send(loginPayload);

    const authResponse = await request(app)
      .post("/api/auth/login")
      .send(loginPayload);

    expect(legacyResponse.status).toBe(401);
    expect(authResponse.status).toBe(401);
    expect(legacyResponse.body.success).toBe(false);
    expect(authResponse.body.success).toBe(false);
  });
});