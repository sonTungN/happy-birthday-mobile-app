export interface BlowFrame {
  rms: number
  /** Background noise of the room, learned while nobody is blowing */
  baseline: number
  threshold: number
  /** 0..1: how hard someone is blowing, used to bend the flames */
  level: number
  blowing: boolean
  /** ms since the previous frame */
  dt: number
}

export interface DetectorOptions {
  /** rms must be above baseline × ratio to count as blowing */
  ratio?: number
  /** Absolute minimum threshold */
  minRms?: number
}

/**
 * Blowing into a mic sounds like loud, sustained noise. The detector compares loudness (RMS) with the
 * room's background noise and counts anything above the threshold as blowing. It has no browser
 * dependencies, so it can be unit tested.
 */
export function createBlowDetector({ ratio = 3.5, minRms = 0.06 }: DetectorOptions = {}) {
  let baseline = 0.01
  let level = 0
  return {
    push(rms: number, dt: number): BlowFrame {
      const threshold = Math.max(minRms, baseline * ratio)
      const blowing = rms > threshold
      if (!blowing) {
        // Only learn the background noise while nobody is blowing (~1.5 s time constant)
        const k = Math.min(1, dt / 1500)
        baseline = Math.min(0.08, Math.max(0.002, baseline + (rms - baseline) * k))
      }
      const target = Math.min(1, Math.max(0, (rms - baseline * 1.5) / (threshold * 2.2)))
      level += (target - level) * (target > level ? 0.55 : 0.12)
      return { rms, baseline, threshold, level, blowing, dt }
    },
  }
}

export type MicErrorKind = 'unsupported' | 'insecure' | 'denied' | 'failed'

export class MicError extends Error {
  kind: MicErrorKind
  constructor(kind: MicErrorKind) {
    super(kind)
    this.kind = kind
  }
}

export interface MicSession {
  stop: () => void
}

/**
 * Opens the mic and calls `onFrame` on every animation frame. MUST be called from a tap: the AudioContext
 * is created right before the `await` so iOS lets it run.
 */
export async function startMic(onFrame: (frame: BlowFrame) => void, options?: DetectorOptions): Promise<MicSession> {
  if (!window.isSecureContext) throw new MicError('insecure')
  if (!navigator.mediaDevices?.getUserMedia) throw new MicError('unsupported')
  const Ctor = window.AudioContext ?? window.webkitAudioContext
  if (!Ctor) throw new MicError('unsupported')

  const ctx = new Ctor()
  void ctx.resume().catch(() => {})

  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      // Turn the voice filters off: they can filter out the very sound of blowing.
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    })
  } catch (err) {
    void ctx.close().catch(() => {})
    const denied = err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'SecurityError')
    throw new MicError(denied ? 'denied' : 'failed')
  }

  if (ctx.state !== 'running') await ctx.resume().catch(() => {})
  const source = ctx.createMediaStreamSource(stream)
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 1024
  source.connect(analyser)

  const buf = new Float32Array(analyser.fftSize)
  const detector = createBlowDetector(options)
  let raf = 0
  let last = performance.now()
  let stopped = false

  const tick = (now: number) => {
    if (stopped) return
    analyser.getFloatTimeDomainData(buf)
    let sum = 0
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i]
    const dt = Math.min(100, Math.max(0, now - last))
    last = now
    onFrame(detector.push(Math.sqrt(sum / buf.length), dt))
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)

  return {
    stop() {
      if (stopped) return
      stopped = true
      cancelAnimationFrame(raf)
      source.disconnect()
      stream.getTracks().forEach((track) => track.stop())
      void ctx.close().catch(() => {})
    },
  }
}
