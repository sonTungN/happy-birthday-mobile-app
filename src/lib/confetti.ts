import confetti from 'canvas-confetti'

const COLORS = ['#f8f6f0', '#e8e3d8', '#c8c5bd', '#8d8a84', '#4b4a48', '#1c1c1c']

let fire: confetti.CreateTypes | null = null
let reduced = false
let star: confetti.Shape | null = null

/** Binds confetti to a canvas inside the app frame (so it stays inside the phone frame on desktop). */
export function bindConfetti(canvas: HTMLCanvasElement | null): void {
  fire?.reset()
  fire = canvas ? confetti.create(canvas, { resize: true, useWorker: false }) : null
  reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

export interface Origin {
  x: number
  y: number
}

/** Position (0..1) of an element's center relative to the confetti frame. */
export function originOf(el: Element | null, frame: Element | null): Origin {
  if (!el || !frame) return { x: 0.5, y: 0.5 }
  const r = el.getBoundingClientRect()
  const f = frame.getBoundingClientRect()
  return { x: (r.left + r.width / 2 - f.left) / f.width, y: (r.top + r.height / 2 - f.top) / f.height }
}

export function burst(origin: Origin = { x: 0.5, y: 0.55 }, particleCount = 90): void {
  if (!fire || reduced) return
  void fire({ particleCount, spread: 80, startVelocity: 36, origin, colors: COLORS, scalar: 0.9, ticks: 220 })
}

/** A slow shower of little bone-white stars. */
export function stars(origin: Origin = { x: 0.5, y: 0.6 }, particleCount = 18): void {
  if (!fire || reduced) return
  star ??= confetti.shapeFromText({ text: '✦', scalar: 2, color: '#f2eee5' })
  void fire({ shapes: [star], scalar: 2, particleCount, spread: 110, startVelocity: 26, gravity: 0.7, origin, ticks: 240, flat: true })
}

/** Fires confetti cannons from both sides for `ms` milliseconds. */
export function celebrate(ms = 2600): void {
  if (!fire || reduced) return
  const end = performance.now() + ms
  const frame = () => {
    if (!fire) return
    void fire({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors: COLORS, startVelocity: 55 })
    void fire({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors: COLORS, startVelocity: 55 })
    if (performance.now() < end) requestAnimationFrame(frame)
  }
  frame()
}
