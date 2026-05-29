import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Tool } from "../types.js";
import { JARVIS_EMAIL_DRAFTS_DIR } from "../utils/paths.js";
import { runOsascript } from "../utils/exec.js";
import { escapeAppleScriptString, slugifyFilename } from "../utils/macos.js";
import {
  fail,
  ok,
  optionalString,
  requireString,
} from "../utils/result.js";

function ensureDraftsDir(): string {
  fs.mkdirSync(JARVIS_EMAIL_DRAFTS_DIR, { recursive: true });
  return JARVIS_EMAIL_DRAFTS_DIR;
}

function foldHeaderLine(value: string, maxLen = 76): string {
  if (value.length <= maxLen) {
    return value;
  }
  const parts: string[] = [];
  let rest = value;
  while (rest.length > maxLen) {
    parts.push(rest.slice(0, maxLen));
    rest = ` ${rest.slice(maxLen)}`;
  }
  parts.push(rest);
  return parts.join("\r\n");
}

function buildEml(options: {
  to?: string;
  cc?: string;
  subject: string;
  body: string;
}): string {
  const lines = [
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    `Message-ID: <${randomUUID()}@jarvisos.local>`,
    `Date: ${new Date().toUTCString()}`,
  ];
  if (options.to) {
    lines.push(`To: ${foldHeaderLine(options.to)}`);
  }
  if (options.cc) {
    lines.push(`Cc: ${foldHeaderLine(options.cc)}`);
  }
  lines.push(`Subject: ${foldHeaderLine(options.subject)}`);
  lines.push("", options.body.replace(/\n/g, "\r\n"));
  return `${lines.join("\r\n")}\r\n`;
}

async function composeInMail(options: {
  to?: string;
  cc?: string;
  subject: string;
  body: string;
}): Promise<void> {
  const subject = escapeAppleScriptString(options.subject);
  const body = escapeAppleScriptString(options.body);
  const to = options.to ? escapeAppleScriptString(options.to) : "";
  const cc = options.cc ? escapeAppleScriptString(options.cc) : "";

  let recipientBlock = "";
  if (to) {
    recipientBlock += `
    make new to recipient at end of to recipients with properties {address:"${to}"}
`;
  }
  if (cc) {
    recipientBlock += `
    make new cc recipient at end of cc recipients with properties {address:"${cc}"}
`;
  }

  const script = `
tell application "Mail"
  activate
  set newMessage to make new outgoing message with properties {subject:"${subject}", content:"${body}", visible:true}
  tell newMessage
${recipientBlock}
  end tell
end tell
`.trim();

  await runOsascript(script);
}

export const emailTool: Tool = {
  name: "email",
  description:
    "Draft .eml files in ~/JarvisOS/email/drafts/ or open Mail.app compose (osascript) with subject/body.",
  parameters: {
    type: "object",
    required: ["action"],
    properties: {
      action: {
        type: "string",
        enum: ["draft_eml", "compose", "list_drafts"],
        description: "draft_eml | compose | list_drafts",
      },
      to: { type: "string" },
      cc: { type: "string" },
      subject: { type: "string" },
      body: { type: "string" },
      limit: { type: "number", default: 20 },
    },
  },
  async execute(params) {
    try {
      const action = requireString(params, "action");

      if (action === "list_drafts") {
        const dir = ensureDraftsDir();
        const limit =
          typeof params.limit === "number" && params.limit > 0
            ? Math.min(params.limit, 100)
            : 20;
        const files = fs
          .readdirSync(dir)
          .filter((f) => f.endsWith(".eml"))
          .map((name) => {
            const filePath = path.join(dir, name);
            const stat = fs.statSync(filePath);
            return { name, path: filePath, size: stat.size, mtime: stat.mtime.toISOString() };
          })
          .sort((a, b) => b.mtime.localeCompare(a.mtime))
          .slice(0, limit);
        return ok({ drafts: files, count: files.length, directory: dir });
      }

      const subject = requireString(params, "subject");
      const body = optionalString(params, "body") ?? "";
      const to = optionalString(params, "to");
      const cc = optionalString(params, "cc");

      if (action === "draft_eml") {
        const dir = ensureDraftsDir();
        const filename = `${slugifyFilename(subject)}.eml`;
        const filePath = path.join(dir, filename);
        const eml = buildEml({ to, cc, subject, body });
        fs.writeFileSync(filePath, eml, "utf8");
        return ok(
          { path: filePath, subject, to, cc, directory: dir },
          `Draft saved to ${filePath}`,
        );
      }

      if (action === "compose") {
        await composeInMail({ to, cc, subject, body });
        return ok(
          { method: "mail_compose", subject, to, cc },
          "Opened Mail.app compose window",
        );
      }

      return fail(`Unknown action: ${action}`);
    } catch (err) {
      return fail(err instanceof Error ? err.message : String(err));
    }
  },
};
