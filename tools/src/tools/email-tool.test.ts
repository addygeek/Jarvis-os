import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emailTool } from "./email-tool.js";
import * as execModule from "../utils/exec.js";
import * as pathsModule from "../utils/paths.js";

vi.mock("../utils/exec.js", () => ({
  runOsascript: vi.fn(),
}));

const mockedRunOsascript = vi.mocked(execModule.runOsascript);

describe("emailTool", () => {
  let tempDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "jarvis-email-"));
    vi.spyOn(pathsModule, "JARVIS_EMAIL_DRAFTS_DIR", "get").mockReturnValue(tempDir);
    mockedRunOsascript.mockResolvedValue("");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("writes a draft .eml file", async () => {
    const result = await emailTool.execute({
      action: "draft_eml",
      to: "prof@example.edu",
      subject: "Research summary",
      body: "Please find the summary attached.",
    });

    expect(result.success).toBe(true);
    const filePath = (result.data as { path: string }).path;
    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, "utf8");
    expect(content).toContain("Subject: Research summary");
    expect(content).toContain("prof@example.edu");
  });

  it("opens Mail compose via osascript", async () => {
    const result = await emailTool.execute({
      action: "compose",
      subject: "Hello",
      body: "Quick note",
    });

    expect(result.success).toBe(true);
    expect(mockedRunOsascript).toHaveBeenCalled();
    expect(mockedRunOsascript.mock.calls[0]?.[0]).toContain('tell application "Mail"');
  });
});
