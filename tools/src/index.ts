export type { Tool, ToolResult } from "./types.js";
export { ToolRegistry, defaultTools, toolRegistry } from "./registry.js";

export { fileTool } from "./tools/file-tool.js";
export { browserTool } from "./tools/browser-tool.js";
export { terminalTool } from "./tools/terminal-tool.js";
export { appLauncherTool, APP_LAUNCHER_APPS } from "./tools/app-launcher-tool.js";
export { pdfTool } from "./tools/pdf-tool.js";
export { notesTool, resetNotesDb } from "./tools/notes-tool.js";
export { folderScanTool } from "./tools/folder-scan-tool.js";
export type { FileMetadata } from "./tools/folder-scan-tool.js";
export { systemTool } from "./tools/system-tool.js";
export { calendarTool } from "./tools/calendar-tool.js";
export { emailTool } from "./tools/email-tool.js";
export { presentationTool } from "./tools/presentation-tool.js";

export {
  expandPath,
  resolveSpecialFolder,
  JARVIS_HOME,
  JARVIS_NOTES_DIR,
  JARVIS_CALENDAR_DIR,
  JARVIS_EMAIL_DIR,
  JARVIS_PRESENTATIONS_DIR,
} from "./utils/paths.js";
export { validateTerminalCommand, DEFAULT_ALLOWLIST } from "./utils/safety.js";
