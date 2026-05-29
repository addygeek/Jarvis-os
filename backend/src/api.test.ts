import express from "express";
import multer from "multer";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app.js";
import { createTinyWavBuffer } from "./test-utils/tiny-wav.js";

const mockTranscribe = vi.hoisted(() => vi.fn().mockResolvedValue("hello from voice"));

vi.mock("@jarvisos/voice/server", () => {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 },
  });

  return {
    createVoiceRouter: () => {
      const router = express.Router();

      router.post(
        "/transcribe",
        upload.single("audio") as unknown as express.RequestHandler,
        async (req, res) => {
          if (req.file?.buffer) {
            const text = await mockTranscribe(req.file.buffer, req.file.mimetype);
            res.json({ text });
            return;
          }
          if (
            typeof req.body?.audioPath === "string" &&
            req.body.audioPath.length > 0
          ) {
            const text = await mockTranscribe(req.body.audioPath);
            res.json({ text });
            return;
          }
          res.status(400).json({
            error: "Provide multipart field `audio` or JSON body `{ audioPath }`",
          });
        },
      );

      router.get("/health", (_req, res) => {
        res.json({ ok: true, service: "voice", engine: "mock" });
      });

      return router;
    },
  };
});

const mockHealthCheck = vi.fn();
const mockGetSchemas = vi.fn();
const mockSearchUserFiles = vi.fn();
const mockAgentChat = vi.fn();

vi.mock("./services/container.js", () => ({
  getContainer: () => ({
    ollama: { healthCheck: mockHealthCheck },
    tools: { getSchemas: mockGetSchemas, list: vi.fn(() => []) },
    agent: { chat: mockAgentChat },
  }),
  shutdownContainer: vi.fn(),
}));

vi.mock("./services/search.js", () => ({
  searchUserFiles: (...args: unknown[]) => mockSearchUserFiles(...args),
}));

describe("API routes", () => {
  beforeEach(() => {
    mockTranscribe.mockReset();
    mockTranscribe.mockResolvedValue("hello from voice");
    mockHealthCheck.mockResolvedValue({ ok: true, modelAvailable: true });
    mockAgentChat.mockResolvedValue({
      conversationId: "conv-test-1",
      response: "Hello from Jarvis.",
    });
    mockGetSchemas.mockReturnValue([
      {
        name: "file",
        description: "File operations",
        parameters: { type: "object", properties: {} },
      },
    ]);
    mockSearchUserFiles.mockResolvedValue({
      query: "report",
      results: [{ path: "/tmp/report.pdf", name: "report.pdf", folder: "desktop" }],
      count: 1,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const app = createApp();

  it("GET /api/health returns service status", async () => {
    const res = await request(app).get("/api/health/");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.tools.count).toBeGreaterThanOrEqual(0);
    expect(mockHealthCheck).toHaveBeenCalled();
  });

  it("GET /api/tools/list returns tool schemas", async () => {
    const res = await request(app).get("/api/tools/list");

    expect(res.status).toBe(200);
    expect(res.body.tools).toHaveLength(1);
    expect(res.body.tools[0].name).toBe("file");
    expect(mockGetSchemas).toHaveBeenCalled();
  });

  it("GET /api/search searches files with mocked tools", async () => {
    const res = await request(app).get("/api/search?q=report");

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.results[0].name).toBe("report.pdf");
    expect(mockSearchUserFiles).toHaveBeenCalledWith({ query: "report" });
  });

  it("GET /api/files/search aliases /api/search", async () => {
    const res = await request(app).get("/api/files/search?q=report");

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(mockSearchUserFiles).toHaveBeenCalledWith({ query: "report" });
  });

  it("POST /api/chat returns 200 with mocked agent", async () => {
    const res = await request(app)
      .post("/api/chat")
      .send({ message: "Hello", executePlan: false });

    expect(res.status).toBe(200);
    expect(res.body.conversationId).toBe("conv-test-1");
    expect(res.body.response).toBe("Hello from Jarvis.");
    expect(mockAgentChat).toHaveBeenCalledWith(
      "Hello",
      expect.objectContaining({ executePlan: false }),
    );
  });

  it("POST /api/files/upload accepts multipart files", async () => {
    const res = await request(app)
      .post("/api/files/upload")
      .attach("files", Buffer.from("hello jarvis"), "note.txt");

    expect(res.status).toBe(201);
    expect(res.body.count).toBe(1);
    expect(res.body.files[0].name).toBe("note.txt");
    expect(res.body.files[0].path).toContain("data/uploads");
  });

  it("POST /api/voice/transcribe returns 400 without audio", async () => {
    const res = await request(app).post("/api/voice/transcribe").send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/audio/i);
    expect(mockTranscribe).not.toHaveBeenCalled();
  });

  it("POST /api/voice/transcribe returns 200 with WAV upload (mocked)", async () => {
    const wav = createTinyWavBuffer();
    const res = await request(app)
      .post("/api/voice/transcribe")
      .attach("audio", wav, {
        filename: "tiny.wav",
        contentType: "audio/wav",
      });

    expect(res.status).toBe(200);
    expect(res.body.text).toBe("hello from voice");
    expect(mockTranscribe).toHaveBeenCalledWith(
      expect.any(Buffer),
      "audio/wav",
    );
  });

  it("GET /api/voice/health returns voice service status", async () => {
    const res = await request(app).get("/api/voice/health");

    expect(res.status).toBe(200);
    expect(res.body.service).toBe("voice");
    expect(res.body.ok).toBe(true);
  });
});
