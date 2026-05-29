import { config as loadEnv } from "dotenv";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..", "..");

loadEnv({ path: join(projectRoot, ".env") });

function parseOrigins(value: string | undefined): string[] {
  const defaults = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ];
  if (!value?.trim()) return defaults;
  return value.split(",").map((o) => o.trim()).filter(Boolean);
}

export const appConfig = {
  port: Number(process.env.PORT ?? 3847),
  nodeEnv: process.env.NODE_ENV ?? "development",
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434",
    model: process.env.OLLAMA_MODEL ?? "gemma4:e4b",
    // Apple Silicon: use all available GPU layers (Metal / ANE via Ollama)
    numGpu: Number(process.env.OLLAMA_NUM_GPU ?? 99),
    // Flash-attention for M-series chips (speeds up long contexts)
    flashAttn: process.env.OLLAMA_FLASH_ATTN !== "false",
    // Context window — 8k is a good balance for speed vs quality on M5
    numCtx: Number(process.env.OLLAMA_NUM_CTX ?? 8192),
  },
  databasePath:
    process.env.DATABASE_PATH ??
    join(projectRoot, "database", "jarvisos.db"),
  uploadsDir:
    process.env.UPLOADS_DIR ?? join(projectRoot, "data", "uploads"),
  corsOrigins: parseOrigins(process.env.CORS_ORIGINS),
  projectRoot,
} as const;
