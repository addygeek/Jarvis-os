import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFileCb);

export interface ExecOptions {
  timeout?: number;
  maxBuffer?: number;
  cwd?: string;
}

export async function execFile(
  command: string,
  args: string[] = [],
  options: ExecOptions = {},
): Promise<{ stdout: string; stderr: string }> {
  const { timeout = 30_000, maxBuffer = 10 * 1024 * 1024, cwd } = options;
  const result = await execFileAsync(command, args, {
    timeout,
    maxBuffer,
    cwd,
    encoding: "utf8",
  });
  return {
    stdout: typeof result.stdout === "string" ? result.stdout : String(result.stdout),
    stderr: typeof result.stderr === "string" ? result.stderr : String(result.stderr),
  };
}

export async function openUrl(url: string): Promise<void> {
  await execFile("open", [url]);
}

export async function openApp(appName: string, args: string[] = []): Promise<void> {
  await execFile("open", ["-a", appName, ...args]);
}

export async function runOsascript(script: string): Promise<string> {
  const { stdout } = await execFile("osascript", ["-e", script]);
  return stdout.trim();
}
