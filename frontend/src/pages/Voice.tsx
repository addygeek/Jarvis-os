import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Loader2,
  Mic,
  MicOff,
  Radio,
  Square,
  Volume2,
  XCircle,
} from "lucide-react";
import { ApiError, api } from "@/lib/api";
import { useBackend } from "@/hooks/useBackend";
import { useToast } from "@/context/ToastContext";

function pickRecorderMimeType(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type))
      return type;
  }
  return "audio/webm";
}

type Phase = "idle" | "recording" | "transcribing" | "thinking" | "executing" | "speaking";

interface StepState {
  id: string;
  tool: string;
  description: string;
  status: "pending" | "running" | "done" | "failed";
}

export function Voice() {
  const { online } = useBackend();
  const { pushToast } = useToast();

  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState<string | null>(null);
  const [reply, setReply] = useState<string>("");
  const [steps, setSteps] = useState<StepState[]>([]);
  const [, setActiveStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef("audio/webm");
  const streamAbortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const replyRef = useRef("");

  useEffect(() => () => { if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current); }, []);

  const stopAudio = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
  }, []);

  const speakText = useCallback(async (text: string) => {
    stopAudio();
    setPhase("speaking");
    try {
      const url = await api.speakText(text);
      blobUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      await audio.play();
      audio.onended = () => { setPhase("idle"); audioRef.current = null; };
    } catch {
      setPhase("idle");
    }
  }, [stopAudio]);

  const handleBlob = useCallback(async (blob: Blob) => {
    if (blob.size === 0) { setError("No audio captured. Try again."); setPhase("idle"); return; }

    setPhase("transcribing");
    let text: string;
    try {
      text = await api.transcribeVoice(
        blob,
        mimeTypeRef.current.includes("ogg") ? "recording.ogg" : "recording.webm",
      );
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Transcription failed.";
      setError(msg); pushToast("error", msg); setPhase("idle"); return;
    }

    const trimmed = text.trim();
    if (!trimmed) { setError("Nothing heard — try again."); setPhase("idle"); return; }

    setTranscript(trimmed);
    setReply("");
    setSteps([]);
    setActiveStep(null);
    setPhase("thinking");
    replyRef.current = "";

    const abort = api.streamChatFull(
      trimmed,
      {
        onPlan: (planSteps) => {
          if (planSteps.length > 0) {
            setPhase("executing");
            setSteps(
              planSteps.map((s) => ({
                id: s.id,
                tool: s.tool,
                description: s.description,
                status: "pending",
              })),
            );
          }
        },
        onStepStart: (stepId, _tool, _desc) => {
          setActiveStep(stepId);
          setSteps((prev) =>
            prev.map((s) => (s.id === stepId ? { ...s, status: "running" } : s)),
          );
        },
        onStepDone: (stepId, _tool, success) => {
          setActiveStep(null);
          setSteps((prev) =>
            prev.map((s) =>
              s.id === stepId ? { ...s, status: success ? "done" : "failed" } : s,
            ),
          );
        },
        onToken: (token) => {
          // When tokens start arriving after execution, switch to thinking phase
          setPhase((p) => (p === "executing" ? "thinking" : p));
          replyRef.current += token;
          setReply(replyRef.current);
        },
        onError: (msg) => {
          setError(msg); pushToast("error", msg); setPhase("idle");
        },
        onDone: () => {
          streamAbortRef.current = null;
          const finalText = replyRef.current;
          if (finalText) void speakText(finalText);
          else setPhase("idle");
        },
      },
    );
    streamAbortRef.current = abort;
  }, [pushToast, speakText]);

  const stopRecording = useCallback(() => {
    const r = mediaRecorderRef.current;
    if (r && r.state !== "inactive") r.stop();
    mediaRecorderRef.current = null;
  }, []);

  const startRecording = useCallback(async () => {
    setError(null); setTranscript(null); setReply(""); setSteps([]); setActiveStep(null);
    stopAudio();
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Microphone not available."); return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickRecorderMimeType();
      mimeTypeRef.current = mimeType;
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        void handleBlob(new Blob(chunksRef.current, { type: mimeTypeRef.current }));
      };
      recorder.start();
      setPhase("recording");
    } catch {
      setError("Microphone permission denied.");
    }
  }, [stopAudio, handleBlob]);

  const toggle = useCallback(() => {
    if (phase === "recording") stopRecording();
    else if (phase === "idle") void startRecording();
    else if (phase === "speaking") { stopAudio(); setPhase("idle"); }
  }, [phase, stopRecording, startRecording, stopAudio]);

  const isRecording = phase === "recording";
  const isSpeaking = phase === "speaking";
  const isProcessing = phase === "transcribing" || phase === "thinking" || phase === "executing";

  const phaseLabel: Record<Phase, string> = {
    idle: "Tap to speak",
    recording: "Listening…  tap to stop",
    transcribing: "Transcribing…",
    thinking: "Thinking…",
    executing: "Executing…",
    speaking: "Speaking…  tap to stop",
  };

  return (
    <div className="flex h-full flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg text-center">

        {/* Header */}
        <div className="mb-2 flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-jarvis-accent">
          <Radio className="h-3 w-3" />
          Voice
        </div>
        <h1 className="text-2xl font-semibold text-jarvis-text">Hey Jarvis</h1>

        {/* Orb */}
        <div className="relative mx-auto mt-8 flex h-48 w-48 items-center justify-center">
          {isRecording && (
            <>
              <span className="absolute inset-0 animate-ping rounded-full bg-jarvis-accent/10" />
              <span className="absolute inset-2 animate-ping rounded-full bg-jarvis-accent/5 [animation-delay:200ms]" />
            </>
          )}
          {isSpeaking && (
            <span className="absolute inset-0 animate-pulse rounded-full bg-jarvis-accent/10" />
          )}
          {isProcessing && (
            <span className="absolute inset-0 animate-pulse rounded-full bg-jarvis-accent/5" />
          )}
          <span
            className={`absolute inset-4 rounded-full transition-all duration-300 ${
              isRecording
                ? "bg-jarvis-accent/20 shadow-glow"
                : isSpeaking
                  ? "bg-jarvis-accent/15"
                  : isProcessing
                    ? "bg-jarvis-elevated/80"
                    : "bg-jarvis-elevated"
            }`}
          />
          <button
            type="button"
            onClick={toggle}
            disabled={isProcessing || !online}
            className={`titlebar-no-drag relative z-10 flex h-28 w-28 items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-jarvis-accent/30 ${
              isRecording
                ? "bg-red-500/90 text-white shadow-lg"
                : isSpeaking
                  ? "bg-jarvis-accent text-jarvis-bg shadow-lg"
                  : "bg-gradient-to-b from-jarvis-elevated to-jarvis-surface text-jarvis-accent ring-2 ring-jarvis-accent/40 hover:ring-jarvis-accent/60"
            } disabled:opacity-40`}
            aria-label={phaseLabel[phase]}
          >
            {isProcessing ? (
              <Loader2 className="h-12 w-12 animate-spin" />
            ) : isRecording ? (
              <Square className="h-10 w-10 fill-current" />
            ) : isSpeaking ? (
              <Volume2 className="h-10 w-10" />
            ) : (
              <Mic className="h-12 w-12" />
            )}
          </button>
        </div>

        {/* Status */}
        <p className="mt-4 min-h-[1.25rem] text-xs text-jarvis-muted transition-all duration-200">
          {online ? (
            phaseLabel[phase]
          ) : (
            <span className="flex items-center justify-center gap-1 text-jarvis-warning">
              <MicOff className="h-3 w-3" /> Backend offline
            </span>
          )}
        </p>

        {/* Transcript */}
        {transcript && (
          <div className="glass-panel mt-6 p-4 text-left animate-fade-in">
            <p className="text-xs font-medium uppercase tracking-wide text-jarvis-muted">You said</p>
            <p className="mt-1.5 text-sm text-jarvis-text">{transcript}</p>
          </div>
        )}

        {/* Agent steps */}
        {steps.length > 0 && (
          <div className="glass-panel mt-4 p-4 text-left animate-fade-in space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-jarvis-muted mb-2">
              Executing
            </p>
            {steps.map((step) => (
              <div key={step.id} className="flex items-start gap-2.5">
                <span className="mt-0.5 shrink-0">
                  {step.status === "done" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-jarvis-accent" />
                  ) : step.status === "failed" ? (
                    <XCircle className="h-3.5 w-3.5 text-jarvis-danger" />
                  ) : step.status === "running" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-jarvis-accent" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-jarvis-muted/40" />
                  )}
                </span>
                <div className="min-w-0">
                  <span
                    className={`text-xs font-medium ${
                      step.status === "running"
                        ? "text-jarvis-accent"
                        : step.status === "done"
                          ? "text-jarvis-text"
                          : step.status === "failed"
                            ? "text-jarvis-danger"
                            : "text-jarvis-muted"
                    }`}
                  >
                    {step.tool}
                  </span>
                  <p className="text-xs text-jarvis-muted leading-snug">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Streaming reply */}
        {(reply || phase === "thinking") && (
          <div className="glass-panel mt-4 p-4 text-left animate-fade-in">
            <div className="flex items-center gap-2 mb-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-jarvis-muted">Jarvis</p>
              {isSpeaking && <Volume2 className="h-3 w-3 animate-pulse text-jarvis-accent" />}
            </div>
            <p className="text-sm leading-relaxed text-jarvis-text">
              {reply}
              {(phase === "thinking" || phase === "executing") && (
                <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-jarvis-accent align-middle" />
              )}
            </p>
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm text-jarvis-danger animate-fade-in">{error}</p>
        )}
      </div>
    </div>
  );
}
