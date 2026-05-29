import fs from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fileTool } from "./file-tool.js";

vi.mock("node:fs/promises", () => ({
  default: {
    readdir: vi.fn(),
    stat: vi.fn(),
    readFile: vi.fn(),
    mkdir: vi.fn(),
    rename: vi.fn(),
    unlink: vi.fn(),
    rm: vi.fn(),
  },
}));

const mockedFs = vi.mocked(fs);

describe("fileTool", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists directory entries", async () => {
    mockedFs.readdir.mockResolvedValue([
      { name: "report.pdf", isDirectory: () => false },
      { name: "archive", isDirectory: () => true },
    ] as Awaited<ReturnType<typeof fs.readdir>>);

    const result = await fileTool.execute({
      action: "list",
      path: "/tmp/jarvis-test",
    });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      path: "/tmp/jarvis-test",
      entries: [
        { name: "report.pdf", isDirectory: false },
        { name: "archive", isDirectory: true },
      ],
    });
    expect(mockedFs.readdir).toHaveBeenCalledWith("/tmp/jarvis-test", {
      withFileTypes: true,
    });
  });

  it("fails when action is missing", async () => {
    const result = await fileTool.execute({});
    expect(result.success).toBe(false);
    expect(result.error).toContain("action");
  });
});
