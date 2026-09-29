import type { Point } from './geometry'

// Every coordinate here lives in the "0 0 320 300" viewBox of <CakeArt>.
export const CAKE_W = 320
export const CAKE_H = 300
/** The cake's top surface (an ellipse) */
export const TOP = { cx: 160, cy: 110, rx: 120, ry: 30 }
/** Center of the cake's bottom ellipse */
export const BOTTOM_Y = 250
/** The cake body, used to check the cut */
export const BODY = { left: 40, top: TOP.cy - TOP.ry, width: TOP.rx * 2, height: BOTTOM_Y + TOP.ry - (TOP.cy - TOP.ry) }

const clampX = (x: number) => Math.min(TOP.cx + TOP.rx, Math.max(TOP.cx - TOP.rx, x))

/** y of the front edge (facing the viewer) of an ellipse centered at cy, at x */
export function frontY(x: number, cy: number): number {
  const t = (clampX(x) - TOP.cx) / TOP.rx
  return cy + TOP.ry * Math.sqrt(Math.max(0, 1 - t * t))
}

/** y of the back edge of the top surface at x */
export function backY(x: number): number {
  const t = (clampX(x) - TOP.cx) / TOP.rx
  return TOP.cy - TOP.ry * Math.sqrt(Math.max(0, 1 - t * t))
}

function seeded(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

/** Frosting dripping down around the top edge */
export const DRIP_PATH = (() => {
  const drips: [number, number][] = [[52, 16], [74, 30], [98, 18], [124, 36], [150, 22], [176, 34], [202, 17], [228, 30], [252, 20], [270, 12]]
  const w = 9
  let d = `M ${TOP.cx - TOP.rx} ${TOP.cy}`
  for (const [x, len] of drips) {
    const bottom = frontY(x, TOP.cy) + len
    d += ` L ${x - w} ${frontY(x - w, TOP.cy) + 3} C ${x - w} ${bottom + 4}, ${x + w} ${bottom + 4}, ${x + w} ${frontY(x + w, TOP.cy) + 3}`
  }
  d += ` L ${TOP.cx + TOP.rx} ${TOP.cy} A ${TOP.rx} ${TOP.ry} 0 0 1 ${TOP.cx - TOP.rx} ${TOP.cy} Z`
  return d
})()

export interface Sprinkle {
  x: number
  y: number
  rotate: number
  color: string
}

export const SPRINKLES: Sprinkle[] = (() => {
  const rand = seeded(7)
  const colors = ['#2a2a2a', '#8d8a84', '#5a5956', '#c8c5bd', '#1a1a1a']
  return Array.from({ length: 28 }, (_, i) => {
    const a = rand() * Math.PI * 2
    const r = Math.sqrt(rand()) * 0.86
    return {
      x: TOP.cx + Math.cos(a) * TOP.rx * r,
      y: TOP.cy + Math.sin(a) * TOP.ry * r,
      rotate: rand() * 180,
      color: colors[i % colors.length],
    }
  })
})()

/** Pearl border along the bottom of the cake */
export const PEARLS: Point[] = Array.from({ length: 17 }, (_, i) => {
  const x = 46 + i * 14.25
  return { x, y: frontY(x, BOTTOM_Y) - 1 }
})

/** Where the number candles stand: side by side in the middle of the top (percent of the cake box). */
export function numberSpots(count: number): Point[] {
  const gap = 21
  return Array.from({ length: count }, (_, i) => ({
    x: 50 + (i - (count - 1) / 2) * gap,
    y: ((TOP.cy + 8) / CAKE_H) * 100,
  }))
}

/**
 * The cut face that shows when the cake splits: a thin strip along the cut on the `side` half
 * (-1 = left half, 1 = right half). topX/bottomX are the cut's x at y = 0 and y = CAKE_H.
 */
export function cutFace(topX: number, bottomX: number, side: -1 | 1): { top: string; body: string } {
  const t = 11 * side
  const xAt = (y: number) => topX + ((bottomX - topX) * y) / CAKE_H
  const poly = (y1: number, y2: number) => {
    const a = xAt(y1)
    const b = xAt(y2)
    return `${a},${y1} ${b},${y2} ${b + t},${y2} ${a + t},${y1}`
  }
  const midX = xAt(TOP.cy)
  return {
    top: poly(backY(midX), frontY(midX, TOP.cy)),
    body: poly(frontY(midX, TOP.cy), frontY(xAt(BOTTOM_Y), BOTTOM_Y)),
  }
}
