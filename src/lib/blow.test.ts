import { describe, expect, it } from "vitest";
import { createBlowDetector } from "./blow";

/** Feeds the same rms for `ms` milliseconds at 60 fps and returns the last frame. */
function feed(
  detector: ReturnType<typeof createBlowDetector>,
  rms: number,
  ms: number,
) {
  let frame = detector.push(rms, 16);
  for (let t = 16; t < ms; t += 16) frame = detector.push(rms, 16);
  return frame;
}

describe("createBlowDetector", () => {
  it("a quiet room is not blowing", () => {
    const d = createBlowDetector();
    const frame = feed(d, 0.004, 3000);
    expect(frame.blowing).toBe(false);
    expect(frame.level).toBeLessThan(0.05);
  });

  it("a strong blow is detected right away with a high level", () => {
    const d = createBlowDetector();
    feed(d, 0.004, 2000);
    const frame = feed(d, 0.35, 200);
    expect(frame.blowing).toBe(true);
    expect(frame.level).toBeGreaterThan(0.6);
  });

  it("steady background noise (fan, air conditioner) is not blowing", () => {
    const d = createBlowDetector();
    const frame = feed(d, 0.05, 8000);
    expect(frame.blowing).toBe(false);
    expect(frame.baseline).toBeGreaterThan(0.04);
  });

  it("a noisy room raises the threshold, so talking does not blow the candles out", () => {
    const d = createBlowDetector();
    feed(d, 0.05, 8000);
    expect(feed(d, 0.12, 300).blowing).toBe(false);
    expect(feed(d, 0.4, 300).blowing).toBe(true);
  });

  it("does not learn a long blow as background noise", () => {
    const d = createBlowDetector();
    feed(d, 0.004, 1000);
    const during = feed(d, 0.3, 3000);
    expect(during.blowing).toBe(true);
    expect(during.baseline).toBeLessThan(0.02);
  });

  it("the level falls back to 0 after blowing stops", () => {
    const d = createBlowDetector();
    feed(d, 0.3, 500);
    const after = feed(d, 0.004, 1500);
    expect(after.level).toBeLessThan(0.05);
  });

  it("the threshold can be tuned", () => {
    const strict = createBlowDetector({ minRms: 0.2 });
    expect(feed(strict, 0.15, 300).blowing).toBe(false);
  });
});
