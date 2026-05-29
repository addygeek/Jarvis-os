import { beforeEach, describe, expect, it, vi } from "vitest";
import { appLauncherTool } from "./app-launcher-tool.js";
import * as execModule from "../utils/exec.js";

vi.mock("../utils/exec.js", () => ({
  execFile: vi.fn(),
}));

const mockedExecFile = vi.mocked(execModule.execFile);

describe("appLauncherTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedExecFile.mockResolvedValue({ stdout: "", stderr: "" });
  });

  it("resolves known app aliases before launching", async () => {
    const result = await appLauncherTool.execute({ app: "chrome" });

    expect(result.success).toBe(true);
    expect(mockedExecFile).toHaveBeenCalledWith("open", ["-a", "Google Chrome"]);
    expect(result.data).toMatchObject({ app: "Google Chrome" });
  });

  it("passes through unknown app names", async () => {
    await appLauncherTool.execute({ app: "My Custom App" });

    expect(mockedExecFile).toHaveBeenCalledWith("open", ["-a", "My Custom App"]);
  });

  it("opens a path with the resolved app", async () => {
    await appLauncherTool.execute({
      app: "vscode",
      path: "/Users/test/project",
    });

    expect(mockedExecFile).toHaveBeenCalledWith("open", [
      "-a",
      "Visual Studio Code",
      "/Users/test/project",
    ]);
  });

  it("requires app parameter", async () => {
    const result = await appLauncherTool.execute({});
    expect(result.success).toBe(false);
    expect(result.error).toContain("app");
  });
});
