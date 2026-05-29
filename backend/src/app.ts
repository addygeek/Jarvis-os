import cors from "cors";
import express from "express";
import { appConfig } from "./config.js";
import { errorHandler } from "./middleware/error-handler.js";
import chatRouter from "./routes/chat.js";
import chatStreamRouter from "./routes/chat-stream.js";
import cleanupRouter from "./routes/cleanup.js";
import codeRouter from "./routes/code.js";
import executeRouter from "./routes/execute.js";
import healthRouter from "./routes/health.js";
import knowledgeRouter from "./routes/knowledge.js";
import memoryRouter from "./routes/memory.js";
import organizeRouter from "./routes/organize.js";
import agentRouter from "./routes/agent.js";
import streamRouter from "./routes/stream.js";
import planRouter from "./routes/plan.js";
import presentationsRouter from "./routes/presentations.js";
import researchRouter from "./routes/research.js";
import filesRouter from "./routes/files.js";
import searchRouter from "./routes/search.js";
import toolsRouter from "./routes/tools.js";
import { createVoiceRouter } from "@jarvisos/voice/server";

export function createApp(): express.Application {
  const app = express();

  app.use(
    cors({
      origin: appConfig.corsOrigins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "2mb" }));

  app.get("/", (_req, res) => {
    res.json({
      name: "JarvisOS API",
      version: "0.1.0",
      docs: "/api/health",
    });
  });

  app.use("/api/health", healthRouter);
  app.use("/api/chat", chatRouter);
  app.use("/api/chat/stream", chatStreamRouter);
  app.use("/api/research", researchRouter);
  app.use("/api/search", searchRouter);
  app.use("/api/files", filesRouter);
  app.use("/api/files/search", searchRouter);
  app.use("/api/tools", toolsRouter);
  app.use("/api/agent", agentRouter);
  app.use("/api/agent/stream", streamRouter);
  app.use("/api/plan", planRouter);
  app.use("/api/execute", executeRouter);
  app.use("/api/memory", memoryRouter);
  app.use("/api/organize", organizeRouter);
  app.use("/api/cleanup", cleanupRouter);
  app.use("/api/knowledge", knowledgeRouter);
  app.use("/api/presentations", presentationsRouter);
  app.use("/api/code", codeRouter);
  app.use("/api/voice", createVoiceRouter() as unknown as express.Router);

  app.use(errorHandler);

  return app;
}
