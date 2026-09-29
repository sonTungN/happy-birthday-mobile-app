import { describe, expect, it } from 'vitest'
import { distanceToSegment, evaluateCut, insideRect } from './geometry'

const cake = { left: 100, top: 200, width: 200, height: 160 }

describe('evaluateCut', () => {
  it('a straight swipe down through the middle cuts the cake', () => {
    const r = evaluateCut([{ x: 200, y: 180 }, { x: 202, y: 280 }, { x: 205, y: 380 }], cake)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.line.top.y).toBe(200)
      expect(r.line.bottom.y).toBe(360)
      expect(r.line.top.x).toBeGreaterThan(195)
      expect(r.line.bottom.x).toBeLessThan(210)
    }
  })

  it('swiping up works too', () => {
    expect(evaluateCut([{ x: 190, y: 370 }, { x: 180, y: 190 }], cake).ok).toBe(true)
  })

  it('a swipe that is too short reports short', () => {
    expect(evaluateCut([{ x: 200, y: 250 }, { x: 200, y: 290 }], cake)).toEqual({ ok: false, reason: 'short' })
  })

  it('a swipe that is too slanted reports angle', () => {
    expect(evaluateCut([{ x: 110, y: 190 }, { x: 300, y: 370 }], cake)).toEqual({ ok: false, reason: 'angle' })
  })

  it('cutting along the edge reports outside', () => {
    expect(evaluateCut([{ x: 108, y: 190 }, { x: 108, y: 370 }], cake)).toEqual({ ok: false, reason: 'outside' })
  })

  it('a single point does not count', () => {
    expect(evaluateCut([{ x: 200, y: 200 }], cake)).toEqual({ ok: false, reason: 'short' })
  })
})

describe('distanceToSegment', () => {
  it('projection falls inside the segment', () => {
    expect(distanceToSegment({ x: 5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(3)
  })
  it('projection falls outside, so it measures to the end point', () => {
    expect(distanceToSegment({ x: 13, y: 4 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(5)
  })
})

describe('insideRect', () => {
  it('includes the padding', () => {
    expect(insideRect({ x: 95, y: 210 }, cake)).toBe(false)
    expect(insideRect({ x: 95, y: 210 }, cake, 8)).toBe(true)
  })
})
