import { describe, expect, it } from "vitest";
import { circlePath, markerPath, parseMarks, seedOf, unmarked } from "./marks";

describe("parseMarks", () => {
  it("splits marker and circle phrases from plain text", () => {
    expect(parseMarks("It’s ==a Girl==")).toEqual([
      { text: "It’s ", mark: null },
      { text: "a Girl", mark: "marker" },
    ]);
    expect(
      parseMarks("Delayed by ((twenty-two years)). ==Sorry.== The end"),
    ).toEqual([
      { text: "Delayed by ", mark: null },
      { text: "twenty-two years", mark: "circle" },
      { text: ". ", mark: null },
      { text: "Sorry.", mark: "marker" },
      { text: " The end", mark: null },
    ]);
  });

  it("leaves text without marks alone", () => {
    expect(parseMarks("Fewer Genes Than Thought")).toEqual([
      { text: "Fewer Genes Than Thought", mark: null },
    ]);
    expect(parseMarks("")).toEqual([]);
    expect(unmarked("==Impossible Comeback== in ((Boston))")).toBe(
      "Impossible Comeback in Boston",
    );
  });

  it("keeps a lone == or (( as text", () => {
    expect(unmarked("2 == 2 and (( open")).toBe("2 == 2 and (( open");
  });
});

describe("stroke shapes", () => {
  it("is the same shape for the same phrase, a different one for another", () => {
    expect(seedOf("a Girl")).toBe(seedOf("a Girl"));
    expect(markerPath(200, 40, seedOf("a Girl"))).toBe(
      markerPath(200, 40, seedOf("a Girl")),
    );
    expect(markerPath(200, 40, seedOf("a Girl"))).not.toBe(
      markerPath(200, 40, seedOf("a Boy")),
    );
  });

  it("draws closed marker strokes and open pen loops with finite numbers, even for tiny boxes", () => {
    for (const [w, h] of [
      [300, 50],
      [12, 30],
      [2, 2],
    ]) {
      const marker = markerPath(w, h, 7);
      expect(marker.startsWith("M")).toBe(true);
      expect(marker.endsWith("Z")).toBe(true);
      expect(marker).not.toMatch(/NaN|Infinity/);
      const loop = circlePath(w, h, 7);
      expect(loop.startsWith("M")).toBe(true);
      expect(loop).not.toMatch(/NaN|Infinity|Z/);
    }
  });
});

describe("underline and bold marks", () => {
  it("parses __underline__ and **bold** beside the other marks", () => {
    expect(parseMarks("Men’s Day Petition **Withdrawn**")).toEqual([
      { text: "Men’s Day Petition ", mark: null },
      { text: "Withdrawn", mark: "bold" },
    ]);
    expect(parseMarks("claimed, __for good__ by ==a girl==")).toEqual([
      { text: "claimed, ", mark: null },
      { text: "for good", mark: "underline" },
      { text: " by ", mark: null },
      { text: "a girl", mark: "marker" },
    ]);
    expect(unmarked("**Fewer Genes** Than __Thought__")).toBe(
      "Fewer Genes Than Thought",
    );
  });

  it("draws an open, finite underline for any width", async () => {
    const { underlinePath } = await import("./marks");
    for (const w of [1, 12, 240]) {
      const d = underlinePath(w, 24, 7);
      expect(d.startsWith("M")).toBe(true);
      expect(d).not.toMatch(/NaN|Infinity|Z/);
    }
  });
});
