import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calendarTool } from "./calendar-tool.js";
import * as execModule from "../utils/exec.js";
import * as pathsModule from "../utils/paths.js";

vi.mock("../utils/exec.js", () => ({
  runOsascript: vi.fn(),
}));

const mockedRunOsascript = vi.mocked(execModule.runOsascript);

describe("calendarTool", () => {
  let tempDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "jarvis-calendar-"));
    vi.spyOn(pathsModule, "JARVIS_CALENDAR_DIR", "get").mockReturnValue(tempDir);
    mockedRunOsascript.mockResolvedValue("");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("writes an .ics file when method is ics", async () => {
    const result = await calendarTool.execute({
      action: "create_event",
      title: "Team sync",
      start: "2026-05-30T14:00:00.000Z",
      end: "2026-05-30T15:00:00.000Z",
      method: "ics",
    });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ method: "ics" });
    const filePath = (result.data as { path: string }).path;
    expect(fs.existsSync(filePath)).toBe(true);
    expect(fs.readFileSync(filePath, "utf8")).toContain("BEGIN:VCALENDAR");
    expect(mockedRunOsascript).not.toHaveBeenCalled();
  });

  it("falls back to ics when Calendar.app fails in auto mode", async () => {
    mockedRunOsascript.mockRejectedValue(new Error("Automation denied"));

    const result = await calendarTool.execute({
      action: "create_event",
      title: "Backup event",
      start: "2026-05-30T14:00:00.000Z",
      end: "2026-05-30T15:00:00.000Z",
      method: "auto",
    });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ method: "ics", fallbackFrom: "calendar" });
  });

  it("lists ics files in the calendar directory", async () => {
    fs.writeFileSync(path.join(tempDir, "sample.ics"), "BEGIN:VCALENDAR", "utf8");

    const result = await calendarTool.execute({ action: "list_ics" });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ count: 1 });
  });
});
