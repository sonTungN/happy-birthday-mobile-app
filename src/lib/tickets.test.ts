import { describe, expect, it } from "vitest";
import type { Coupon, PlanEvent } from "../types";
import { drawFace, type TicketFace } from "./tickets";

const coupons: Coupon[] = [
  { title: "A" },
  { title: "B" },
  { title: "C" },
  { title: "D" },
];
const event = { title: "Dinner" } as PlanEvent;
const base = { picks: 2, cards: 4, event, coupons };

/** Plays a whole round: draws `picks` faces with a fixed random value */
function round(value: number): TicketFace[] {
  const drawn: TicketFace[] = [];
  for (let i = 0; i < base.picks; i++)
    drawn.push(drawFace({ ...base, drawn, random: () => value }));
  return drawn;
}

describe("drawFace", () => {
  it("can put the invitation behind the first ticket (1 in 4)", () => {
    const [first, second] = round(0.2);
    expect(first.kind).toBe("event");
    expect(second.kind).toBe("coupon");
  });

  it("guarantees the invitation on the last pick when the first was a coupon", () => {
    const [first, second] = round(0.9);
    expect(first.kind).toBe("coupon");
    expect(second.kind).toBe("event");
  });

  it("always finds the invitation exactly once, whatever the luck", () => {
    for (const value of [0, 0.1, 0.24, 0.25, 0.5, 0.99]) {
      expect(round(value).filter((face) => face.kind === "event")).toHaveLength(
        1,
      );
    }
  });

  it("never repeats a coupon when there is no invitation", () => {
    const drawn: TicketFace[] = [];
    for (let i = 0; i < 4; i++)
      drawn.push(
        drawFace({ ...base, picks: 4, event: null, drawn, random: () => 0 }),
      );
    const titles = drawn.map((face) =>
      face.kind === "coupon" ? face.coupon.title : "event",
    );
    expect(new Set(titles).size).toBe(4);
  });

  it("matches the odds of a shuffled deck on the first pick", () => {
    let seed = 42;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    let first = 0;
    for (let i = 0; i < 4000; i++)
      if (drawFace({ ...base, drawn: [], random }).kind === "event") first++;
    expect(first / 4000).toBeGreaterThan(0.22);
    expect(first / 4000).toBeLessThan(0.28);
  });
});
