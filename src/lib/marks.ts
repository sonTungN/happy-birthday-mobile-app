export type MarkKind = 'marker' | 'circle'

export interface MarkPart {
  text: string
  /** null = plain text */
  mark: MarkKind | null
}

const MARKS = /==(.+?)==|\(\((.+?)\)\)/g

/** Splits "It's ==a Girl==" into plain text and marked phrases: ==…== gets the yellow marker, ((…)) a red pen circle. */
export function parseMarks(text: string): MarkPart[] {
  const parts: MarkPart[] = []
  let last = 0
  for (const m of text.matchAll(MARKS)) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index), mark: null })
    parts.push(m[1] !== undefined ? { text: m[1], mark: 'marker' } : { text: m[2], mark: 'circle' })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last), mark: null })
  return parts
}

/** The text without the mark-up */
export const unmarked = (text: string): string => parseMarks(text).map((p) => p.text).join('')

/** A number from a string, so every phrase gets its own (but always the same) wobble */
export function seedOf(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

/** Small seeded random numbers (mulberry32): 0 ≤ n < 1 */
function random(seed: number): () => number {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const r1 = (n: number) => Math.round(n * 10) / 10

/**
 * One pass of a chisel-tip highlighter, `w` × `h` px: slightly wobbly top and bottom edges, a rounded start
 * and a slanted end, the way the felt tip leaves the paper.
 */
export function markerPath(w: number, h: number, seed: number): string {
  const rand = random(seed)
  const end = Math.min(h * 0.32, w / 4)
  const steps = Math.max(2, Math.round((w - 2 * end) / 11))
  const wobble = (amp: number) => (rand() - 0.5) * amp
  const phase = rand() * Math.PI * 2
  const wave = (x: number) => Math.sin(x / 38 + phase) * h * 0.035
  const top: string[] = []
  const bottom: string[] = []
  for (let i = 0; i <= steps; i++) {
    const x = end + ((w - 2 * end) * i) / steps
    top.push(`${r1(x)} ${r1(h * 0.05 + wave(x) + wobble(h * 0.05))}`)
    bottom.unshift(`${r1(x)} ${r1(h * 0.97 + wave(x) + wobble(h * 0.05))}`)
  }
  const [firstTop, ...restTop] = top
  const lastBottom = bottom[bottom.length - 1]
  // Rounded start on the left, a slanted chisel end on the right
  return [
    `M${firstTop}`,
    `L${restTop.join(' L')}`,
    `C${r1(w - end * 0.2)} ${r1(h * 0.1)} ${r1(w + end * 0.15)} ${r1(h * 0.55)} ${r1(w - end * 0.55)} ${r1(h * 0.96)}`,
    `L${bottom.join(' L')}`,
    `C${r1(end * 0.1)} ${r1(h * 1.02)} ${r1(-end * 0.55)} ${r1(h * 0.5)} ${lastBottom.split(' ')[0]} ${r1(h * 0.1)}`,
    `L${firstTop}`,
    'Z',
  ].join(' ')
}

/**
 * A red pen circle around a `w` × `h` px box (the SVG is that size): one loop and a bit, the end
 * overshooting the start, never quite an ellipse.
 */
export function circlePath(w: number, h: number, seed: number): string {
  const rand = random(seed)
  const cx = w / 2
  const cy = h / 2
  const start = -Math.PI * (0.62 + rand() * 0.12)
  const turn = Math.PI * 2 * (1.12 + rand() * 0.06)
  const count = 28
  const bulge = rand() * Math.PI * 2
  const points = Array.from({ length: count + 1 }, (_, i) => {
    const t = i / count
    const a = start + turn * t
    // The loop drifts outwards a little as it goes round, so the end passes outside the start
    const grow = 0.9 + 0.1 * t + Math.sin(a * 2 + bulge) * 0.025
    return [cx + Math.cos(a) * cx * grow, cy + Math.sin(a) * cy * grow]
  })
  // Catmull-Rom through the points, as cubic Béziers
  let d = `M${r1(points[0][0])} ${r1(points[0][1])}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]
    d += ` C${r1(p1[0] + (p2[0] - p0[0]) / 6)} ${r1(p1[1] + (p2[1] - p0[1]) / 6)} ${r1(p2[0] - (p3[0] - p1[0]) / 6)} ${r1(p2[1] - (p3[1] - p1[1]) / 6)} ${r1(p2[0])} ${r1(p2[1])}`
  }
  return d
}
