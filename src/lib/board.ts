export interface Placed {
  index: number;
  /** Center of the print on the board, in px */
  x: number;
  y: number;
}

/**
 * The order she laid the prints out in, read like a page: row by row from the top, left to right within a row.
 * Prints whose centers are less than `rowHeight` apart vertically count as one row.
 */
export function readingOrder(placed: Placed[], rowHeight: number): number[] {
  const byY = [...placed].sort((a, b) => a.y - b.y);
  const rows: Placed[][] = [];
  for (const p of byY) {
    const row = rows[rows.length - 1];
    if (row && p.y - row[0].y < rowHeight) row.push(p);
    else rows.push([p]);
  }
  return rows.flatMap((row) =>
    row.sort((a, b) => a.x - b.x).map((p) => p.index),
  );
}
