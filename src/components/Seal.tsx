import { motion } from 'motion/react'
import { useId } from 'react'

interface SealProps {
  /** The word in the middle, e.g. 'CLAIMED' */
  word: string
  /** The text around the ring. Upper-cased here: Safari can't upper-case SVG text with CSS */
  ring: string
  /** Size, position and ink colour (the seal inks in currentColor) */
  className?: string
  /** Seconds before it thumps down */
  delay?: number
}

/** A round rubber stamp (a "dấu mộc"): a ring of text around one word, in slightly uneven ink. Thumps down when it mounts. */
export function Seal({ word, ring, className = '', delay = 0.25 }: SealProps) {
  const id = useId().replace(/[^\w-]/g, '')
  return (
    <motion.svg
      className={`pointer-events-none overflow-visible ${className}`}
      viewBox="0 0 100 100"
      aria-label={word}
      initial={{ scale: 1.9, opacity: 0, rotate: -2 }}
      animate={{ scale: 1, opacity: 1, rotate: -14 }}
      transition={{ type: 'spring', stiffness: 380, damping: 18, delay }}
    >
      <defs>
        <path id={`ring-${id}`} d="M50 50m-36 0a36 36 0 1 1 72 0a36 36 0 1 1-72 0" />
        {/* Uneven ink: the rubber doesn't print every speck */}
        <filter id={`ink-${id}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.35" result="speckle" />
          <feComposite in="SourceGraphic" in2="speckle" operator="in" />
        </filter>
      </defs>
      <g filter={`url(#ink-${id})`}>
        <circle cx="50" cy="50" r="46.5" fill="none" stroke="currentColor" strokeWidth="3.5" />
        <circle cx="50" cy="50" r="27" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <text className="fill-current font-ui text-[9px] font-bold">
          <textPath href={`#ring-${id}`} textLength="222" lengthAdjust="spacing">
            {ring.toUpperCase()}
          </textPath>
        </text>
        <text className="fill-current font-ui text-[11px] font-bold" x="50" y="54.5" textAnchor="middle" textLength="46" lengthAdjust="spacingAndGlyphs">
          {word.toUpperCase()}
        </text>
      </g>
    </motion.svg>
  )
}
