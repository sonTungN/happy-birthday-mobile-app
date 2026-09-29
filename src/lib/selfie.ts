import { pad, stampParts } from './text'

/*
 * The last frame of the roll is hers: the phone's camera takes it. Everything that touches the camera, the
 * canvas and the share sheet is here, so the chapter only deals with pictures.
 */

export type CameraFault = 'insecure' | 'unsupported' | 'denied' | 'failed'
/** The front camera (a selfie) or the back one (someone else takes it) */
export type Facing = 'user' | 'environment'

export class CameraError extends Error {
  readonly reason: CameraFault
  constructor(reason: CameraFault) {
    super(`camera: ${reason}`)
    this.reason = reason
  }
}

/** Opens a camera. Throws a CameraError when it can't: no HTTPS, no camera, or she said no. */
export async function openCamera(facing: Facing = 'user'): Promise<MediaStream> {
  if (!window.isSecureContext) throw new CameraError('insecure')
  if (!navigator.mediaDevices?.getUserMedia) throw new CameraError('unsupported')
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 1280 } },
      audio: false,
    })
  } catch (err) {
    const denied = err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'SecurityError')
    throw new CameraError(denied ? 'denied' : 'failed')
  }
}

export function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop())
}

/** This camera has a lamp the page may switch on (Android's back camera; iPhones don't let a page) */
export function hasTorch(stream: MediaStream | null): boolean {
  const track = stream?.getVideoTracks()[0]
  try {
    const caps = track?.getCapabilities?.() as { torch?: boolean } | undefined
    return caps?.torch === true
  } catch {
    return false
  }
}

/** The back camera's lamp, where the browser allows it (Android). Elsewhere nothing happens. */
export async function setTorch(stream: MediaStream | null, on: boolean): Promise<void> {
  const track = stream?.getVideoTracks()[0]
  if (!track) return
  try {
    await track.applyConstraints({ advanced: [{ torch: on } as unknown as MediaTrackConstraintSet] })
  } catch {
    /* this camera has no lamp */
  }
}

/** The biggest centered square of a w × h frame: where to cut it from */
export function squareCrop(w: number, h: number): { x: number; y: number; size: number } {
  const size = Math.max(0, Math.min(w, h))
  return { x: (w - size) / 2, y: (h - size) / 2, size }
}

/** Zoomed in: the middle of the square, 1/zoom of its size */
export function zoomCrop(crop: { x: number; y: number; size: number }, zoom: number): { x: number; y: number; size: number } {
  const size = crop.size / Math.max(1, zoom)
  return { x: crop.x + (crop.size - size) / 2, y: crop.y + (crop.size - size) / 2, size }
}

export interface SnapshotOptions {
  size?: number
  /** Flip it, the way she saw herself in the viewfinder (the front camera shows a mirror image) */
  mirror?: boolean
  zoom?: number
}

/** Takes the picture: the middle square of the video, as a JPEG data URL small enough to keep in localStorage. */
export function snapshot(video: HTMLVideoElement, { size = 1000, mirror = true, zoom = 1 }: SnapshotOptions = {}): string {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No canvas')
  const crop = zoomCrop(squareCrop(video.videoWidth, video.videoHeight), zoom)
  if (mirror) {
    ctx.translate(size, 0)
    ctx.scale(-1, 1)
  }
  ctx.drawImage(video, crop.x, crop.y, crop.size, crop.size, 0, 0, size, size)
  return canvas.toDataURL('image/jpeg', 0.86)
}

/** A data: URL back into a file, to hand to the share sheet */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body = ''] = dataUrl.split(',')
  const type = /^data:([^;,]+)/.exec(head)?.[1] ?? 'application/octet-stream'
  const bin = atob(body)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type })
}

/** An unexposed print, for when the camera couldn't take the picture: plain pale paper */
export function blankPrint(): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">` +
    `<defs><radialGradient id="g" cx="40%" cy="35%" r="80%"><stop offset="0" stop-color="#f3f0e9"/><stop offset="1" stop-color="#dcd7cc"/></radialGradient></defs>` +
    `<rect width="400" height="400" fill="url(#g)"/></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

/** Today as 'YYYY-MM-DD', local time */
export function todayIso(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/**
 * The same black-and-white look as the site's photos (global.css --photo-filter:
 * grayscale, contrast 1.08, brightness 1.03), applied to raw pixels.
 */
export function toBlackAndWhite(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    const l = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
    const v = Math.max(0, Math.min(255, ((l - 128) * 1.08 + 128) * 1.03))
    data[i] = v
    data[i + 1] = v
    data[i + 2] = v
  }
}

export interface PrintSpec {
  src: string
  caption: string
  /** 'YYYY-MM-DD', printed in the corner of the picture */
  date: string
}

/** Print height ÷ width (the same card as Polaroid.tsx: 5.5% padding, a square picture, a 21% bottom border) */
const PRINT_RATIO = 1.155

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load the picture'))
    img.src = src
  })
}

/**
 * Draws the whole print the way it looks on screen (paper, the picture in black and white, the date stamp,
 * the caption) so she can keep it: a JPEG, 1200 px wide.
 */
export async function renderPrint(spec: PrintSpec, width = 1200): Promise<Blob> {
  const height = Math.round(width * PRINT_RATIO)
  const [img] = await Promise.all([
    loadImage(spec.src),
    ...['italic 400 60px "EB Garamond"', '40px DSEG7', 'bold 40px "Josefin Sans"'].map((font) => document.fonts.load(font, '’25').catch(() => [])),
  ])
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No canvas')

  // The paper
  const paper = ctx.createLinearGradient(0, 0, width * 0.27, height)
  paper.addColorStop(0, '#faf8f2')
  paper.addColorStop(0.6, '#e8e3d8')
  paper.addColorStop(1, '#d8d2c5')
  ctx.fillStyle = paper
  ctx.fillRect(0, 0, width, height)

  // The picture: the middle square of the photo, in black and white, a little darker at the edges
  const pad = Math.round(width * 0.055)
  const side = width - pad * 2
  const crop = squareCrop(img.naturalWidth, img.naturalHeight)
  ctx.drawImage(img, crop.x, crop.y, crop.size, crop.size, pad, pad, side, side)
  const pixels = ctx.getImageData(pad, pad, side, side)
  toBlackAndWhite(pixels.data)
  ctx.putImageData(pixels, pad, pad)
  const vignette = ctx.createRadialGradient(pad + side / 2, pad + side / 2, side * 0.45, pad + side / 2, pad + side / 2, side * 0.78)
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)')
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.28)')
  ctx.fillStyle = vignette
  ctx.fillRect(pad, pad, side, side)

  // The date the camera printed in the corner: ’25 6 14
  const stamp = stampParts(spec.date)
  if (stamp) {
    const size = Math.round(side * 0.044)
    const gap = size * 0.45
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)'
    ctx.shadowBlur = size * 0.12
    ctx.shadowOffsetY = 1
    const parts: { text: string; font: string }[] = [
      { text: '’', font: `bold ${size}px "Josefin Sans"` },
      { text: stamp[0], font: `${size}px DSEG7` },
      { text: stamp[1], font: `${size}px DSEG7` },
      { text: stamp[2], font: `${size}px DSEG7` },
    ]
    const widths = parts.map((p) => {
      ctx.font = p.font
      return ctx.measureText(p.text).width
    })
    // The year sits right after the tick, the month and day a gap apart
    let x = pad + side * 0.93 - widths.reduce((a, b) => a + b, 0) - gap * 2
    const y = pad + side * 0.94
    parts.forEach((p, i) => {
      ctx.font = p.font
      ctx.fillText(p.text, x, y)
      x += widths[i] + (i === 0 ? 0 : gap)
    })
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0
  }

  // The caption on the bottom border
  ctx.fillStyle = '#2a2a2a'
  ctx.font = `italic 400 ${Math.round(width * 0.09)}px "EB Garamond"`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(spec.caption, width / 2, pad + side + (height - pad - side) / 2, width * 0.88)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not save the print'))), 'image/jpeg', 0.92)
  })
}

/** Hands a picture to the share sheet (Photos, Messages…), or downloads it where there is no share sheet. */
export async function keepPrint(blob: Blob, name: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], name, { type: blob.type })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return 'shared'
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled'
      // Sharing failed for another reason: fall back to a download
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}
