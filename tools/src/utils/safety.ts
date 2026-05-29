import path from "node:path";

const BLOCKED_PATTERNS: RegExp[] = [
  /\brm\s+(-[a-zA-Z]*f[a-zA-Z]*\s+)*\/\s*$/,
  /\brm\s+(-[a-zA-Z]*f[a-zA-Z]*\s+)*\/\s/,
  /\brm\s+(-[a-zA-Z]*r[a-zA-Z]*\s+)*(-[a-zA-Z]*f[a-zA-Z]*\s+)*\/\s*$/,
  /\bsudo\s+rm\b/i,
  /\bmkfs\b/i,
  /\bdd\s+if=.*of=\/dev\//i,
  /\b:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/,
  />\s*\/dev\/sd[a-z]/i,
  /\bchmod\s+-R\s+777\s+\//,
  /\bformat\s+c:/i,
];

export const DEFAULT_ALLOWLIST = [
  "ls",
  "pwd",
  "echo",
  "cat",
  "head",
  "tail",
  "grep",
  "find",
  "which",
  "node",
  "npm",
  "npx",
  "git",
  "python3",
  "pip3",
  "brew",
  "curl",
  "wget",
  "mkdir",
  "touch",
  "cp",
  "mv",
  "open",
  "osascript",
  "whoami",
  "date",
  "uname",
];

export interface TerminalSafetyOptions {
  command: string;
  allowlist?: string[];
  confirmDangerous?: boolean;
}

export function getCommandBase(command: string): string {
  const trimmed = command.trim();
  const first = trimmed.split(/\s+/)[0] ?? "";
  return path.basename(first.replace(/^['"]|['"]$/g, ""));
}

export function isCommandBlocked(command: string): string | null {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(command)) {
      return `Blocked dangerous command pattern: ${pattern.source}`;
    }
  }
  if (/\brm\s+.*\s+-rf\s+\//.test(command) || /\brm\s+-rf\s+\//.test(command)) {
    return "Blocked: rm -rf on root or absolute paths is not allowed";
  }
  return null;
}

export function validateTerminalCommand(options: TerminalSafetyOptions): string | null {
  const { command, allowlist, confirmDangerous } = options;

  const blocked = isCommandBlocked(command);
  if (blocked) {
    return blocked;
  }

  const base = getCommandBase(command);
  const allowed = allowlist ?? DEFAULT_ALLOWLIST;

  if (!allowed.includes(base)) {
    if (!confirmDangerous) {
      return `Command "${base}" is not on the allowlist. Pass confirmDangerous: true to run anyway.`;
    }
  }

  return null;
}
