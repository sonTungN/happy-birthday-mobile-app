import { AnimatePresence, motion, useMotionValue } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { CakeArt } from '../components/CakeArt'
import { Candle, Flame } from '../components/Candle'
import { content } from '../content'
import { audio } from '../lib/audio'
import { MicError, startMic, type BlowFrame, type MicErrorKind, type MicSession } from '../lib/blow'
import { numberSpots } from '../lib/cake'
import { celebrate } from '../lib/confetti'
import { capturePointer, distance, distanceToSegment, insideRect, type Box, type Point } from '../lib/geometry'
import { hapticRef } from '../lib/haptics'
import { params, useAfter, useLatest, useTimers } from '../lib/hooks'
import { candleAge, fill } from '../lib/text'
import { CakeCutter } from './CakeCut'
import Letter from './Letter'

/**
 * light → (ask) → blow or manual → party → cut: the knife comes in and she cuts this same cake →
 * letter: she taps the envelope that was inside and it opens here, with no chapter change in between
 */
type Step = 'light' | 'ask' | 'blow' | 'manual' | 'party' | 'cut' | 'letter'

/** For testing: ?chapter=cake or ?chapter=letter start this scene further along */
const FIRST_STEP: Step = params.get('chapter') === 'letter' ? 'letter' : params.get('chapter') === 'cake' ? 'cut' : 'light'

interface CandleState {
  id: number
  digit: string
  lit: boolean
  trick: boolean
  outs: number
  x: number
  y: number
  lean: number
}

/** "Breath energy" needed to blow out one candle (≈ ms of blowing, more when blowing harder) */
const PER_CANDLE = 260
/** Matchstick length (px) and tilt (deg); the finger holds the bottom end */
const MATCH = { length: 86, angle: -26 }
const HEAD = {
  dx: Math.sin((MATCH.angle * Math.PI) / 180) * (MATCH.length - 9),
  dy: -Math.cos((MATCH.angle * Math.PI) / 180) * (MATCH.length - 9),
}

const MIC_ERRORS: Record<MicErrorKind, string> = {
  denied: 'The mic permission was turned down, so let’s blow with a finger instead.',
  insecure: 'The mic only works on a secure (https) link. Let’s blow with a finger instead.',
  unsupported: 'This browser can’t use the mic. Let’s blow with a finger instead.',
  failed: 'Couldn’t open the mic. Let’s blow with a finger instead.',
}

function numberParam(name: string): number | undefined {
  const value = params.get(name)
  const n = value === null ? Number.NaN : Number(value)
  return Number.isFinite(n) ? n : undefined
}

// Tune the blow detector on a real phone without redeploying: ?debug&minrms=0.08&ratio=4
const DETECTOR = { minRms: numberParam('minrms'), ratio: numberParam('ratio') }

/** One number candle per digit of her age; the last one is the trick candle */
function createCandles(): CandleState[] {
  const digits = String(candleAge()).split('')
  const spots = numberSpots(digits.length)
  const trickIndex = content.cake.trickCandle && digits.length > 1 ? digits.length - 1 : -1
  return spots.map((spot, i) => ({
    id: i,
    digit: digits[i],
    lit: false,
    trick: i === trickIndex,
    outs: 0,
    x: spot.x,
    y: spot.y,
    lean: i % 2 ? 0.85 : -0.85,
  }))
}

/**
 * Chapter 4, one continuous scene: strike a match, light the number candles, blow them out into the mic,
 * cut the cake, find the envelope inside and read the letter. The letter's end lights up the wind-on wheel.
 */
export default function Candles() {
  const sceneRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const strikerRef = useRef<HTMLSpanElement>(null)
  const wickRefs = useRef<(HTMLSpanElement | null)[]>([])
  const meterRef = useRef<HTMLSpanElement>(null)
  const debugRef = useRef<HTMLPreElement>(null)
  const micRef = useRef<MicSession | null>(null)
  const matchLitRef = useRef(false)
  const allLitRef = useRef(false)
  const trickUsed = useRef(false)
  const energy = useRef(0)
  const lastSpark = useRef(0)
  const drag = useRef<{ striker: Box; wicks: Point[]; strike: number; last: Point } | null>(null)
  const later = useTimers()

  const [step, setStep] = useState<Step>(FIRST_STEP)
  const [candles, setCandles] = useState(createCandles)
  const candlesRef = useRef(candles)
  const [matchLit, setMatchLit] = useState(false)
  const [matchGone, setMatchGone] = useState(false)
  const [sparks, setSparks] = useState<Point[]>([])
  const [trickMessage, setTrickMessage] = useState(false)
  const [micError, setMicError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [candlesOut, setCandlesOut] = useState(FIRST_STEP !== 'light')
  const matchX = useMotionValue(0)
  const matchY = useMotionValue(0)
  const stepRef = useLatest(step)

  const lightTimer = useAfter(14000, step)
  const blowTimer = useAfter(9000, step)
  const litCount = candles.filter((c) => c.lit).length

  // Park the match on the matchbox, head resting just above the striker
  useLayoutEffect(() => {
    const scene = sceneRef.current
    const box = boxRef.current
    if (!scene || !box) return
    const s = scene.getBoundingClientRect()
    const b = box.getBoundingClientRect()
    matchX.set(b.right - s.left - 14)
    matchY.set(b.top - s.top + 46)
  }, [matchX, matchY])

  // Leaving the chapter early: close the mic and bring the music back
  useEffect(
    () => () => {
      if (micRef.current) {
        micRef.current.stop()
        micRef.current = null
        audio.endMic()
      }
      audio.release('musicbox')
    },
    [],
  )

  const updateCandles = (next: CandleState[]) => {
    candlesRef.current = next
    setCandles(next)
  }

  const setBlow = (value: number) => sceneRef.current?.style.setProperty('--blow', value.toFixed(3))

  // ---------- lighting ----------

  const ignite = () => {
    if (matchLitRef.current) return
    matchLitRef.current = true
    setMatchLit(true)
    audio.sfx('strike')
    later(() => audio.sfx('ignite'), 90)
  }

  const light = (id: number) => {
    if (candlesRef.current.find((c) => c.id === id)?.lit) return
    const next = candlesRef.current.map((c) => (c.id === id ? { ...c, lit: true } : c))
    updateCandles(next)
    audio.sfx('ignite')
    if (next.every((c) => c.lit) && !allLitRef.current) {
      allLitRef.current = true
      drag.current = null
      later(() => {
        setMatchGone(true)
        audio.sfx('puff')
      }, 600)
      later(() => setStep('ask'), 1300)
    }
  }

  const lightAll = () => {
    ignite()
    candlesRef.current
      .filter((c) => !c.lit)
      .forEach((c, i) => later(() => light(c.id), 250 + i * 170))
  }

  // ---------- blowing ----------

  const stopMic = () => {
    if (!micRef.current) return
    micRef.current.stop()
    micRef.current = null
    audio.endMic()
  }

  const party = () => {
    if (stepRef.current === 'party') return
    stepRef.current = 'party'
    stopMic()
    setBlow(0)
    setTrickMessage(false)
    setStep('party')
    celebrate(3000)
    audio.hold('musicbox')
    later(() => {
      const ms = audio.musicBox()
      later(() => audio.release('musicbox'), ms)
    }, 450)
    // Then the candles come out of the cake and the knife comes in
    later(() => setCandlesOut(true), 2600)
    later(() => setStep('cut'), 3300)
  }

  const allOut = () => {
    const trick = candlesRef.current.find((c) => c.trick)
    if (trick && !trickUsed.current) {
      trickUsed.current = true
      later(() => {
        energy.current = 0
        updateCandles(candlesRef.current.map((c) => (c.id === trick.id ? { ...c, lit: true } : c)))
        audio.sfx('ignite')
        setTrickMessage(true)
      }, 1100)
      return
    }
    party()
  }

  const extinguish = (id: number) => {
    if (!candlesRef.current.find((c) => c.id === id)?.lit) return
    const next = candlesRef.current.map((c) => (c.id === id ? { ...c, lit: false, outs: c.outs + 1 } : c))
    updateCandles(next)
    audio.sfx('puff')
    if (next.every((c) => !c.lit)) allOut()
  }

  const blowOutOne = () => {
    const lit = candlesRef.current.filter((c) => c.lit)
    if (!lit.length) return
    const normal = lit.filter((c) => !c.trick)
    const pool = normal.length ? normal : lit
    extinguish(pool[Math.floor(Math.random() * pool.length)].id)
  }

  const onFrame = (frame: BlowFrame) => {
    setBlow(frame.level)
    meterRef.current?.style.setProperty('--level', frame.level.toFixed(3))
    if (debugRef.current) {
      debugRef.current.textContent = `rms ${frame.rms.toFixed(3)}  base ${frame.baseline.toFixed(3)}  thr ${frame.threshold.toFixed(3)}  lvl ${frame.level.toFixed(2)} ${frame.blowing ? 'BLOW' : ''}`
    }
    if (stepRef.current !== 'blow') return
    energy.current = frame.blowing ? energy.current + frame.dt * (0.6 + frame.level) : Math.max(0, energy.current - frame.dt * 0.25)
    if (energy.current >= PER_CANDLE) {
      energy.current -= PER_CANDLE
      blowOutOne()
    }
  }
  const frameRef = useLatest(onFrame)

  const enableMic = async () => {
    if (connecting) return
    setConnecting(true)
    audio.beginMic()
    try {
      micRef.current = await startMic((frame) => frameRef.current(frame), DETECTOR)
      setStep('blow')
    } catch (err) {
      audio.endMic()
      setMicError(MIC_ERRORS[err instanceof MicError ? err.kind : 'failed'])
      setStep('manual')
    } finally {
      setConnecting(false)
    }
  }

  const switchToManual = () => {
    stopMic()
    setBlow(0)
    setStep('manual')
  }

  // ---------- pointer: the match while lighting, a finger "wind" in manual mode ----------

  const localPoint = (e: ReactPointerEvent): Point => {
    const r = sceneRef.current?.getBoundingClientRect()
    return r ? { x: e.clientX - r.left, y: e.clientY - r.top } : { x: 0, y: 0 }
  }

  const measure = (): { striker: Box; wicks: Point[] } => {
    const s = sceneRef.current?.getBoundingClientRect()
    const st = strikerRef.current?.getBoundingClientRect()
    const striker = s && st ? { left: st.left - s.left, top: st.top - s.top - 12, width: st.width, height: st.height + 30 } : { left: 0, top: 0, width: 0, height: 0 }
    const wicks = wickRefs.current.map((el) => {
      if (!el || !s) return { x: -9999, y: -9999 }
      const r = el.getBoundingClientRect()
      return { x: r.left + r.width / 2 - s.left, y: r.top - s.top }
    })
    return { striker, wicks }
  }

  const spark = (at: Point, now: number) => {
    if (now - lastSpark.current < 60) return
    lastSpark.current = now
    audio.sfx('fizzle')
    setSparks((list) => [...list.slice(-6), at])
    later(() => setSparks((list) => list.slice(1)), 420)
  }

  const moveHead = (head: Point, now: number) => {
    const d = drag.current
    if (!d) return
    if (!matchLitRef.current) {
      if (insideRect(head, d.striker)) {
        d.strike += distance(head, d.last)
        spark(head, now)
        if (d.strike > 70) ignite()
      } else {
        d.strike = Math.max(0, d.strike - 15)
      }
    } else {
      candlesRef.current.forEach((c, i) => {
        if (!c.lit && distance(head, d.wicks[i]) < 30) light(c.id)
      })
    }
    d.last = head
  }

  const blowAlong = (from: Point, to: Point) => {
    const d = drag.current
    if (!d) return
    setBlow(Math.min(1, distance(from, to) / 25))
    candlesRef.current.forEach((c, i) => {
      if (!c.lit) return
      const flame = { x: d.wicks[i].x, y: d.wicks[i].y - 16 }
      if (distanceToSegment(flame, from, to) < 30) extinguish(c.id)
    })
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    // Taps on buttons are theirs: capturing the pointer here would swallow their click.
    if (e.target instanceof Element && e.target.closest('button')) return
    if (step === 'light' && !allLitRef.current) {
      capturePointer(e)
      const p = localPoint(e)
      const head = { x: p.x + HEAD.dx, y: p.y + HEAD.dy }
      drag.current = { ...measure(), strike: 0, last: head }
      matchX.set(p.x)
      matchY.set(p.y)
      moveHead(head, e.timeStamp)
    } else if (step === 'manual') {
      capturePointer(e)
      const p = localPoint(e)
      drag.current = { ...measure(), strike: 0, last: p }
      blowAlong(p, p)
    }
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    const p = localPoint(e)
    if (step === 'light') {
      matchX.set(p.x)
      matchY.set(p.y)
      moveHead({ x: p.x + HEAD.dx, y: p.y + HEAD.dy }, e.timeStamp)
    } else if (step === 'manual') {
      blowAlong(d.last, p)
      d.last = p
    }
  }

  const onPointerUp = () => {
    drag.current = null
    if (step === 'manual') setBlow(0)
  }

  // ---------- render ----------

  const debug = params.has('debug')
  const cutting = step === 'cut' || step === 'letter'
  const celebrating = step === 'party' || cutting
  const statusTitle =
    step === 'light' ? 'Light the candles' : step === 'blow' ? 'Now, blow' : step === 'manual' ? 'Blow them out' : null
  const statusText = trickMessage
    ? fill(content.cake.trickLine)
    : step === 'light'
      ? matchLit
        ? 'Now touch each wick with the flame'
        : 'Drag the match along the side of the box to strike it'
      : step === 'blow'
        ? 'The mic is on the bottom edge of your phone'
        : step === 'manual'
          ? (micError ?? 'Swipe across the flames to blow them out')
          : null

  return (
    <div
      ref={sceneRef}
      className="absolute inset-0 touch-none overflow-hidden [--blow:0]"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_45%,#262626_0%,#121212_55%,#050505_100%)]" />
      {/* Candlelight on the walls grows with every candle lit */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 aspect-square w-[160%] -translate-1/2 bg-[radial-gradient(circle,rgba(255,246,228,0.3)_0%,rgba(255,240,215,0.1)_32%,transparent_62%)] transition-opacity duration-600"
        style={{ opacity: celebrating ? 0 : litCount / candles.length }}
      />
      <motion.div className="film-bg pointer-events-none absolute inset-0" initial={false} animate={{ opacity: celebrating ? 1 : 0 }} transition={{ duration: 1.2 }} />

      {/* Once the cake is being cut, CakeCutter shows its own header in the same place */}
      {!cutting && (
        <div className="pointer-events-none absolute top-[calc(var(--safe-top)+66px)] right-5 left-5 z-5 text-center">
          <AnimatePresence mode="wait">
            {step === 'party' ? (
              <motion.h1
                key="party"
                className="font-script text-[clamp(44px,13vw,60px)] leading-[1.1] font-normal [text-shadow:0_4px_24px_rgba(0,0,0,0.5)]"
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 12, delay: 0.3 }}>
                {fill(content.cake.birthdayLine)}
              </motion.h1>
            ) : statusTitle ? (
              <motion.div key={`${step}-${trickMessage}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <h1 className="font-display text-[26px] font-bold">{statusTitle}</h1>
                {statusText && <p className="mt-1.5 font-body text-[19px] leading-[1.35] text-balance italic opacity-92">{statusText}</p>}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      )}

      {!cutting && (
        <div className="absolute top-[53%] left-1/2 z-2 aspect-[320/300] w-[min(82%,340px)] -translate-x-1/2 -translate-y-[46%]">
          <CakeArt message={content.cake.message} className="block h-full w-full overflow-visible" />
          {/* The candles lift out of the cake before it is cut */}
          <motion.div className="absolute inset-0" initial={false} animate={candlesOut ? { y: -40, opacity: 0 } : { y: 0, opacity: 1 }} transition={{ duration: 0.6, ease: 'easeIn' }}>
            {candles.map((c, i) => (
              <Candle
                key={c.id}
                digit={c.digit}
                lit={c.lit}
                trick={c.trick}
                lean={c.lean}
                outs={c.outs}
                style={{ left: `${c.x}%`, top: `${c.y}%` }}
                wickRef={(el) => {
                  wickRefs.current[i] = el
                }}
              />
            ))}
          </motion.div>
        </div>
      )}

      {step === 'light' && (
        // An old safety-match box (effects.css: .match-box, .match-striker)
        <div ref={boxRef} className="match-box absolute bottom-[calc(var(--safe-bottom)+64px)] left-[18px] z-3 h-[78px] w-[124px] rounded-sm bg-bone" aria-hidden>
          <span ref={strikerRef} className="match-striker absolute top-0 right-0 left-0 h-4 rounded-t-sm" />
          <span className="absolute top-6 right-0 left-0 text-center font-ui text-[10px] leading-[1.5] font-bold tracking-[0.2em] text-[#1c1c1c] uppercase">
            <b className="block font-display text-[17px] tracking-[0.04em] normal-case">Safety</b>
            matches
          </span>
        </div>
      )}

      {step === 'light' && (
        <motion.div className="pointer-events-none absolute top-0 left-0 z-6 h-0 w-0" style={{ x: matchX, y: matchY }} animate={matchGone ? { opacity: 0, scale: 0.6 } : { opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
          <span
            className="match-stick absolute bottom-0 -left-1 h-(--len) w-2 origin-bottom rotate-(--angle) rounded-[3px] shadow-[0_4px_8px_rgba(0,0,0,0.45)]"
            style={{ '--len': `${MATCH.length}px`, '--angle': `${MATCH.angle}deg` } as CSSProperties}
          >
            <span className="match-head absolute -top-2 -left-[3px] h-[18px] w-[14px]">
              {matchLit && !matchGone && (
                <span className="absolute top-[25%] left-1/2 h-0 w-0 rotate-[calc(var(--angle)*-1)]">
                  <Flame size={0.8} lean={1} />
                </span>
              )}
            </span>
          </span>
        </motion.div>
      )}

      {sparks.map((s, i) => (
        <span
          key={`${s.x}-${s.y}-${i}`}
          className="match-spark pointer-events-none absolute z-7 -mt-[2.5px] -ml-[2.5px] h-[5px] w-[5px] rounded-[50%] bg-[#fffaf0] shadow-[0_0_6px_2px_rgba(255,245,225,0.8)]"
          style={{ left: s.x, top: s.y }}
        />
      ))}

      {step === 'light' && lightTimer && (
        <button type="button" className="btn btn-light absolute right-4 bottom-[calc(var(--safe-bottom)+18px)] z-8" onClick={lightAll}>
          Light them for me
        </button>
      )}

      <AnimatePresence>
        {step === 'ask' && (
          <motion.div
            key="ask"
            className="absolute right-0 bottom-0 left-0 z-9 flex flex-col gap-3 border-t-[1.5px] border-ink bg-bone px-6 pt-[26px] pb-[calc(var(--safe-bottom)+18px)] text-center text-ink shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
            initial={{ y: '110%' }}
            animate={{ y: 0 }}
            exit={{ y: '110%' }}
            transition={{ type: 'spring', stiffness: 170, damping: 24 }}
          >
            <h2 className="font-display text-[24px] font-bold">Time to blow out the candles</h2>
            <p className="font-body text-[18px] leading-[1.4] text-smoke">Allow the microphone so you can blow for real. Nothing is recorded or sent anywhere.</p>
            <p className="flex items-center gap-3.5 rounded-[3px] border border-black/15 bg-[#ddd7ca] px-3.5 py-3 text-left font-body text-[17px] leading-[1.35]">
              {/* A little phone with the mic pinging at the bottom */}
              <span className="relative h-[46px] w-[26px] flex-none rounded-[7px] border-[2.5px] border-ink" aria-hidden>
                <span className="absolute -bottom-[11px] left-1/2 -ml-1 h-2 w-2 animate-[mic-ping_1.2s_ease-out_infinite] rounded-[50%] bg-ink" />
              </span>
              The mic is on the bottom edge of your phone. Blow right there.
            </p>
            <button type="button" className="btn btn-dark" ref={hapticRef} onClick={() => void enableMic()} disabled={connecting}>
              {connecting ? 'Opening the mic…' : 'Turn on the mic'}
            </button>
            <button type="button" className="btn-ghost text-[#3a3a3a]" onClick={switchToManual} disabled={connecting}>
              I’ll blow with my finger instead
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {step === 'blow' && (
        <div className="absolute right-0 bottom-[calc(var(--safe-bottom)+12px)] left-0 z-5 flex flex-col items-center gap-2">
          {/* How hard she is blowing (--level, 0..1) */}
          <span className="h-2 w-[180px] overflow-hidden rounded-[1px] border border-white/50 bg-[rgba(255,255,255,0.08)]">
            <span ref={meterRef} className="block h-full w-full origin-left bg-white [transform:scaleX(var(--level,0))] transition-transform duration-80 ease-linear" />
          </span>
          <span className="animate-[blow-bob_1s_ease-in-out_infinite] text-[26px]" aria-hidden>
            ↓
          </span>
          {blowTimer && (
            <button type="button" className="btn-ghost" onClick={switchToManual}>
              Not working? Blow with your finger instead
            </button>
          )}
        </div>
      )}

      {cutting && <CakeCutter greeting={fill(content.cake.birthdayLine)} onDone={() => setStep('letter')} />}

      {/* The envelope from the cake opens right here: the letter fades in over the scene */}
      {step === 'letter' && (
        <motion.div className="absolute inset-0 z-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7 }}>
          <Letter />
        </motion.div>
      )}

      {debug && (
        <pre
          ref={debugRef}
          className="pointer-events-none absolute right-2 bottom-[calc(var(--safe-bottom)+96px)] left-2 z-20 m-0 rounded-sm bg-black/70 px-2 py-1.5 whitespace-pre-wrap text-[#cfc] [font:11px/1.3_ui-monospace,monospace]"
        />
      )}
    </div>
  )
}
