#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> JarvisOS setup"
echo ""

fail() {
  echo "ERROR: $1" >&2
  exit 1
}

warn() {
  echo "WARN: $1"
}

ok() {
  echo "OK:  $1"
}

# Node.js
if command -v node >/dev/null 2>&1; then
  ok "Node $(node -v)"
else
  fail "Node.js 20+ required. Install from https://nodejs.org/"
fi

if command -v npm >/dev/null 2>&1; then
  ok "npm $(npm -v)"
else
  fail "npm not found"
fi

# Ollama
if command -v ollama >/dev/null 2>&1; then
  ok "Ollama $(ollama --version 2>/dev/null | head -1 || echo 'installed')"
  if ollama list 2>/dev/null | grep -qE 'gemma4:e4b|gemma4|gemma'; then
    ok "Gemma model present (ollama list)"
  else
    warn "Pull a model: ollama pull gemma4:e4b  (see models/README.md)"
  fi
else
  warn "Ollama not found — install from https://ollama.com then: ollama pull gemma4:e4b"
fi

# Whisper.cpp CLI (optional)
WHISPER_BIN="${WHISPER_CLI:-whisper}"
if command -v "$WHISPER_BIN" >/dev/null 2>&1; then
  ok "Whisper CLI found: $WHISPER_BIN"
else
  warn "Whisper CLI not found ($WHISPER_BIN). Voice will use @xenova/transformers (whisper-tiny) in dev."
  warn "Build whisper.cpp: https://github.com/ggerganov/whisper.cpp"
fi

# Python + PyMuPDF (optional, for documents fallback)
if command -v "${PYTHON:-python3}" >/dev/null 2>&1; then
  PY="${PYTHON:-python3}"
  ok "Python $($PY --version 2>&1)"
  if "$PY" -c "import fitz" 2>/dev/null; then
    ok "PyMuPDF (fitz) available"
  else
    warn "PyMuPDF not installed. documents/ will use pdf-parse in Node. Optional: pip install pymupdf"
  fi
else
  warn "Python3 not found — PDF extraction uses pdf-parse only"
fi

# Env file
if [[ ! -f .env ]]; then
  cp .env.example .env
  ok "Created .env from .env.example"
else
  ok ".env already exists"
fi

mkdir -p data

echo ""
echo "==> Installing npm dependencies..."
npm install

echo ""
echo "==> Building workspaces..."
npm run build --workspaces --if-present 2>/dev/null || true

echo ""
echo "Setup complete. Next steps:"
echo "  1. ollama pull gemma4:e4b"
echo "  2. Edit .env if needed"
echo "  3. See README.md for architecture and demo script"
