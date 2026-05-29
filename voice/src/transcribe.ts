import { DeepgramClient } from "@deepgram/sdk";
import { execFile } from "node:child_process";
import { access, mkdtemp, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const WHISPER_CANDIDATES = [
  process.env.WHISPER_CLI,
  "whisper",
  "whisper-cli",
  "main",
].filter(Boolean) as string[];

const TRANSFORMERS_MODEL =
  process.env.WHISPER_TRANSFORMERS_MODEL ?? "Xenova/whisper-tiny.en";

type TranscriberPipeline = (
  audio: Float32Array,
) => Promise<{ text: string } | string>;

let transformersPipelinePromise: Promise<TranscriberPipeline> | null = null;

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function extensionForMime(mimeType: string): string {
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "m4a";
  return "webm";
}

function needsFfmpegConversion(mimeType: string, filePath: string): boolean {
  if (mimeType.includes("webm") || mimeType.includes("ogg")) return true;
  const ext = extname(filePath).toLowerCase();
  return ext === ".webm" || ext === ".ogg" || ext === ".m4a" || ext === ".mp4";
}

// ── Deepgram ────────────────────────────────────────────────────────────────

async function transcribeWithDeepgram(
  buffer: Buffer,
  mimeType = "audio/webm",
): Promise<string> {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) throw new Error("DEEPGRAM_API_KEY not set");

  const client = new DeepgramClient({ apiKey });

  void mimeType;
  const result = await client.listen.v1.media.transcribeFile(buffer, {
    model: "nova-3",
    smart_format: true,
    language: "en",
  });

  const text =
    "results" in result
      ? (result.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "")
      : "";
  return text.trim();
}

// ── ffmpeg (WebM → WAV 16 kHz mono) ─────────────────────────────────────────

export async function isFfmpegAvailable(): Promise<boolean> {
  try {
    await execFileAsync("ffmpeg", ["-version"]);
    return true;
  } catch {
    return false;
  }
}

async function convertToWav16kMono(
  inputPath: string,
): Promise<{ path: string; cleanup: () => Promise<void> }> {
  const dir = await mkdtemp(join(tmpdir(), "jarvis-voice-wav-"));
  const outPath = join(dir, "audio.wav");
  await execFileAsync(
    "ffmpeg",
    ["-y", "-i", inputPath, "-ar", "16000", "-ac", "1", "-f", "wav", outPath],
    { maxBuffer: 25 * 1024 * 1024 },
  );
  return {
    path: outPath,
    cleanup: async () => {
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    },
  };
}

async function ensureWavPath(
  audioPath: string,
  mimeType: string,
): Promise<{ path: string; cleanup?: () => Promise<void> }> {
  if (audioPath.toLowerCase().endsWith(".wav") && !needsFfmpegConversion(mimeType, audioPath)) {
    return { path: audioPath };
  }

  if (!(await isFfmpegAvailable())) {
    if (needsFfmpegConversion(mimeType, audioPath)) {
      throw new Error(
        "Browser WebM/OGG requires ffmpeg for local transcription. Install: brew install ffmpeg — or set DEEPGRAM_API_KEY, or upload 16 kHz mono WAV.",
      );
    }
    return { path: audioPath };
  }

  const converted = await convertToWav16kMono(audioPath);
  return { path: converted.path, cleanup: converted.cleanup };
}

// ── Whisper CLI ───────────────────────────────────────────────────────────────

async function resolveWhisperCli(): Promise<string | null> {
  for (const candidate of WHISPER_CANDIDATES) {
    if (candidate.includes("/")) {
      if (await fileExists(candidate)) return candidate;
      continue;
    }
    try {
      const { stdout } = await execFileAsync("which", [candidate]);
      const resolved = stdout.trim();
      if (resolved) return resolved;
    } catch {
      /* try next */
    }
  }
  return null;
}

async function transcribeWithWhisperCli(audioPath: string, cli: string): Promise<string> {
  const modelFlag = process.env.WHISPER_MODEL_PATH
    ? ["-m", process.env.WHISPER_MODEL_PATH]
    : [];
  const args = [...modelFlag, "-f", audioPath, "--output-txt", "--no-timestamps"];

  try {
    const { stdout } = await execFileAsync(cli, args, {
      maxBuffer: 10 * 1024 * 1024,
    });
    const trimmed = stdout.trim();
    if (trimmed) return trimmed;
  } catch {
    /* fall through to read .txt output */
  }

  const txtPath = `${audioPath}.txt`;
  if (await fileExists(txtPath)) {
    const text = await readFile(txtPath, "utf8");
    await unlink(txtPath).catch(() => undefined);
    return text.trim();
  }

  throw new Error(`Whisper CLI (${cli}) produced no output`);
}

// ── @xenova/transformers (dev fallback, WAV only) ─────────────────────────────

async function getTransformersPipeline(): Promise<TranscriberPipeline> {
  if (!transformersPipelinePromise) {
    transformersPipelinePromise = (async () => {
      const { pipeline } = await import("@xenova/transformers");
      return pipeline(
        "automatic-speech-recognition",
        TRANSFORMERS_MODEL,
      ) as Promise<TranscriberPipeline>;
    })();
  }
  return transformersPipelinePromise;
}

async function wavFileToFloat32(wavPath: string): Promise<Float32Array> {
  const { WaveFile } = await import("wavefile");
  const buffer = await readFile(wavPath);
  const wav = new WaveFile(buffer);
  wav.toBitDepth("32f");
  wav.toSampleRate(16000);
  // getSamples() returns Float64Array after toBitDepth("32f") in wavefile v6
  const samples = wav.getSamples() as unknown as Float32Array | Float32Array[];
  if (Array.isArray(samples)) {
    return samples[0];
  }
  return samples;
}

async function transcribeWithTransformers(wavPath: string): Promise<string> {
  const transcriber = await getTransformersPipeline();
  const audioData = await wavFileToFloat32(wavPath);
  const output = await transcriber(audioData);
  if (typeof output === "string") return output.trim();
  return (output.text ?? "").trim();
}

export async function isTransformersAvailable(): Promise<boolean> {
  try {
    await import("@xenova/transformers");
    return true;
  } catch {
    return false;
  }
}

// ── Temp file helpers ────────────────────────────────────────────────────────

async function bufferToTempFile(
  buffer: Buffer,
  ext = "webm",
): Promise<{ path: string; cleanup: () => Promise<void> }> {
  const dir = await mkdtemp(join(tmpdir(), "jarvis-voice-"));
  const path = join(dir, `audio.${ext}`);
  await writeFile(path, buffer);
  return {
    path,
    cleanup: async () => {
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    },
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Transcribe audio.
 * Priority: Deepgram (WebM OK) → Whisper CLI → @xenova/transformers (WAV 16 kHz).
 * WebM/OGG without Deepgram: convert via ffmpeg when installed.
 */
export async function transcribe(
  audioPathOrBuffer: string | Buffer,
  mimeType = "audio/webm",
): Promise<string> {
  if (process.env.DEEPGRAM_API_KEY) {
    const buffer = Buffer.isBuffer(audioPathOrBuffer)
      ? audioPathOrBuffer
      : await readFile(audioPathOrBuffer);
    return transcribeWithDeepgram(buffer, mimeType);
  }

  let audioPath: string;
  let cleanup: (() => Promise<void>) | undefined;

  if (Buffer.isBuffer(audioPathOrBuffer)) {
    const ext = extensionForMime(mimeType);
    const temp = await bufferToTempFile(audioPathOrBuffer, ext);
    audioPath = temp.path;
    cleanup = temp.cleanup;
  } else {
    if (!(await fileExists(audioPathOrBuffer))) {
      throw new Error(`Audio file not found: ${audioPathOrBuffer}`);
    }
    audioPath = audioPathOrBuffer;
  }

  let wavCleanup: (() => Promise<void>) | undefined;

  try {
    const { path: wavPath, cleanup: wavPathCleanup } = await ensureWavPath(
      audioPath,
      mimeType,
    );
    wavCleanup = wavPathCleanup;

    const cli = await resolveWhisperCli();
    if (cli) {
      try {
        return await transcribeWithWhisperCli(wavPath, cli);
      } catch (err) {
        if (!(await isTransformersAvailable())) throw err;
        /* fall through to transformers */
      }
    }

    if (!(await isTransformersAvailable())) {
      throw new Error(
        "No transcription engine available. Set DEEPGRAM_API_KEY, install whisper.cpp (WHISPER_CLI), or ensure @xenova/transformers is installed.",
      );
    }

    if (!wavPath.toLowerCase().endsWith(".wav")) {
      throw new Error(
        "Local transformers requires WAV. Install ffmpeg (brew install ffmpeg) to convert browser WebM recordings.",
      );
    }

    return transcribeWithTransformers(wavPath);
  } finally {
    if (wavCleanup) await wavCleanup();
    if (cleanup) await cleanup();
  }
}

export async function isDeepgramConfigured(): Promise<boolean> {
  return Boolean(process.env.DEEPGRAM_API_KEY);
}

export async function isWhisperCliAvailable(): Promise<boolean> {
  return (await resolveWhisperCli()) !== null;
}
