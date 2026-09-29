import { describe, expect, it } from "vitest";
import { readingOrder } from "./board";

describe("readingOrder", () => {
  it("reads rows from the top, left to right", () => {
    const placed = [
      { index: 0, x: 300, y: 100 },
      { index: 1, x: 100, y: 110 },
      { index: 2, x: 200, y: 400 },
      { index: 3, x: 50, y: 390 },
    ];
    expect(readingOrder(placed, 150)).toEqual([1, 0, 3, 2]);
  });

  it("keeps a slightly staggered row together", () => {
    const placed = [
      { index: 0, x: 100, y: 100 },
      { index: 1, x: 250, y: 160 },
      { index: 2, x: 400, y: 120 },
    ];
    expect(readingOrder(placed, 150)).toEqual([0, 1, 2]);
  });

  it("handles an empty board and a single print", () => {
    expect(readingOrder([], 100)).toEqual([]);
    expect(readingOrder([{ index: 4, x: 1, y: 1 }], 100)).toEqual([4]);
  });
});
