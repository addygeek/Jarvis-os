import { describe, expect, it } from "vitest";
import {
  DEFAULT_ALLOWLIST,
  getCommandBase,
  isCommandBlocked,
  validateTerminalCommand,
} from "./safety.js";

describe("terminal safety", () => {
  it("extracts base command from simple and quoted commands", () => {
    expect(getCommandBase("ls -la")).toBe("ls");
    expect(getCommandBase('"npm" run test')).toBe("npm");
  });

  it("blocks dangerous rm patterns", () => {
    expect(isCommandBlocked("rm -rf /")).toMatch(/Blocked/);
    expect(isCommandBlocked("sudo rm -rf /var")).toMatch(/Blocked/);
    expect(isCommandBlocked("dd if=/dev/zero of=/dev/sda")).toMatch(/Blocked/);
  });

  it("allows safe allowlisted commands", () => {
    expect(validateTerminalCommand({ command: "ls -la" })).toBeNull();
    expect(validateTerminalCommand({ command: "echo hello" })).toBeNull();
  });

  it("blocks non-allowlisted commands without confirmation", () => {
    const err = validateTerminalCommand({ command: "shutdown -h now" });
    expect(err).not.toBeNull();
    expect(err!).toContain("allowlist");
    expect(err!).toContain("confirmDangerous");
  });

  it("allows non-allowlisted commands with confirmDangerous", () => {
    expect(
      validateTerminalCommand({
        command: "wget http://example.com",
        confirmDangerous: true,
      }),
    ).toBeNull();
  });

  it("respects custom allowlist", () => {
    expect(
      validateTerminalCommand({
        command: "custom-tool --flag",
        allowlist: ["custom-tool"],
      }),
    ).toBeNull();
    expect(DEFAULT_ALLOWLIST).toContain("ls");
  });
});
