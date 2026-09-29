import { AnimatePresence, animate, motion, useMotionValue } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { content } from '../content'
import { audio } from '../lib/audio'
import { buzz } from '../lib/haptics'
import { daysSince, pad, plural } from '../lib/text'

interface FilmAdvanceProps {
  /** Frames left on the roll */
  value: number
  /** Frames on the whole roll (the strip runs from this down to 00) */
  total: number
  /** The chapter is finished: winding on is possible */
  armed: boolean
  /** Runs once the film has been wound on */
  onWind: () => void
}

/** One frame of the strip, in px */
const FRAME = 38
/** The visible window of the strip, in px (the current frame sits in the middle) */
const WINDOW = 104
/** Ratchet clicks per frame */
const CLICKS = 6

/** Where the strip has to be for frame `v` to sit in the gate */
const positionOf = (v: number, total: number) => (WINDOW - FRAME) / 2 - (total - v) * FRAME

/**
 * The frame counter as a short piece of 35mm film running through a gate: frame numbers between the
 * sprocket holes, the current one lit in the gate. When a chapter is finished, "Wind on" appears and a tap
 * (or a flick across the strip) pulls the film on one frame, click by click, and the next chapter starts.
 * The rest of the time a tap shows her days on Earth.
 */
export function FilmAdvance({ value, total, armed, onWind }: FilmAdvanceProps) {
  const [showDays, setShowDays] = useState(false)
  const winding = useRef(false)
  const flick = useRef<{ x: number; y: number } | null>(null)
  const x = useMotionValue(positionOf(value, total))
  const days = daysSince(content.birthday)
  const frames = Array.from({ length: total + 1 }, (_, i) => total - i)

  // Whenever the frame changes (after winding, a restart, a jump), the strip glides to it
  useEffect(() => {
    if (winding.current) return
    const target = positionOf(value, total)
    if (x.get() !== target) void animate(x, target, { type: 'spring', stiffness: 260, damping: 30 })
  }, [value, total, x])

  useEffect(() => {
    if (!showDays) return
    const id = window.setTimeout(() => setShowDays(false), 3200)
    return () => window.clearTimeout(id)
  }, [showDays])

  const wind = () => {
    if (!armed || winding.current) return
    winding.current = true
    setShowDays(false)
    audio.sfx('ratchet')
    buzz(20)
    // Pull the film on by one frame, in ratchet clicks
    void animate(x, positionOf(Math.max(0, value - 1), total), { duration: 0.42, ease: (t) => Math.round(t * CLICKS) / CLICKS }).then(() => {
      winding.current = false
      onWind()
    })
  }

  return (
    <button
      type="button"
      className="group absolute top-[calc(var(--safe-top)+10px)] right-3 z-50 flex min-h-11 touch-none items-center gap-2.5 border-0 bg-transparent p-0 text-white"
      onClick={() => (armed ? wind() : days !== null && setShowDays((v) => !v))}
      // A flick across the strip winds it too
      onPointerDown={(e) => {
        flick.current = { x: e.clientX, y: e.clientY }
      }}
      onPointerMove={(e) => {
        const start = flick.current
        if (!start || !armed || Math.hypot(e.clientX - start.x, e.clientY - start.y) < 14) return
        flick.current = null
        wind()
      }}
      onPointerUp={() => {
        flick.current = null
      }}
      onPointerCancel={() => {
        flick.current = null
      }}
      aria-label={armed ? 'Wind on to the next frame' : `${plural(value, 'frame')} left`}
    >
      {/* "Wind on": only when the chapter is finished. Printed in ink over the newspaper's light page */}
      <span
        className={`overflow-hidden pt-0.5 font-ui text-[11px] font-bold tracking-[0.2em] whitespace-nowrap uppercase transition-[max-width,opacity] duration-[450ms,300ms] ease-[cubic-bezier(0.3,0.7,0.3,1),ease] [text-shadow:0_1px_6px_rgba(0,0,0,0.85)] in-data-[surface=paper]:text-ink in-data-[surface=paper]:[text-shadow:0_1px_0_rgba(255,255,255,0.4)] ${armed ? 'max-w-24 opacity-100' : 'max-w-0 opacity-0'}`}
        aria-hidden
      >
        Wind on
      </span>
      {/* A short piece of 35mm film fading into the dark at both ends (drawn in effects.css: .film-strip) */}
      <span
        className={`film-strip relative block h-11 w-[104px] overflow-hidden rounded-[5px] border transition-[border-color] duration-300 group-active:translate-y-px ${armed ? 'border-paper/65' : 'border-paper/30'}`}
        aria-hidden
      >
        <motion.span className="film-track absolute top-0 bottom-0 left-0 flex" style={{ x, width: frames.length * FRAME }}>
          {frames.map((n) => (
            <span key={n} className="grid h-full flex-none place-items-center" style={{ width: FRAME }}>
              <span
                className={`grid h-[22px] w-[30px] place-items-center rounded-xs pt-0.5 font-ui text-[12px] font-bold tracking-[0.06em] transition-[color,background-color] duration-300 ${n === value ? 'bg-[#3b3833] text-bone' : 'bg-[#2b2925] text-paper/50'}`}
              >
                {pad(n)}
              </span>
            </span>
          ))}
        </motion.span>
        {/* The gate: the current frame sits in it, and glows once winding on is possible */}
        <span
          className={`pointer-events-none absolute top-[9px] bottom-[9px] left-1/2 w-[34px] -translate-x-1/2 rounded-[3px] border-[1.5px] ${armed ? 'animate-[film-gate_1.6s_ease-in-out_infinite] border-[#fff] motion-reduce:animate-none' : 'border-paper/75'}`}
        />
      </span>
      <AnimatePresence>
        {showDays && days !== null && (
          <motion.span
            className="absolute top-[calc(100%+8px)] right-0 rounded-[3px] bg-bone px-3 py-2 font-body text-[16px] whitespace-nowrap text-ink italic shadow-[4px_4px_0_rgba(0,0,0,0.5)]"
            initial={{ opacity: 0, y: -6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.9 }}
          >
            {days.toLocaleString('en-US')} days on Earth
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}
