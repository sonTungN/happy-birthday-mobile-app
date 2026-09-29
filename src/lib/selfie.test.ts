import { describe, expect, it } from 'vitest'
import { blankPrint, dataUrlToBlob, squareCrop, toBlackAndWhite, todayIso, zoomCrop } from './selfie'

describe('squareCrop', () => {
  it('cuts the middle square out of a landscape or portrait frame', () => {
    expect(squareCrop(1280, 720)).toEqual({ x: 280, y: 0, size: 720 })
    expect(squareCrop(720, 1280)).toEqual({ x: 0, y: 280, size: 720 })
    expect(squareCrop(500, 500)).toEqual({ x: 0, y: 0, size: 500 })
  })
})

describe('zoomCrop', () => {
  it('keeps the middle of the square at 2×, and everything at 1×', () => {
    const crop = { x: 280, y: 0, size: 720 }
    expect(zoomCrop(crop, 2)).toEqual({ x: 460, y: 180, size: 360 })
    expect(zoomCrop(crop, 1)).toEqual(crop)
    expect(zoomCrop(crop, 0.5)).toEqual(crop)
  })
})

describe('todayIso', () => {
  it('formats a local date with zero padding', () => {
    expect(todayIso(new Date(2026, 9, 21, 9, 41))).toBe('2026-10-21')
    expect(todayIso(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('toBlackAndWhite', () => {
  it('turns every pixel grey and keeps the alpha', () => {
    const data = new Uint8ClampedArray([200, 40, 40, 255, 10, 220, 10, 128])
    toBlackAndWhite(data)
    expect(data[0]).toBe(data[1])
    expect(data[1]).toBe(data[2])
    expect(data[3]).toBe(255)
    expect(data[7]).toBe(128)
    // Green is brighter than red to the eye
    expect(data[4]).toBeGreaterThan(data[0])
  })

  it('never leaves the 0–255 range', () => {
    const data = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255])
    toBlackAndWhite(data)
    expect(data[0]).toBe(255)
    expect(data[4]).toBe(0)
  })
})

describe('dataUrlToBlob', () => {
  it('decodes the bytes and keeps the type', async () => {
    const blob = dataUrlToBlob('data:image/jpeg;base64,SGVsbG8=')
    expect(blob.type).toBe('image/jpeg')
    expect(blob.size).toBe(5)
    expect(await blob.text()).toBe('Hello')
  })
})

describe('blankPrint', () => {
  it('is an inline SVG image', () => {
    expect(blankPrint()).toMatch(/^data:image\/svg\+xml;utf8,/)
  })
})
