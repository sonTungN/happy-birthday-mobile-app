export interface Point {
  x: number
  y: number
}

export interface Box {
  left: number
  top: number
  width: number
  height: number
}

/** The cut, extended from the top edge to the bottom edge of the box. */
export interface CutLine {
  top: Point
  bottom: Point
}

export type CutResult = { ok: true; line: CutLine } | { ok: false; reason: 'short' | 'angle' | 'outside' }

/** Maximum tilt from vertical, in degrees */
const MAX_ANGLE = 35
/** The swipe must cover at least this much of the cake's height */
const MIN_COVERAGE = 0.55

/**
 * Decides whether a swipe "cuts" through the cake. `points` and `box` share one coordinate system.
 * Either direction works (top to bottom or bottom to top).
 */
export function evaluateCut(points: Point[], box: Box): CutResult {
  if (points.length < 2) return { ok: false, reason: 'short' }
  const first = points[0]
  const last = points[points.length - 1]
  let minY = Infinity
  let maxY = -Infinity
  for (const p of points) {
    minY = Math.min(minY, p.y)
    maxY = Math.max(maxY, p.y)
  }
  const covered = Math.min(maxY, box.top + box.height) - Math.max(minY, box.top)
  if (covered / box.height < MIN_COVERAGE) return { ok: false, reason: 'short' }

  const dx = last.x - first.x
  const dy = last.y - first.y
  if (Math.abs(dy) < 1) return { ok: false, reason: 'angle' }
  const angle = (Math.abs(Math.atan2(dx, Math.abs(dy))) * 180) / Math.PI
  if (angle > MAX_ANGLE) return { ok: false, reason: 'angle' }

  const xAt = (y: number) => first.x + (dx / dy) * (y - first.y)
  const midX = xAt(box.top + box.height / 2)
  const margin = box.width * 0.14
  if (midX < box.left + margin || midX > box.left + box.width - margin) return { ok: false, reason: 'outside' }

  return {
    ok: true,
    line: {
      top: { x: xAt(box.top), y: box.top },
      bottom: { x: xAt(box.top + box.height), y: box.top + box.height },
    },
  }
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/** Distance from p to the segment ab. */
export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const abx = b.x - a.x
  const aby = b.y - a.y
  const len2 = abx * abx + aby * aby
  if (len2 === 0) return distance(p, a)
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2))
  return distance(p, { x: a.x + abx * t, y: a.y + aby * t })
}

/** Keeps pointer events coming to this element while the finger moves. Throws if the pointer is already gone, so guard it. */
export function capturePointer(e: { currentTarget: Element; pointerId: number }): void {
  try {
    e.currentTarget.setPointerCapture(e.pointerId)
  } catch {
    /* pointer already released */
  }
}

export function insideRect(p: Point, r: Box, pad = 0): boolean {
  return p.x >= r.left - pad && p.x <= r.left + r.width + pad && p.y >= r.top - pad && p.y <= r.top + r.height + pad
}
