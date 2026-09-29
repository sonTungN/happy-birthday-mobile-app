import { motion, type MotionStyle } from "motion/react";
import type { CSSProperties, ReactNode } from "react";
import { stampParts } from "../lib/text";

interface PolaroidProps {
  src: string;
  alt?: string;
  caption?: string;
  /** 'YYYY-MM-DD' → date imprinted in the corner of the photo */
  date?: string;
  /** CSS object-position used to crop the photo into a square */
  focus?: string;
  className?: string;
  style?: CSSProperties;
  /** Extra styles for the photo area, e.g. the developing filter (it stacks on top of the black-and-white look) */
  photoStyle?: MotionStyle;
  /** Layers inside the photo area (e.g. the developing overlay) */
  children?: ReactNode;
  /** Things stuck on top of the card (tape, stickers) */
  extras?: ReactNode;
}

/**
 * An instant photo. Its width must be set by the parent: every size inside scales with it (cqw = % of the card's width).
 * The paper and the vignette are drawn in effects.css (.polaroid-card, .polaroid-photo).
 */
export function Polaroid({
  src,
  alt = "",
  caption,
  date,
  focus,
  className = "",
  style,
  photoStyle,
  children,
  extras,
}: PolaroidProps) {
  const stamp = date ? stampParts(date) : null;
  return (
    <div
      className={`polaroid-card @container relative rounded-xs px-[5.5%] pt-[5.5%] pb-[21%] ${className}`}
      style={style}
    >
      <motion.div
        className="polaroid-photo relative aspect-square overflow-hidden bg-[#1a1a1a]"
        style={photoStyle}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          decoding="async"
          className="h-full w-full object-cover [filter:var(--photo-filter)]"
          style={{ objectPosition: focus }}
        />
        {stamp && (
          // The date the camera printed in the corner, in pale silver
          <span
            className="pointer-events-none absolute right-[7%] bottom-[6%] z-1 inline-flex gap-[0.45em] font-seg text-[max(6px,4.4cqw)] text-white/90 [text-shadow:0_0_2px_rgba(255,255,255,0.6),0_1px_2px_rgba(0,0,0,0.6)]"
            aria-hidden
          >
            <span>
              <span className="font-ui font-bold">’</span>
              {stamp[0]}
            </span>
            <span>{stamp[1]}</span>
            <span>{stamp[2]}</span>
          </span>
        )}
        {children}
      </motion.div>
      {caption && (
        <p className="absolute right-[6%] bottom-0 left-[6%] grid h-[21%] place-items-center overflow-hidden text-center font-body text-[9cqw] leading-[1.05] whitespace-nowrap text-ellipsis text-[#2a2a2a] italic">
          {caption}
        </p>
      )}
      {extras}
    </div>
  );
}

type TapeColor = "paper" | "smoke";

/** A strip of old masking tape across the top of a print. Tilt it with `style={{ rotate: '3deg' }}`. */
export function Tape({
  color = "paper",
  className = "",
  style,
}: {
  color?: TapeColor;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden
      className={`tape tape-${color} pointer-events-none absolute -top-[5%] left-[29%] z-3 h-[11%] w-[42%] -rotate-4 ${className}`}
      style={style}
    />
  );
}
