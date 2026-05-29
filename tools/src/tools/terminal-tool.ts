import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { Tool } from "../types.js";
import { validateTerminalCommand } from "../utils/safety.js";
import { fail, ok, optionalBoolean, optionalString, requireString } from "../utils/result.js";

const execAsync = promisify(exec);

export const terminalTool: Tool = {
  name: "terminal",
  description:
    "Run shell commands on macOS. Dangerous commands are blocked. Non-allowlisted commands require confirmDangerous: true.",
  parameters: {
    type: "object",
    required: ["command"],
    properties: {
      command: { type: "string", description: "Shell command to execute" },
      cwd: { type: "string", description: "Working directory" },
      confirmDangerous: {
        type: "boolean",
        description: "Set true to run commands not on the default allowlist",
      },
      allowlist: {
        type: "array",
        items: { type: "string" },
        description: "Override default command allowlist (base command names only)",
      },
      timeoutMs: { type: "number", default: 30000 },
    },
  },
  async execute(params) {
    try {
      const command = requireString(params, "command");
      const confirmDangerous = optionalBoolean(params, "confirmDangerous") ?? false;
      const allowlist = Array.isArray(params.allowlist)
        ? params.allowlist.filter((v): v is string => typeof v === "string")
        : undefined;
      const cwd = optionalString(params, "cwd");
      const timeoutMs =
        typeof params.timeoutMs === "number" && params.timeoutMs > 0 ? params.timeoutMs : 30_000;

      const safetyError = validateTerminalCommand({ command, allowlist, confirmDangerous });
      if (safetyError) {
        return fail(safetyError);
      }

      const { stdout, stderr } = await execAsync(command, {
        cwd,
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024,
        shell: "/bin/zsh",
        env: process.env,
      });

      return ok({
        command,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0,
      });
    } catch (err) {
      const execErr = err as { stdout?: string; stderr?: string; code?: number; message?: string };
      if (execErr.stdout !== undefined || execErr.stderr !== undefined) {
        return ok({
          command: params.command,
          stdout: (execErr.stdout ?? "").trim(),
          stderr: (execErr.stderr ?? "").trim(),
          exitCode: execErr.code ?? 1,
        });
      }
      return fail(err instanceof Error ? err.message : String(err));
    }
  },
};
