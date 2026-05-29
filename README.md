# ⚡ JarvisOS: Local-First Agentic Workstation Orchestrator

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-blue.svg)](package.json)
[![Tests Passed](https://img.shields.io/badge/tests-49%20passed-brightgreen.svg)](agent/src/orchestrator.test.ts)
[![Platform](https://img.shields.io/badge/platform-macOS-lightgrey.svg)](#prerequisites)

**JarvisOS** is a local, offline-first agentic operating system layer built to automate, orchestrate, and control your macOS workstation. Powered by Google’s **Gemma 4 (E4B)** model running locally via Ollama, JarvisOS allows you to command your workstation through natural text and voice—translating user intents into structured execution plans and invoking native hardware hooks safely and privately without cloud telemetry.

---

## 💡 What We Built & The Role of Google Gemma

### 🏗️ What We Built
JarvisOS is an **autonomous agentic desktop abstraction layer** designed to run entirely locally on macOS. It bridges the gap between natural language (voice/text) and system command execution by building:
1.  **A Multi-Workspace Monorepo:** Houses the React/Electron client dashboard, a DI-driven Node.js backend, a plan cache service, document processing, and SQLite persistence.
2.  **A Native System Tool Registry:** A collection of 11 system integrations allowing the agent to read/write files, launch desktop apps, query search indexes, adjust hardware state, write emails, and generate presentations directly on your Mac.
3.  **Local RAG & File Mesh:** A local knowledge management layer capable of ingesting PDF directories and performing semantic document search.

### 🧠 The Role & Use of Google Gemma 4
Google's **Gemma 4 (E4B)** acts as the centralized reasoning engine (or "Kernel brain") governing JarvisOS. It impacts every layer of the system:

#### ⚡ How Gemma 4 Impacts the System
*   **Zero-Latency Resource Footprint:** By using the optimized **Gemma 4 E4B** (4-bit quantized) local weights, the model runs directly inside your Mac's unified memory, taking advantage of Apple Silicon's Apple Neural Engine (ANE) and Metal-accelerated GPU. This eliminates API network lag and provides fast local token generation.
*   **100% Privacy & Data Sovereignty:** Since all reasoning is handled on-device, sensitive workstation data, files, calendar entries, and shell logs never leave the local environment, providing enterprise-grade security.
*   **Offline Independence:** JarvisOS runs completely offline—on flights, remote areas, or firewalled environments—with zero ongoing API usage fees.

#### 🔧 Code-Level Use Cases in the Monorepo
Gemma 4 is utilized across four critical pipelines in the codebase:
1.  **Structured Task Planning ([planner.ts](file:///Users/addy/Coding/test/google%20gemini/agent/src/planner.ts)):** Analyzes free-form user queries and converts them into sequential, executable JSON steps matching our native tools.
2.  **Conversational Chat ([orchestrator.ts](file:///Users/addy/Coding/test/google%20gemini/agent/src/orchestrator.ts)):** Handles non-actionable queries, maintaining conversation context over conversation logs.
3.  **Outcome Summarization ([executor.ts](file:///Users/addy/Coding/test/google%20gemini/agent/src/executor.ts)):** Analyzes raw POSIX command outcomes and synthesizes them into clean, human-friendly conversational summaries.
4.  **Research & Document Summarization ([documents/src/summarize.ts](file:///Users/addy/Coding/test/google%20gemini/documents/src/pdf.ts)):** Reads PDF documents, extracts text segments, and batches them into structural chapter summaries.

---

## 📖 System Blueprints & Architecture Docs
For deep dives into design decisions, internal APIs, and Gemma prompt structures, refer to our comprehensive documentation suite:

*   **System Overview & Setup:**
    *   [QUICKSTART.md](file:///Users/addy/Coding/test/google%20gemini/QUICKSTART.md) — Get up and running in 5 minutes.
    *   [prd.md](file:///Users/addy/Coding/test/google%20gemini/prd.md) — Full product requirements and execution loop specs.
    *   [INTEGRATION.md](file:///Users/addy/Coding/test/google%20gemini/INTEGRATION.md) — Package mappings, startup flows, and API schemas.
*   **Core Architecture & Lifecycle Guides:**
    *   [High-Level Architecture](file:///Users/addy/Coding/test/google%20gemini/docs/architecture/01-high-level-architecture.md) — Monorepo components and service layers.
    *   [Request Lifecycle Flow](file:///Users/addy/Coding/test/google%20gemini/docs/architecture/02-request-lifecycle.md) — Sequence from chat input to tool execution.
    *   [Memory & RAG Persistent Mesh](file:///Users/addy/Coding/test/google%20gemini/docs/architecture/03-memory-and-rag.md) — SQLite schema and LanceDB vector mesh.
    *   [Tool & Plugin Subsystem](file:///Users/addy/Coding/test/google%20gemini/docs/architecture/04-tools-and-plugins.md) — macOS automation mechanisms and sandboxing.
    *   [Frontend UI & Electron Shell](file:///Users/addy/Coding/test/google%20gemini/docs/architecture/05-frontend-and-electron.md) — Vite structure and main-to-renderer IPC.
*   **Local LLM (Gemma) Customization Guides:**
    *   [Gemma Orchestration Overview](file:///Users/addy/Coding/test/google%20gemini/docs/gemini/01-overview.md) — The rationale behind local Gemma models.
    *   [Model Configuration & Settings](file:///Users/addy/Coding/test/google%20gemini/docs/gemini/02-configuration.md) — Hyperparameters for E4B optimizer.
    *   [Prompts & Agent Behavior](file:///Users/addy/Coding/test/google%20gemini/docs/gemini/04-prompts-and-agent-behavior.md) — Deep dive into `<|think|>` channel engineering.

---

## 🚀 Key Highlights & Features

- 🧠 **Local LLM Orchestration:** Custom-prompted local inference with Google's **Gemma 4 E4B** optimized for JSON tool emission.
- ⚡ **Instantaneous Dual-Layer Caching (Up to 300x Speedup):**
  - **Plan Cache:** Normalizes and caches query plans for 10 minutes, bypassing LLM planning latency entirely for repeated intents.
  - **Execution Summary Cache:** If tool execution results (`success`, `data`, `error`) are identical to a previous run, the agent reuses the natural language summary—reducing repeated launch commands (like *"Open Safari"*) to under **250ms**.
- 📂 **High-Performance Filesystem Cache:** Caches recursive folder walks for 15 seconds, making nested directory scans, searches, and PDF ingests instantaneous.
- 🛠️ **11 Native macOS Tools:**
  1.  **File System (`file`):** Read, move, delete, rename, list, or scan files inside Desktop, Downloads, and Documents.
  2.  **App Launcher (`app_launcher`):** Start/terminate applications via `open -a` (Chrome, VS Code, Slack, Zoom, finder, etc.).
  3.  **Browser Interface (`browser`):** Open URLs, search Google, or route queries. Falls back automatically to web search queries for browser targets.
  4.  **Terminal Sandbox (`terminal`):** Execute macOS shell commands securely.
  5.  **PDF Reader (`pdf`):** Extract text and structural parameters from documents.
  6.  **Quick Notes (`notes`):** Read, write, or delete logs in a local SQLite DB.
  7.  **Folder Scanner (`folder_scan`):** Traverses and gathers directory metadata.
  8.  **System Controller (`system`):** Adjust volume, check power stats, and inspect system resources.
  9.  **Calendar Integration (`calendar`):** Generates `.ics` calendar events.
  10. **Email Integrator (`email`):** Composes `.eml` email drafts instantly.
  11. **Presentation Suite (`presentation`):** Generates local HTML slide decks.
- 🎙️ **Voice Integration:** Low-latency speech-to-text using local `whisper.cpp` or cloud Deepgram.
- 💻 **Premium Visual Experience:** Rich dark-mode glassmorphic Electron + React dashboard featuring real-time Ollama status monitors, interactive chat, file drop zones, plan visualization panels, and a custom **About me** profile page.

---

## 🏛️ System Architecture

```mermaid
flowchart TB
  subgraph client [Desktop UI Shell]
    UI[Electron + React UI]
  end

  subgraph api [Local API Service]
    Express[Express Server — port 3847]
  end

  subgraph brain [Core Agentic Kernel]
    Agent[Agent Orchestrator]
    Planner[Planner Prompt Engine]
    Executor[Executor Engine]
    Ollama[Ollama Server — gemma4:e4b]
    Cache[In-Memory LRU & Plan Cache]
  end

  subgraph exec [OS Interface Layer]
    Tools[Tool Registry]
    Mac[macOS Subsystem — AppleScript / POSIX / Shell]
  end

  subgraph mem [Persistence Mesh]
    SQLite[(SQLite Database)]
    Docs[PDFs / Uploads folder]
  end

  UI --> Express
  Express --> Agent
  Agent --> Cache
  Agent --> Planner
  Agent --> Executor
  Planner --> Ollama
  Executor --> Ollama
  Agent --> Tools
  Tools --> Mac
  Agent --> SQLite
  Docs --> SQLite
```

---

## 📦 Monorepo Layout

```text
jarvis-os/
├── frontend/         # Electron + React dashboard (Tailwind CSS, Lucide icons)
├── backend/          # Express API server (routes, DI container, RAG, cleanups)
├── agent/            # Core planner, executor, and local Ollama Client
├── tools/            # macOS tool registry & AppleScript wrappers
├── memory/           # SQLite store (messages, tasks, KV caching, RAG vector stubs)
├── voice/            # Speech-to-text transcriber (whisper.cpp & Deepgram integrations)
├── documents/        # PDF extraction and batch document summarizer
├── prompts/          # System prompt templates (*.system.md)
├── database/         # SQLite schema & SQL migrations
├── models/           # Ollama setup and model tuning guidelines
└── scripts/          # Setup, demonstration, and environment helpers
```

---

## ⚙️ Prerequisites

- **Host System:** macOS (required for POSIX/AppleScript system tools).
- **Runtime:** Node.js 20+ (Node 22 recommended).
- **LLM Engine:** [Ollama](https://ollama.com) serving model `gemma4:e4b` (minimum 4-bit quantization).
- **STT (Optional):** [whisper.cpp](https://github.com/ggerganov/whisper.cpp) for offline voice transcription, or a `DEEPGRAM_API_KEY` for cloud transcription.
- **Documents (Optional):** Python 3 + `PyMuPDF` for advanced PDF text extraction.

---

## 🚀 Getting Started

### 1. Model Provisioning
Download and start Ollama, then pull the targeted Gemma 4 model:
```bash
ollama serve
ollama pull gemma4:e4b
```

### 2. Installation
Clone the repository and run the automated setup script:
```bash
git clone https://github.com/addygeek/Jarvis-os.git
cd Jarvis-os
chmod +x scripts/setup.sh scripts/demo.sh
./scripts/setup.sh
```
*The setup script installs monorepo dependencies, links workspaces, creates a default `.env` file, and rebuilds the local `better-sqlite3` native binaries.*

---

## 🛠️ Development Workflow

Run the full stack (API + Vite UI) in parallel:
```bash
npm run dev
```
- **Backend API:** [http://127.0.0.1:3847](http://127.0.0.1:3847)
- **Vite React UI:** [http://localhost:5173](http://localhost:5173) (Proxies `/api` routes directly to the backend)

### Running Electron Desktop Dev Shell
Start the Electron wrapper to run the application as a native macOS window:
```bash
npm run electron:dev -w @jarvisos/frontend
```
*Use `JARVIS_SPAWN_BACKEND=1 npm run electron:dev -w @jarvisos/frontend` to auto-spawn the Express API server concurrently.*

### Run Tests
JarvisOS includes 49 unit tests verifying API endpoints, safety bounds, planner outputs, and tool integrations:
```bash
npm test
```

---

## ⚡ Caching Architecture (Why it's so fast)

JarvisOS employs a custom **multi-tier cache matrix** designed to bypass local inference latency for common desktop automation tasks:

```
User Query: "Open Safari"
  │
  ├──► [Plan Cache] ──(HIT)──► Retrieve Cached Plan
  │      │                       │
  │    (MISS)                  (Run Steps)
  │      │                       │
  │   Query Ollama             Exec: open -a Safari
  │   (3-5s Latency)             │
  │      │                       ▼
  │      └─────────────────► [Summary Cache] ──(HIT)──► Reuse "Safari opened" (Roundtrip: 240ms!)
  │                            │
  │                          (MISS)
  │                            │
  │                         Query Ollama to Summarize (10-15s Latency)
```

1.  **Intent Plan Cache:** When a request is made, the query string is normalized. If an identical intent was planned within the last 10 minutes, the planning step is bypassed (saving **3–5 seconds** of LLM latency).
2.  **Outcome Summary Cache:** Once the plan is executed, the tool outputs are compared to the cached run. If the outputs match exactly, the previously generated summary is returned directly, completely avoiding Ollama's summary generation (saving **10–15 seconds** of LLM latency).

---

## 🌐 API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status & registered macOS tools |
| `POST` | `/api/chat` | Main assistant chat endpoint (with automatic planning & execution) |
| `POST` | `/api/plan` | Accepts an intent string and returns a structured JSON execution plan |
| `POST` | `/api/execute` | Executes a provided JSON execution plan |
| `GET` | `/api/tools` | Returns schemas for the 11 registered macOS tools |
| `POST` | `/api/tools/execute` | Directly executes a target tool (used for debug/testing) |
| `POST` | `/api/voice/transcribe` | Transcribes multipart audio uploads into text |
| `GET` | `/api/search?q=...` | Fast recursive desktop/downloads/documents file search |
| `POST` | `/api/research/summarize` | Batch summarizes documents and PDFs in a target folder |
| `DELETE`| `/api/agent/cache` | Flushes all plan, tool, and summary caches |

---

## 🎨 Meet the Creator

JarvisOS is built and maintained by **Aditya Kumar**. You can connect with Aditya or explore his other AI initiatives through the links below:

- **Portfolio / Website:** [darexai.com](https://darexai.com)
- **GitHub:** [@addygeek](https://github.com/addygeek)
- **LinkedIn:** [Aditya Kumar](https://www.linkedin.com/in/aditya-kumar-learner/)
- **Email:** aditya@darexai.com
- **Phone / WhatsApp:** +91 9119267828

---

## 📄 License

This repository is licensed under the [MIT License](LICENSE). Feel free to inspect, modify, fork, or use it in your open-source projects!
