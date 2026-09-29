import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { audio } from '../lib/audio'

/** How long each number stays on screen (one full sweep of the hand) */
const STEP_MS = 800

/**
 * The countdown leader at the head of an old film reel: rings, crosshair, a sweeping hand and a big number.
 * Shows each number in `numbers` for one sweep, then calls `onDone`. Plays the classic "2-pop" beep on 2.
 */
export function Leader({ numbers, onDone }: { numbers: number[]; onDone: () => void }) {
  const [step, setStep] = useState(0)
  const number = numbers[step]

  useEffect(() => {
    audio.sfx(number === 2 ? 'beep' : 'tick')
    const id = window.setTimeout(() => (step + 1 < numbers.length ? setStep(step + 1) : onDone()), STEP_MS)
    return () => window.clearTimeout(id)
  }, [step, number, numbers.length, onDone])

  return (
    <motion.div
      className="leader-screen @container absolute inset-0 z-65 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      aria-hidden
    >
      <div key={`sweep-${step}`} className="leader-sweep absolute inset-0" />
      <svg className="absolute top-1/2 left-1/2 aspect-square w-[94cqw] -translate-1/2 overflow-visible" viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="46" stroke="rgba(255, 255, 255, 0.85)" strokeWidth="0.35" />
        <circle cx="50" cy="50" r="42.5" stroke="rgba(255, 255, 255, 0.28)" strokeWidth="2.4" />
        <circle cx="50" cy="50" r="39" stroke="rgba(255, 255, 255, 0.85)" strokeWidth="0.35" />
      </svg>
      {/* Crosshair and the two bars */}
      <span className="absolute top-0 bottom-0 left-1/2 -ml-[0.75px] w-[1.5px] bg-ink/80" />
      <span className="absolute top-1/2 right-0 left-0 -mt-[0.75px] h-[1.5px] bg-ink/80" />
      <span className="absolute top-1/2 left-0 -mt-1 h-2 w-[12%] bg-[#111]" />
      <span className="absolute top-1/2 right-0 -mt-1 h-2 w-[12%] bg-[#111]" />
      <span
        key={`number-${step}`}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[46%] animate-[leader-jitter_0.8s_steps(8)_forwards] font-ui text-[62cqw] leading-none font-bold text-[#141414] blur-[0.3px]"
      >
        {number}
      </span>
    </motion.div>
  )
}
