import type { PlanEvent } from "../types";
import { pad, parseDay } from "./text";

/** Escapes text for an iCalendar field (backslash, comma, semicolon, new lines). */
function escape(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/([,;])/g, "\\$1")
    .replace(/\r?\n/g, "\\n");
}

/** Local "floating" time: the phone reads it in its own time zone. */
function stamp(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

function utcStamp(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/** Start and end of the event as local dates, or null when `date`/`time` can't be read. */
export function eventTimes(
  event: PlanEvent,
): { start: Date; end: Date } | null {
  const day = parseDay(event.date);
  const m = /^(\d{1,2}):(\d{2})$/.exec(event.time);
  if (!day || !m) return null;
  const start = new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    Number(m[1]),
    Number(m[2]),
  );
  const end = new Date(
    start.getTime() + Math.max(0.5, event.hours) * 3_600_000,
  );
  return { start, end };
}

/** An .ics file with the event, so she can add it to her calendar in one tap. */
export function icsFor(
  event: PlanEvent,
  now: Date = new Date(),
): string | null {
  const times = eventTimes(event);
  if (!times) return null;
  const location = [event.place, event.address].filter(Boolean).join(", ");
  const description = [event.note, `Dress: ${event.dress}`].join("\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Reel Twenty-Two//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:reel-${event.date}-${event.time.replace(":", "")}@reel22`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${stamp(times.start)}`,
    `DTEND:${stamp(times.end)}`,
    `SUMMARY:${escape(event.title)}`,
    `LOCATION:${escape(location)}`,
    `DESCRIPTION:${escape(description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

/** Hands the .ics to the phone (iOS shows "Add to Calendar"). */
export function downloadIcs(event: PlanEvent): void {
  const ics = icsFor(event);
  if (!ics) return;
  const url = URL.createObjectURL(
    new Blob([ics], { type: "text/calendar;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "birthday-plan.ics";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
