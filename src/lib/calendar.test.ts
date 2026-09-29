import { describe, expect, it } from "vitest";
import type { PlanEvent } from "../types";
import { eventTimes, icsFor } from "./calendar";

const event: PlanEvent = {
  feature: "",
  kicker: "",
  title: "Dinner, somewhere; nice",
  date: "2026-10-21",
  time: "19:30",
  hours: 3,
  place: "Rooftop",
  address: "1 Main St",
  mapUrl: null,
  dress: "Anything",
  note: "Bring nothing.",
};

describe("eventTimes", () => {
  it("reads the local start and adds the length", () => {
    const t = eventTimes(event);
    expect(t?.start).toEqual(new Date(2026, 9, 21, 19, 30));
    expect(t?.end).toEqual(new Date(2026, 9, 21, 22, 30));
  });
  it("rolls past midnight", () => {
    expect(eventTimes({ ...event, time: "23:00", hours: 2 })?.end).toEqual(
      new Date(2026, 9, 22, 1, 0),
    );
  });
  it("returns null for a bad time", () => {
    expect(eventTimes({ ...event, time: "evening" })).toBeNull();
  });
});

describe("icsFor", () => {
  const ics = icsFor(event, new Date(Date.UTC(2026, 8, 28, 12, 0, 0))) ?? "";
  it("writes floating local times with CRLF line endings", () => {
    expect(ics).toContain("DTSTART:20261021T193000\r\n");
    expect(ics).toContain("DTEND:20261021T223000\r\n");
    expect(ics).toContain("DTSTAMP:20260928T120000Z\r\n");
  });
  it("escapes commas and semicolons", () => {
    expect(ics).toContain("SUMMARY:Dinner\\, somewhere\\; nice");
    expect(ics).toContain("LOCATION:Rooftop\\, 1 Main St");
  });
});
