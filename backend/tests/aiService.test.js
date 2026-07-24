import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

vi.mock("node-fetch", () => ({
  default: fetchMock,
}));

describe("aiService", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    process.env.GEMINI_API_KEY = "test-gemini-key";
    delete process.env.local;
  });

  it("uses the Gemini API key from process.env", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: "translated" } }],
      }),
      text: vi.fn(),
    });

    const { askAI } = await import("../services/aiService.js");
    const result = await askAI([{ role: "user", content: "hello" }]);

    expect(result).toBe("translated");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-gemini-key",
        }),
      }),
    );
  });
});
