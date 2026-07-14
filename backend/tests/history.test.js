import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

const { mockFindOneAndUpdate } = vi.hoisted(() => ({
  mockFindOneAndUpdate: vi.fn(),
}));

vi.mock("../models/History.js", () => ({
  default: {
    findOneAndUpdate: mockFindOneAndUpdate,
    find: vi.fn(),
    findOne: vi.fn(),
    deleteMany: vi.fn(),
    findOneAndDelete: vi.fn(),
  },
}));

import historyRouter from "../routes/history.js";

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  req.user = { id: "user123" };
  next();
});
app.use("/api/history", historyRouter);

describe("History routes", () => {
  beforeEach(() => {
    mockFindOneAndUpdate.mockReset();
  });

  it("creates a new chat session entry when requested", async () => {
    mockFindOneAndUpdate.mockResolvedValue({ chatId: "chat_123" });

    const response = await request(app)
      .post("/api/history/session")
      .send({
        chatId: "chat_123",
        title: "New chat",
        mode: "chat",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockFindOneAndUpdate).toHaveBeenCalled();
  });
});
