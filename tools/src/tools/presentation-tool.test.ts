import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { presentationTool } from "./presentation-tool.js";
import * as pathsModule from "../utils/paths.js";

describe("presentationTool", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "jarvis-pres-"));
    vi.spyOn(pathsModule, "JARVIS_PRESENTATIONS_DIR", "get").mockReturnValue(tempDir);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("generates an HTML slide deck", async () => {
    const result = await presentationTool.execute({
      action: "generate_html",
      title: "Healthcare NLP",
      slides: [
        { title: "Overview", bullets: ["Goal", "Dataset"] },
        { title: "Results", bullets: ["Accuracy 92%"] },
      ],
    });

    expect(result.success).toBe(true);
    const filePath = (result.data as { path: string }).path;
    expect(fs.existsSync(filePath)).toBe(true);
    const html = fs.readFileSync(filePath, "utf8");
    expect(html).toContain("Healthcare NLP");
    expect(html).toContain("Overview");
  });

  it("generates a markdown outline", async () => {
    const result = await presentationTool.execute({
      action: "generate_outline",
      title: "ACL Talk",
      slides: [{ title: "Intro", bullets: ["Hook"] }],
    });

    expect(result.success).toBe(true);
    const filePath = (result.data as { path: string }).path;
    expect(fs.readFileSync(filePath, "utf8")).toContain("# ACL Talk");
  });
});
