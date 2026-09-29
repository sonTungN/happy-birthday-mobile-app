import { AnimatePresence, motion } from 'motion/react'
import { useId, type CSSProperties, type Ref } from 'react'

interface CandleProps {
  /** '0'–'9' */
  digit: string
  lit: boolean
  /** The trick candle has bold black-and-white stripes */
  trick?: boolean
  /** Which way (and how far) the flame bends when someone blows: -1..1 */
  lean: number
  /** How many times it has been blown out, used to replay the smoke */
  outs: number
  style?: CSSProperties
  wickRef?: Ref<HTMLSpanElement>
}

// Center lines of the numerals in a 60×80 box (drawn with a thick round stroke), and where the wick sits
const DIGITS: Record<string, { d: string; wick: number }> = {
  '0': { d: 'M30 10C49 10 49 70 30 70C11 70 11 10 30 10Z', wick: 30 },
  '1': { d: 'M19 22L33 10V70', wick: 33 },
  '2': { d: 'M13 25C13 5 47 5 47 25C47 40 26 50 13 70H48', wick: 30 },
  '3': { d: 'M14 18C22 6 46 8 45 24C44 36 32 39 26 39C36 39 48 44 47 56C46 74 20 76 12 62', wick: 30 },
  '4': { d: 'M40 70V10L12 52H50', wick: 40 },
  '5': { d: 'M46 10H18L15 36C22 31 30 30 36 32C50 37 50 68 30 70C22 71 15 66 12 61', wick: 32 },
  '6': { d: 'M44 14C36 7 16 8 14 36C12 62 22 70 30 70C42 70 48 62 48 52C48 40 40 35 31 35C22 35 15 41 14 48', wick: 28 },
  '7': { d: 'M12 10H48L24 70', wick: 30 },
  '8': { d: 'M30 38C16 38 14 10 30 10C46 10 44 38 30 38C12 38 12 70 30 70C48 70 48 38 30 38Z', wick: 30 },
  '9': { d: 'M46 32C45 40 38 45 30 45C20 45 12 38 12 28C12 16 20 10 30 10C42 10 47 20 46 32C45 56 36 70 16 66', wick: 30 },
}

/**
 * A number candle (one digit). It is positioned by its bottom-center point (set `left`/`top` in `style`).
 * The flame reacts to the `--blow` CSS variable (0..1) set on any ancestor; it is drawn in effects.css (.candle-*).
 */
export function Candle({ digit, lit, trick = false, lean, outs, style, wickRef }: CandleProps) {
  const glyph = DIGITS[digit] ?? DIGITS['0']
  const stripes = `stripes-${useId().replace(/[^\w-]/g, '')}`
  return (
    <div className="absolute aspect-[60/80] w-[19%] -translate-x-1/2 -translate-y-full" style={style}>
      <svg
        viewBox="0 0 60 80"
        className="absolute inset-0 h-full w-full overflow-visible drop-shadow-[2px_3px_2px_rgba(0,0,0,0.35)]"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <defs>
          <pattern id={stripes} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-40)">
            <rect width="8" height="8" fill="#f4f1ea" />
            <rect width="3.4" height="8" fill={trick ? '#1c1c1c' : '#a9a6a0'} />
          </pattern>
        </defs>
        <path d={glyph.d} stroke="#141414" strokeWidth="15.5" />
        <path d={glyph.d} stroke={`url(#${stripes})`} strokeWidth="12.5" />
        {/* A thin highlight along the wax */}
        <path d={glyph.d} stroke="rgba(255, 255, 255, 0.6)" strokeWidth="2.2" className="-translate-x-[2.2px] -translate-y-[2px]" />
      </svg>
      {/* The wick stands on the top of the numeral (y ≈ 3 in the 60×80 box) */}
      <span className="absolute top-[4%] -ml-px h-2 w-0.5 -translate-y-full rounded-[1px] bg-[#1a1a1a]" style={{ left: `${(glyph.wick / 60) * 100}%` }} ref={wickRef}>
        <AnimatePresence>{lit && <Flame key="flame" lean={lean} seed={outs} />}</AnimatePresence>
        {!lit && outs > 0 && <Smoke key={outs} />}
      </span>
    </div>
  )
}

/** A flickering flame anchored at its base. */
export function Flame({ lean = 1, size = 1, seed = 0 }: { lean?: number; size?: number; seed?: number }) {
  return (
    // A zero-size point at the top of the wick
    <span className="absolute top-0.5 left-1/2 h-0 w-0" style={{ '--lean': lean, '--size': size, '--seed': seed } as CSSProperties}>
      <motion.span
        className="pointer-events-none absolute bottom-0 left-[calc(-8px*var(--size))] h-[calc(34px*var(--size))] w-[calc(16px*var(--size))] origin-bottom"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0, transition: { duration: 0.18 } }}
        transition={{ type: 'spring', stiffness: 320, damping: 14 }}
      >
        <span className="candle-glow absolute top-[55%] left-1/2 h-[calc(110px*var(--size))] w-[calc(110px*var(--size))] -translate-1/2 rounded-[50%]" />
        <span className="candle-bend absolute inset-0">
          <span className="candle-fire absolute inset-0">
            <span className="candle-core absolute right-[34%] bottom-[7%] left-[34%] h-[30%] rounded-[50%]" />
          </span>
        </span>
      </motion.span>
    </span>
  )
}

function Smoke() {
  return (
    <span className="candle-smoke pointer-events-none absolute bottom-full left-1/2 h-0 w-0" aria-hidden>
      <span />
      <span />
      <span />
    </span>
  )
}
