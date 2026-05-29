import express, { type Router } from "express";
import multer from "multer";
import { DeepgramClient } from "@deepgram/sdk";
import {
  isDeepgramConfigured,
  isFfmpegAvailable,
  isTransformersAvailable,
  isWhisperCliAvailable,
  transcribe,
} from "./transcribe.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

/**
 * Express router for voice transcription.
 * Mount on backend: `app.use('/api/voice', createVoiceRouter())`
 *
 * POST /api/voice/transcribe
 *   - multipart field `audio` (WebM/WAV from browser)
 *   - JSON body `{ "audioPath": "/absolute/path" }` (agent / local dev)
 */
export function createVoiceRouter(): Router {
  const router = express.Router();

  router.post(
    "/transcribe",
    upload.single("audio") as unknown as express.RequestHandler,
    async (req, res) => {
      try {
        let text: string;

        if (req.file?.buffer) {
          const mimeType = req.file.mimetype || "audio/webm";
          text = await transcribe(req.file.buffer, mimeType);
        } else if (
          typeof req.body?.audioPath === "string" &&
          req.body.audioPath.length > 0
        ) {
          text = await transcribe(req.body.audioPath);
        } else {
          res.status(400).json({
            error: "Provide multipart field `audio` or JSON body `{ audioPath }`",
          });
          return;
        }

        res.json({ text });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Transcription failed";
        res.status(500).json({ error: message });
      }
    },
  );

  router.post("/speak", async (req, res) => {
    const { text, model = "aura-asteria-en" } = req.body as {
      text?: string;
      model?: string;
    };

    if (!text?.trim()) {
      res.status(400).json({ error: "text is required" });
      return;
    }

    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      res.status(503).json({ error: "DEEPGRAM_API_KEY not configured" });
      return;
    }

    try {
      const client = new DeepgramClient({ apiKey });
      const binaryResponse = await client.speak.v1.audio.generate({
        text,
        model: model as Parameters<typeof client.speak.v1.audio.generate>[0]["model"],
        encoding: "mp3",
      });
      const audioBuffer = await binaryResponse.arrayBuffer();
      res.setHeader("Content-Type", "audio/mpeg");
      res.send(Buffer.from(audioBuffer));
    } catch (err) {
      if (!res.headersSent) {
        res
          .status(500)
          .json({ error: err instanceof Error ? err.message : "TTS failed" });
      }
    }
  });

  router.get("/health", async (_req, res) => {
    const [deepgram, whisper, ffmpeg, transformers] = await Promise.all([
      isDeepgramConfigured(),
      isWhisperCliAvailable(),
      isFfmpegAvailable(),
      isTransformersAvailable(),
    ]);
    const engine = deepgram
      ? "deepgram"
      : whisper
        ? "whisper-cli"
        : transformers
          ? ffmpeg
            ? "transformers+ffmpeg"
            : "transformers"
          : "none";
    res.json({
      ok: engine !== "none",
      service: "voice",
      engine,
      deepgram,
      whisper,
      ffmpeg,
      transformers,
    });
  });

  return router;
}
