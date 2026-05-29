# @jarvisos/tools

macOS tool layer for JarvisOS agents. Each tool implements the `Tool` interface and is registered via `ToolRegistry`.

## Install & build

```bash
cd tools
npm install
npm run build
```

## Usage

```ts
import { toolRegistry } from "@jarvisos/tools";

const result = await toolRegistry.execute("app_launcher", { app: "chrome" });
```

## App launcher demos (Chrome, VS Code, Safari)

```ts
await toolRegistry.execute("app_launcher", { app: "chrome" });
await toolRegistry.execute("app_launcher", { app: "vscode" });
await toolRegistry.execute("app_launcher", { app: "safari" });
```

Or via API: `POST /api/demo/apps` (launches all three for smoke testing).

## System actions (volume, dark mode, WiFi)

```ts
await toolRegistry.execute("system", { action: "set_volume", level: 50 });
await toolRegistry.execute("system", { action: "get_volume" });
await toolRegistry.execute("system", { action: "set_dark_mode", enabled: true });
await toolRegistry.execute("system", { action: "get_dark_mode" });
await toolRegistry.execute("system", { action: "open_wifi_settings" });
```

Requires macOS and Automation permissions for System Events (dark mode).

## Tools (MVP)

| Tool | Name | Status |
|------|------|--------|
| File | `file` | Implemented |
| Browser | `browser` | Implemented |
| Terminal | `terminal` | Implemented |
| App launcher | `app_launcher` | Implemented |
| PDF | `pdf` | Implemented |
| Notes | `notes` | Implemented |
| Folder scan | `folder_scan` | Implemented |
| System | `system` | Implemented (volume, dark mode, WiFi settings) |
| Calendar | `calendar` | MVP (Calendar.app or `.ics` in `~/JarvisOS/calendar/`) |
| Email | `email` | MVP (`.eml` drafts or Mail compose) |
| Presentation | `presentation` | MVP (HTML deck / markdown in `~/JarvisOS/presentations/`) |
