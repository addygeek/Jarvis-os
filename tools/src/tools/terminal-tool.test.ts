import { describe, expect, it, vi } from "vitest";
import { terminalTool } from "./terminal-tool.js";

const execMock = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
  exec: execMock,
}));

describe("terminalTool", () => {
  it("blocks dangerous commands before exec", async () => {
    const result = await terminalTool.execute({ command: "rm -rf /" });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Blocked/);
    expect(execMock).not.toHaveBeenCalled();
  });

  it("blocks non-allowlisted commands without confirmation", async () => {
    const result = await terminalTool.execute({ command: "shutdown -h now" });

    expect(result.success).toBe(false);
    expect(result.error).toContain("allowlist");
    expect(execMock).not.toHaveBeenCalled();
  });

  it("allows allowlisted commands through safety checks", async () => {
    const { validateTerminalCommand } = await import("../utils/safety.js");
    expect(validateTerminalCommand({ command: "echo hello" })).toBeNull();
  });
});
