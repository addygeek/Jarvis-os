import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Tool } from "../types.js";
import { JARVIS_CALENDAR_DIR } from "../utils/paths.js";
import { runOsascript } from "../utils/exec.js";
import {
  escapeAppleScriptString,
  formatAppleScriptDate,
  parseIsoDate,
  slugifyFilename,
  toIcsUtc,
} from "../utils/macos.js";
import {
  fail,
  ok,
  optionalString,
  requireString,
} from "../utils/result.js";

type CalendarMethod = "auto" | "calendar" | "ics";

function ensureCalendarDir(): string {
  fs.mkdirSync(JARVIS_CALENDAR_DIR, { recursive: true });
  return JARVIS_CALENDAR_DIR;
}

function buildIcs(options: {
  title: string;
  start: Date;
  end: Date;
  location?: string;
  description?: string;
}): string {
  const uid = `${randomUUID()}@jarvisos.local`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//JarvisOS//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toIcsUtc(new Date())}`,
    `DTSTART:${toIcsUtc(options.start)}`,
    `DTEND:${toIcsUtc(options.end)}`,
    `SUMMARY:${options.title.replace(/\n/g, " ")}`,
  ];
  if (options.location) {
    lines.push(`LOCATION:${options.location.replace(/\n/g, " ")}`);
  }
  if (options.description) {
    lines.push(`DESCRIPTION:${options.description.replace(/\n/g, "\\n")}`);
  }
  lines.push("END:VEVENT", "END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

function writeIcsFile(
  title: string,
  start: Date,
  end: Date,
  location?: string,
  description?: string,
): { path: string; uid: string } {
  const dir = ensureCalendarDir();
  const stamp = start.toISOString().slice(0, 10);
  const filename = `${stamp}-${slugifyFilename(title)}.ics`;
  const filePath = path.join(dir, filename);
  const ics = buildIcs({ title, start, end, location, description });
  fs.writeFileSync(filePath, ics, "utf8");
  const uidMatch = /UID:([^\r\n]+)/.exec(ics);
  return { path: filePath, uid: uidMatch?.[1] ?? filename };
}

async function createAppleCalendarEvent(
  title: string,
  start: Date,
  end: Date,
  location?: string,
  description?: string,
): Promise<void> {
  const summary = escapeAppleScriptString(title);
  const loc = location ? escapeAppleScriptString(location) : "";
  const desc = description ? escapeAppleScriptString(description) : "";
  const startLiteral = escapeAppleScriptString(formatAppleScriptDate(start));
  const endLiteral = escapeAppleScriptString(formatAppleScriptDate(end));

  const locationProp = loc ? `, location:"${loc}"` : "";
  const descProp = desc ? `, description:"${desc}"` : "";

  const script = `
tell application "Calendar"
  activate
  if (count of calendars) = 0 then
    error "No calendars available in Calendar.app"
  end if
  set startDate to date "${startLiteral}"
  set endDate to date "${endLiteral}"
  tell first calendar
    make new event at end with properties {summary:"${summary}", start date:startDate, end date:endDate${locationProp}${descProp}}
  end tell
end tell
`.trim();

  await runOsascript(script);
}

export const calendarTool: Tool = {
  name: "calendar",
  description:
    "Create calendar events via macOS Calendar.app (osascript) or write .ics files to ~/JarvisOS/calendar/.",
  parameters: {
    type: "object",
    required: ["action"],
    properties: {
      action: {
        type: "string",
        enum: ["create_event", "list_ics"],
        description: "create_event | list_ics",
      },
      title: { type: "string" },
      start: { type: "string", description: "ISO 8601 start datetime" },
      end: { type: "string", description: "ISO 8601 end datetime" },
      location: { type: "string" },
      description: { type: "string" },
      method: {
        type: "string",
        enum: ["auto", "calendar", "ics"],
        description: "auto tries Calendar.app then falls back to .ics",
      },
      limit: { type: "number", default: 20 },
    },
  },
  async execute(params) {
    try {
      const action = requireString(params, "action");

      if (action === "list_ics") {
        const dir = ensureCalendarDir();
        const limit =
          typeof params.limit === "number" && params.limit > 0
            ? Math.min(params.limit, 100)
            : 20;
        const files = fs
          .readdirSync(dir)
          .filter((f) => f.endsWith(".ics"))
          .map((name) => {
            const filePath = path.join(dir, name);
            const stat = fs.statSync(filePath);
            return { name, path: filePath, size: stat.size, mtime: stat.mtime.toISOString() };
          })
          .sort((a, b) => b.mtime.localeCompare(a.mtime))
          .slice(0, limit);
        return ok({ events: files, count: files.length, directory: dir });
      }

      if (action !== "create_event") {
        return fail(`Unknown action: ${action}`);
      }

      const title = requireString(params, "title");
      const startRaw = requireString(params, "start");
      const endRaw = requireString(params, "end");
      const start = parseIsoDate(startRaw, "start");
      const end = parseIsoDate(endRaw, "end");
      if (end.getTime() <= start.getTime()) {
        return fail("end must be after start");
      }

      const location = optionalString(params, "location");
      const description = optionalString(params, "description");
      const method = (optionalString(params, "method") ?? "auto") as CalendarMethod;

      if (method === "ics") {
        const written = writeIcsFile(title, start, end, location, description);
        return ok(
          { method: "ics", ...written, directory: JARVIS_CALENDAR_DIR },
          `Wrote calendar event to ${written.path}`,
        );
      }

      if (method === "calendar") {
        await createAppleCalendarEvent(title, start, end, location, description);
        return ok(
          { method: "calendar", title, start: start.toISOString(), end: end.toISOString() },
          "Created event in Calendar.app",
        );
      }

      try {
        await createAppleCalendarEvent(title, start, end, location, description);
        return ok(
          { method: "calendar", title, start: start.toISOString(), end: end.toISOString() },
          "Created event in Calendar.app",
        );
      } catch (calendarErr) {
        const written = writeIcsFile(title, start, end, location, description);
        const reason =
          calendarErr instanceof Error ? calendarErr.message : String(calendarErr);
        return ok(
          {
            method: "ics",
            fallbackFrom: "calendar",
            fallbackReason: reason,
            ...written,
            directory: JARVIS_CALENDAR_DIR,
          },
          `Calendar.app unavailable; wrote ${written.path}`,
        );
      }
    } catch (err) {
      return fail(err instanceof Error ? err.message : String(err));
    }
  },
};
