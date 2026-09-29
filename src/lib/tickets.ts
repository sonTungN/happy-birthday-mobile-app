import type { Coupon, PlanEvent } from "../types";

export type TicketFace =
  | { kind: "coupon"; coupon: Coupon }
  | { kind: "event"; event: PlanEvent };

interface Draw {
  /** Faces already drawn, in the order she picked them */
  drawn: TicketFace[];
  /** How many tickets she may scratch */
  picks: number;
  /** How many tickets are on the table */
  cards: number;
  event: PlanEvent | null;
  coupons: Coupon[];
  random?: () => number;
}

/**
 * Decides what is behind a ticket at the moment she starts scratching it.
 * The invitation turns up with the odds of a real shuffled deck (1 in the tickets still face down),
 * but never later than her last pick: if the first ticket isn't it, the second one is, whichever she chooses.
 */
export function drawFace({
  drawn,
  picks,
  cards,
  event,
  coupons,
  random = Math.random,
}: Draw): TicketFace {
  const eventDrawn = drawn.some((face) => face.kind === "event");
  if (event && !eventDrawn) {
    const lastPick = drawn.length >= picks - 1;
    if (
      lastPick ||
      coupons.length === 0 ||
      random() < 1 / Math.max(1, cards - drawn.length)
    )
      return { kind: "event", event };
  }
  const used = new Set(
    drawn.flatMap((face) => (face.kind === "coupon" ? [face.coupon] : [])),
  );
  const left = coupons.filter((coupon) => !used.has(coupon));
  const pool = left.length ? left : coupons;
  return { kind: "coupon", coupon: pool[Math.floor(random() * pool.length)] };
}
