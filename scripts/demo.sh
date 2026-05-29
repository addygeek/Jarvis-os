#!/usr/bin/env bash
# JarvisOS API demo — run with backend up (npm run dev:backend or npm run dev)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# shellcheck disable=SC1091
[[ -f .env ]] && set -a && source .env && set +a

API="${JARVIS_API_URL:-http://localhost:${PORT:-3847}}"
API="${API%/}"

echo "==> JarvisOS demo (API: $API)"
echo ""

require_curl() {
  command -v curl >/dev/null 2>&1 || {
    echo "ERROR: curl is required" >&2
    exit 1
  }
}

require_curl

wait_for_api() {
  local tries=0
  until curl -sS --max-time 2 "$API/api/health" >/dev/null 2>&1; do
    tries=$((tries + 1))
    if [[ $tries -ge 30 ]]; then
      echo "ERROR: API not reachable at $API (start: npm run dev:backend)" >&2
      exit 1
    fi
    sleep 1
  done
}

wait_for_api

# Long Ollama steps (plan, chat) can take 30–90s on first load
CURL_LLM=(curl -sS --max-time 120)

echo "1. Health check"
curl -sS "$API/api/health" | head -c 500
echo -e "\n"

echo "2. List tools"
curl -sS "$API/api/tools" | head -c 800
echo -e "\n"

echo "3. Plan only (no execution)"
"${CURL_LLM[@]}" -X POST "$API/api/plan" \
  -H "Content-Type: application/json" \
  -d '{"intent":"List files in my Downloads folder"}' | head -c 1200
echo -e "\n"

echo "4. Chat (conversational — no tool verbs)"
"${CURL_LLM[@]}" -X POST "$API/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message":"Hey Jarvis. How can you help me on this Mac?","executePlan":false}' | head -c 800
echo -e "\n"

echo "5. Chat with plan execution (actionable intent)"
"${CURL_LLM[@]}" -X POST "$API/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message":"Open Safari and tell me when done","executePlan":true}' | head -c 1500
echo -e "\n"

echo "6. Desktop search (POST /api/search)"
curl -sS -X POST "$API/api/search" \
  -H "Content-Type: application/json" \
  -d '{"query":"pdf","folders":["desktop","downloads","documents"],"limit":5}' | head -c 600
echo -e "\n"

echo "7. Research summarize (POST /api/research/summarize)"
curl -sS -X POST "$API/api/research/summarize" \
  -H "Content-Type: application/json" \
  -d '{"folder":"downloads","maxPdfs":2}' | head -c 800
echo -e "\n"

echo "8. App launcher demo (Chrome, VS Code, Safari)"
curl -sS -X POST "$API/api/tools/demo/apps" | head -c 500
echo -e "\n"

echo "9. Tool execute — get volume"
curl -sS -X POST "$API/api/tools/execute" \
  -H "Content-Type: application/json" \
  -d '{"name":"system","parameters":{"action":"get_volume"}}' | head -c 400
echo -e "\n"

echo "10. Voice transcribe (skipped if no sample audio)"
VOICE_SAMPLE="${JARVIS_VOICE_SAMPLE:-$ROOT/voice/samples/hello.wav}"
if [[ -f "$VOICE_SAMPLE" ]]; then
  curl -sS -X POST "$API/api/voice/transcribe" \
    -F "audio=@${VOICE_SAMPLE}" | head -c 500
else
  echo "skip: no audio at $VOICE_SAMPLE (set JARVIS_VOICE_SAMPLE to enable)"
fi
echo -e "\n"

echo "11. Organize folder (dry run)"
curl -sS -X POST "$API/api/organize" \
  -H "Content-Type: application/json" \
  -d '{"folder":"downloads","dryRun":true,"maxDepth":2}' | head -c 600
echo -e "\n"

echo "12. Knowledge query"
curl -sS -X POST "$API/api/knowledge/query" \
  -H "Content-Type: application/json" \
  -d '{"query":"healthcare research","limit":3}' | head -c 600
echo -e "\n"

echo "13. Ollama / gemma4:e4b health (via /api/health)"
curl -sS "$API/api/health" | head -c 800
echo -e "\n"

echo "14. Calendar tool — write .ics"
curl -sS -X POST "$API/api/tools/execute" \
  -H "Content-Type: application/json" \
  -d '{"name":"calendar","parameters":{"action":"create_event","title":"JarvisOS demo","start":"2026-06-01T15:00:00.000Z","end":"2026-06-01T16:00:00.000Z","method":"ics"}}' | head -c 500
echo -e "\n"

echo "15. Email tool — draft .eml"
curl -sS -X POST "$API/api/tools/execute" \
  -H "Content-Type: application/json" \
  -d '{"name":"email","parameters":{"action":"draft_eml","to":"prof@example.edu","subject":"JarvisOS demo","body":"Draft from demo.sh"}}' | head -c 500
echo -e "\n"

echo "16. Presentation tool — HTML deck"
curl -sS -X POST "$API/api/tools/execute" \
  -H "Content-Type: application/json" \
  -d '{"name":"presentation","parameters":{"action":"generate_html","title":"JarvisOS Demo","slides":[{"title":"Hello","bullets":["Offline AI","macOS tools"]}]}}' | head -c 500
echo -e "\n"

echo "==> PRD-style walkthrough (manual)"
cat <<'EOF'

Simulated product demo (see prd.md):

  User: "Hey Jarvis."
  Jarvis: "How can I help?"

  User: "Find all healthcare papers and summarize them."
  → folder_scan + pdf tools + documents summarize pipeline

  User: "Create a PowerPoint."
  → presentation tool (HTML deck or outline in ~/JarvisOS/presentations/)

  User: "Open Chrome and email it to my professor."
  → app_launcher + browser + email (draft .eml or Mail compose)

Run step 4 for the greeting; step 5 for a live macOS action when Ollama + tools are healthy.
EOF
