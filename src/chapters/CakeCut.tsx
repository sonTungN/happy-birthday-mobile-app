import { AnimatePresence, animate, motion, useMotionValue } from 'motion/react'
import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { CakeArt } from '../components/CakeArt'
import { EnvelopeArt } from '../components/EnvelopeArt'
import { content } from '../content'
import { audio } from '../lib/audio'
import { BODY, CAKE_H, CAKE_W, cutFace } from '../lib/cake'
import { burst, originOf } from '../lib/confetti'
import { capturePointer, evaluateCut, type Point } from '../lib/geometry'
import { hapticRef } from '../lib/haptics'
import { useTimers } from '../lib/hooks'
import { fill } from '../lib/text'

type Reason = 'short' | 'angle' | 'outside'

const TIPS: Record<Reason, string> = {
  short: 'All the way through, in one long swipe',
  angle: 'Cut straight down, top to bottom',
  outside: 'Aim for the middle of the cake',
}

/** The cut, as x positions (viewBox units) at the top (y = 0) and bottom (y = CAKE_H) of the cake box */
interface Cut {
  topX: number
  bottomX: number
}

interface CakeCutterProps {
  /** The birthday line, still on screen from the candles */
  greeting: string
  /** She tapped the envelope that was inside the cake */
  onDone: () => void
}

/**
 * The second half of the candles scene: right after the candles are out, the knife comes in and she cuts
 * the same cake (same size, same place) with one swipe down. It splits in two and there's an envelope inside.
 */
export function CakeCutter({ greeting, onDone }: CakeCutterProps) {
  const sceneRef = useRef<HTMLDivElement>(null)
  const cakeRef = useRef<HTMLDivElement>(null)
  const trailRef = useRef<SVGPolylineElement>(null)
  const envelopeRef = useRef<HTMLButtonElement | null>(null)
  const points = useRef<Point[]>([])
  const draggingRef = useRef(false)
  const later = useTimers()
  const [cut, setCut] = useState<Cut | null>(null)
  const [dragging, setDragging] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [fails, setFails] = useState(0)
  const [tip, setTip] = useState<string | null>(null)
  const knifeX = useMotionValue(0)
  const knifeY = useMotionValue(0)

  const local = (e: { clientX: number; clientY: number }): Point => {
    const r = sceneRef.current?.getBoundingClientRect()
    return r ? { x: e.clientX - r.left, y: e.clientY - r.top } : { x: 0, y: 0 }
  }

  const drawTrail = () => {
    const trail = trailRef.current
    if (!trail) return
    trail.setAttribute('points', points.current.map((p) => `${p.x},${p.y}`).join(' '))
    trail.style.transition = 'none'
    trail.style.opacity = '1'
  }

  const fadeTrail = () => {
    const trail = trailRef.current
    if (!trail) return
    trail.style.transition = 'opacity 0.5s ease-out 0.15s'
    trail.style.opacity = '0'
  }

  /** The cake's position inside the scene, and the scale from viewBox units to pixels */
  const cakeFrame = () => {
    const c = cakeRef.current?.getBoundingClientRect()
    const s = sceneRef.current?.getBoundingClientRect()
    if (!c || !s) return null
    return { left: c.left - s.left, top: c.top - s.top, width: c.width, height: c.height, sx: c.width / CAKE_W, sy: c.height / CAKE_H }
  }

  const doCut = (next: Cut) => {
    setCut(next)
    setTip(null)
    audio.sfx('slice')
    later(() => {
      setRevealed(true)
      audio.sfx('sparkle')
    }, 750)
    later(() => burst(originOf(envelopeRef.current, sceneRef.current), 60), 1250)
  }

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (cut || (e.target instanceof Element && e.target.closest('button'))) return
    capturePointer(e)
    const p = local(e)
    points.current = [p]
    knifeX.set(p.x)
    knifeY.set(p.y)
    draggingRef.current = true
    setDragging(true)
    setTip(null)
    drawTrail()
  }

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return
    const p = local(e)
    const last = points.current[points.current.length - 1]
    if (last && Math.hypot(p.x - last.x, p.y - last.y) < 3) return
    points.current.push(p)
    knifeX.set(p.x)
    knifeY.set(p.y)
    drawTrail()
  }

  const onUp = () => {
    if (!draggingRef.current) return
    draggingRef.current = false
    setDragging(false)
    fadeTrail()
    const f = cakeFrame()
    if (!f) return
    const box = { left: f.left + BODY.left * f.sx, top: f.top + BODY.top * f.sy, width: BODY.width * f.sx, height: BODY.height * f.sy }
    const result = evaluateCut(points.current, box)
    if (result.ok) {
      const { top, bottom } = result.line
      const slope = (bottom.x - top.x) / (bottom.y - top.y)
      const xAt = (y: number) => top.x + slope * (y - top.y)
      doCut({ topX: (xAt(f.top) - f.left) / f.sx, bottomX: (xAt(f.top + f.height) - f.left) / f.sx })
    } else {
      audio.sfx('fizzle')
      setFails((n) => n + 1)
      setTip(TIPS[result.reason])
    }
  }

  const cutForMe = async () => {
    const f = cakeFrame()
    if (!f || cut) return
    const x = f.left + f.width * 0.5
    points.current = [{ x, y: f.top + f.height * 0.18 }]
    knifeX.set(x)
    knifeY.set(points.current[0].y)
    setDragging(true)
    await animate(knifeY, f.top + f.height * 0.98, {
      duration: 0.5,
      ease: 'easeIn',
      onUpdate: (y) => {
        points.current.push({ x, y })
        drawTrail()
      },
    })
    setDragging(false)
    fadeTrail()
    doCut({ topX: CAKE_W / 2 - 2, bottomX: CAKE_W / 2 + 4 })
  }

  const envelopeLeft = cut ? (((cut.topX + cut.bottomX) / 2) / CAKE_W) * 100 : 50

  return (
    // Laid over the candles scene: it takes the swipe, the cake below it is drawn in the same spot
    <div ref={sceneRef} className="absolute inset-0 z-4 touch-none overflow-hidden" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <div className="pointer-events-none absolute top-[calc(var(--safe-top)+66px)] right-5 left-5 z-3 text-center">
        <AnimatePresence mode="wait">
          {revealed ? (
            <motion.div key="inside" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="font-display text-[26px] font-bold">Wait… there’s something inside</h1>
              <p className="mt-1.5 font-body text-[19px] italic opacity-92">
                {fill(content.cake.cutLine)} Tap the envelope to open it.
              </p>
            </motion.div>
          ) : (
            <motion.div key="cut" exit={{ opacity: 0, y: -8 }}>
              {/* Same look and place as the birthday line in the candles scene, so nothing jumps */}
              <h1 className="font-script text-[clamp(44px,13vw,60px)] leading-[1.1] font-normal [text-shadow:0_4px_24px_rgba(0,0,0,0.5)]">{greeting}</h1>
              <motion.p className="mt-1.5 font-body text-[19px] italic opacity-92" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                Now cut the cake. One long swipe, straight down.
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div ref={cakeRef} className="absolute top-[53%] left-1/2 z-2 aspect-[320/300] w-[min(82%,340px)] -translate-x-1/2 -translate-y-[46%]">
        {!cut ? (
          <>
            <CakeArt message={content.cake.message} className={CAKE_ART} />
            {/* Where to cut: a dashed line with an arrow (effects.css: .cake-guide) */}
            {!dragging && fails === 0 && (
              <span
                className="cake-guide pointer-events-none absolute top-[14%] bottom-[2%] left-1/2 animate-[cake-guide_1.6s_ease-in-out_infinite] border-l-2 border-dashed border-white/80"
                aria-hidden
              />
            )}
            {!dragging && (
              <motion.span
                key={fails}
                className="pointer-events-none absolute -top-[14%] -right-[4%] h-[140px] w-10 origin-[50%_80%]"
                initial={fails ? { rotate: 18 } : { rotate: 40, x: 90, opacity: 0 }}
                animate={fails ? { rotate: [18, 6, 30, 10, 24, 18] } : { rotate: 18, x: 0, opacity: 1 }}
                transition={fails ? { duration: 0.5 } : { type: 'spring', stiffness: 120, damping: 14 }}
              >
                <Knife hover />
              </motion.span>
            )}
          </>
        ) : (
          <>
            {revealed && (
              <span
                className="cake-glow pointer-events-none absolute top-[8%] aspect-square w-[90%] -translate-x-1/2 -translate-y-[30%] rounded-[50%]"
                style={{ left: `${envelopeLeft}%` }}
                aria-hidden
              />
            )}
            <motion.button
              ref={(el) => {
                envelopeRef.current = el
                hapticRef(el)
              }}
              type="button"
              className="absolute top-[30%] z-1 w-[44%] -translate-x-1/2 border-0 bg-transparent p-0"
              style={{ left: `${envelopeLeft}%` }}
              initial={{ y: '10%', scale: 0.3, opacity: 0 }}
              animate={revealed ? { y: '-80%', scale: 1, opacity: 1 } : { y: '10%', scale: 0.3, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 90, damping: 12 }}
              onClick={revealed ? onDone : undefined}
              aria-label="Open the envelope"
            >
              <EnvelopeArt initials={content.initials} />
            </motion.button>
            <Half side={-1} cut={cut} />
            <Half side={1} cut={cut} />
          </>
        )}
      </div>

      {/* The knife's trail */}
      <svg className="pointer-events-none absolute inset-0 z-5 h-full w-full overflow-visible" aria-hidden>
        <polyline
          ref={trailRef}
          className="opacity-0 drop-shadow-[0_0_6px_rgba(255,255,255,0.85)]"
          fill="none"
          stroke="rgba(255, 255, 255, 0.92)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Follows the finger: the knife's tip (14, 138) sits under the pointer */}
      {dragging && (
        <motion.span className="pointer-events-none absolute top-0 left-0 z-6 -mt-[138px] -ml-3.5 h-[140px] w-10" style={{ x: knifeX, y: knifeY }}>
          <Knife />
        </motion.span>
      )}

      <AnimatePresence>
        {tip && !cut && (
          <motion.p
            key={tip}
            className="hint absolute bottom-[calc(var(--safe-bottom)+96px)] left-1/2 z-4 w-max max-w-[calc(100%-40px)] -translate-x-1/2"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {tip}
          </motion.p>
        )}
      </AnimatePresence>

      {fails >= 2 && !cut && (
        <button
          type="button"
          className="btn btn-light absolute bottom-[calc(var(--safe-bottom)+26px)] left-1/2 z-7 -translate-x-1/2 whitespace-nowrap"
          onClick={() => void cutForMe()}
        >
          Cut it for me
        </button>
      )}
    </div>
  )
}

function Half({ side, cut }: { side: -1 | 1; cut: Cut }) {
  const top = (cut.topX / CAKE_W) * 100
  const bottom = (cut.bottomX / CAKE_W) * 100
  const clip = side < 0 ? `polygon(0% 0%, ${top}% 0%, ${bottom}% 100%, 0% 100%)` : `polygon(${top}% 0%, 100% 0%, 100% 100%, ${bottom}% 100%)`
  const face = cutFace(cut.topX, cut.bottomX, side)
  const gradient = `layers${side < 0 ? 'L' : 'R'}`
  return (
    <motion.div
      className="absolute inset-0 origin-[50%_90%]"
      style={{ clipPath: clip, WebkitClipPath: clip }}
      initial={{ x: '0%', rotate: 0 }}
      animate={{ x: `${side * 17}%`, rotate: side * 5 }}
      transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.15 }}
    >
      <CakeArt message={content.cake.message} className={CAKE_ART} />
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${CAKE_W} ${CAKE_H}`} aria-hidden>
        <defs>
          <linearGradient id={gradient} gradientUnits="userSpaceOnUse" x1="0" y1="118" x2="0" y2="282">
            <stop offset="0" stopColor="#fbfaf7" />
            <stop offset="0.07" stopColor="#fbfaf7" />
            <stop offset="0.07" stopColor="#c9c3b6" />
            <stop offset="0.34" stopColor="#c9c3b6" />
            <stop offset="0.34" stopColor="#f4f1ea" />
            <stop offset="0.42" stopColor="#f4f1ea" />
            <stop offset="0.42" stopColor="#3d3a37" />
            <stop offset="0.48" stopColor="#3d3a37" />
            <stop offset="0.48" stopColor="#c9c3b6" />
            <stop offset="0.78" stopColor="#c9c3b6" />
            <stop offset="0.78" stopColor="#f4f1ea" />
            <stop offset="0.85" stopColor="#f4f1ea" />
            <stop offset="0.85" stopColor="#b3ad9f" />
            <stop offset="1" stopColor="#a39d90" />
          </linearGradient>
        </defs>
        <polygon points={face.top} fill="#ece9e2" />
        <polygon points={face.body} fill={`url(#${gradient})`} />
      </svg>
    </motion.div>
  )
}

const CAKE_ART = 'block h-full w-full overflow-visible'

/** The cake knife. `hover`: it bobs while it waits beside the cake */
function Knife({ hover = false }: { hover?: boolean }) {
  return (
    <svg
      viewBox="0 0 40 140"
      className={`block h-[140px] w-10 drop-shadow-[0_6px_8px_rgba(0,0,0,0.5)] ${hover ? 'animate-[cake-hover_2s_ease-in-out_infinite]' : ''}`}
    >
      <defs>
        <linearGradient id="knife-blade" x1="0" x2="1">
          <stop offset="0" stopColor="#f6f6f4" />
          <stop offset="0.55" stopColor="#cfcdc8" />
          <stop offset="1" stopColor="#9d9b96" />
        </linearGradient>
      </defs>
      <rect x="10" y="4" width="22" height="50" rx="6" fill="#1c1c1c" stroke="#5a5956" strokeWidth="1.5" />
      <circle cx="21" cy="18" r="2.2" fill="#c8c5bd" />
      <circle cx="21" cy="38" r="2.2" fill="#c8c5bd" />
      <rect x="9" y="52" width="24" height="7" rx="2" fill="#8d8b86" />
      <path d="M12 59 H30 V118 Q30 131 14 138 Q12 100 12 59 Z" fill="url(#knife-blade)" stroke="#7d7b77" strokeWidth="1" />
    </svg>
  )
}
