import { motion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { audio } from "../lib/audio";
import { useLatest, useTimers } from "../lib/hooks";
import {
  circlePath,
  markerPath,
  parseMarks,
  seedOf,
  underlinePath,
  type MarkKind,
} from "../lib/marks";

interface Stroke {
  kind: MarkKind;
  /** The line of text it goes over, in px from the top left of the text block */
  x: number;
  y: number;
  w: number;
  h: number;
  seed: number;
  /** Seconds after the marking starts */
  at: number;
  duration: number;
}

/** How fast the highlighter travels (px per second), and the pause while it moves to the next line */
const MARKER_SPEED = 900;
const LINE_GAP = 0.07;

interface MarkedProps {
  /** Text with ==marker==, ((circle)), __underline__ and **bold** mark-up, placeholders already filled */
  text: string;
  as?: "h2" | "h3" | "p";
  className?: string;
  /** Draws the marks, once. They stay drawn afterwards */
  play: boolean;
  /** Seconds to wait after `play` */
  delay?: number;
  /** Every mark is drawn (right away if there are none) */
  onDone?: () => void;
}

/**
 * Printed text with an editor's marks drawn over it by hand once `play` turns true: a yellow highlighter
 * swept along each marked line in turn, or a red pen loop around a phrase. The marks are measured from the
 * laid-out text, so they follow the line breaks on any screen (and move with them after a resize).
 */
export function Marked({
  text,
  as: Tag = "p",
  className,
  play,
  delay = 0,
  onDone,
}: MarkedProps) {
  const parts = parseMarks(text);
  const boxRef = useRef<HTMLElement | null>(null);
  const markRefs = useRef<(HTMLElement | null)[]>([]);
  const started = useRef(false);
  const [strokes, setStrokes] = useState<Stroke[] | null>(null);
  /** The first drawing is running. Strokes that turn up later (a resize) are simply there */
  const [drawing, setDrawing] = useState(true);
  const onDoneRef = useLatest(onDone);
  const later = useTimers();

  useEffect(() => {
    const box = boxRef.current;
    if (!play || !box) return;
    const marked = parseMarks(text);
    const measure = () => {
      const b = box.getBoundingClientRect();
      // Still flying in (scaled or turned): the rects would be wrong
      if (Math.abs(b.width - box.offsetWidth) > 1) return;
      const next: Stroke[] = [];
      let at = 0;
      marked.forEach((part, i) => {
        const el = markRefs.current[i];
        // Bold is just set that way; nothing to draw
        if (!part.mark || part.mark === "bold" || !el) return;
        for (const r of el.getClientRects()) {
          if (r.width < 2) continue;
          const duration =
            part.mark === "marker"
              ? 0.14 + r.width / MARKER_SPEED
              : part.mark === "underline"
                ? 0.1 + r.width / (MARKER_SPEED * 1.3)
                : 0.65;
          next.push({
            kind: part.mark,
            x: r.left - b.left,
            y: r.top - b.top,
            w: r.width,
            h: r.height,
            seed: seedOf(part.text) + next.length * 7919,
            at,
            duration,
          });
          at += duration + LINE_GAP;
        }
      });
      setStrokes(next);
      if (started.current) return;
      started.current = true;
      next.forEach((s) =>
        later(
          () => audio.sfx(s.kind === "marker" ? "marker" : "pen"),
          (delay + s.at) * 1000,
        ),
      );
      later(
        () => {
          setDrawing(false);
          onDoneRef.current?.();
        },
        (delay + at) * 1000 + 60,
      );
    };
    // Fires once right away, then on every resize; web fonts arriving can move the line breaks too
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    document.fonts.addEventListener("loadingdone", measure);
    return () => {
      ro.disconnect();
      document.fonts.removeEventListener("loadingdone", measure);
    };
  }, [play, text, delay, later, onDoneRef]);

  return (
    <Tag
      ref={(el: HTMLElement | null) => {
        boxRef.current = el;
      }}
      // Its own layer, so the highlighter can sit under the ink but over the paper. A "\n" in the text starts a new
      // line: the way to keep a circled phrase (which never breaks) at the start of a line
      className={`relative isolate whitespace-pre-line ${className ?? ""}`}
    >
      {/* The marks come before the text on purpose: after it, WebKit takes this out-of-flow layer for an
          empty last line and justifies the real last line right across the column */}
      {strokes && (
        <span className="pointer-events-none absolute inset-0" aria-hidden>
          {strokes.map((s, i) =>
            s.kind === "marker" ? (
              <MarkerStroke
                key={i}
                stroke={s}
                delay={delay}
                animate={drawing}
              />
            ) : s.kind === "underline" ? (
              <PenUnderline
                key={i}
                stroke={s}
                delay={delay}
                animate={drawing}
              />
            ) : (
              <PenLoop key={i} stroke={s} delay={delay} animate={drawing} />
            ),
          )}
        </span>
      )}
      {parts.map((part, i) =>
        part.mark ? (
          <mark
            key={i}
            ref={(el) => {
              markRefs.current[i] = el;
            }}
            // A pen loop goes round the whole phrase in one go, so a circled phrase stays on one line
            className={`bg-transparent p-0 text-inherit [font:inherit] ${part.mark === "circle" ? "whitespace-nowrap" : ""}`}
            style={part.mark === "bold" ? { fontWeight: 800 } : undefined}
          >
            {part.text}
          </mark>
        ) : (
          part.text
        ),
      )}
    </Tag>
  );
}

interface StrokeProps {
  stroke: Stroke;
  delay: number;
  /** Draw it in, or just show it */
  animate: boolean;
}

/**
 * One sweep of the highlighter over one line, the full height of the letters: from just above the tallest ones
 * to a little under the baseline (descender tails poke out, as with a real pen). Newsreader's line box is exactly
 * 1em: the ascenders reach 3% below its top, the capitals 7%, and the baseline sits at 73.5%.
 */
function MarkerStroke({ stroke, delay, animate }: StrokeProps) {
  const id = useId().replace(/[^\w-]/g, "");
  const h = stroke.h * 0.95;
  // Room for the rounded start and the slanted end, so they don't cut into the first and last letters
  const pad = Math.min(16, h * 0.26);
  const w = stroke.w + pad * 2;
  // A hand never draws quite level
  const tilt = ((stroke.seed % 97) / 97 - 0.5) * 1.1;
  return (
    <motion.svg
      className="absolute -z-1 origin-[0_50%] overflow-visible text-marker"
      style={{
        left: stroke.x - pad,
        top: stroke.y - stroke.h * 0.07,
        width: w,
        height: h,
        rotate: tilt,
      }}
      viewBox={`0 0 ${w} ${h}`}
      initial={animate ? { clipPath: "inset(0 100% 0 0)" } : false}
      animate={{ clipPath: "inset(0 0% 0 0)" }}
      transition={{
        delay: delay + stroke.at,
        duration: stroke.duration,
        ease: [0.42, 0.05, 0.36, 1],
      }}
    >
      <defs>
        {/* Wetter where the felt tip lands and lifts */}
        <linearGradient id={`ink-${id}`}>
          <stop offset="0" stopColor="currentColor" stopOpacity="1" />
          <stop offset="0.07" stopColor="currentColor" stopOpacity="0.84" />
          <stop offset="0.9" stopColor="currentColor" stopOpacity="0.8" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.94" />
        </linearGradient>
        {/* The streaks a felt tip leaves along the stroke */}
        <pattern
          id={`streak-${id}`}
          width="9"
          height="3.3"
          patternUnits="userSpaceOnUse"
        >
          <rect y="1.2" width="9" height="0.7" fill="#fff" opacity="0.2" />
        </pattern>
      </defs>
      <path d={markerPath(w, h, stroke.seed)} fill={`url(#ink-${id})`} />
      <path d={markerPath(w, h, stroke.seed)} fill={`url(#streak-${id})`} />
    </motion.svg>
  );
}

/** A red pen underline along one line of the phrase */
function PenUnderline({ stroke, delay, animate }: StrokeProps) {
  const pad = 3;
  const w = stroke.w + pad * 2;
  const h = stroke.h;
  return (
    <svg
      className="absolute z-1 overflow-visible stroke-pen"
      style={{ left: stroke.x - pad, top: stroke.y, width: w, height: h }}
      viewBox={`0 0 ${w} ${h}`}
      fill="none"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <motion.path
        d={underlinePath(w, h, stroke.seed)}
        initial={animate ? { pathLength: 0, opacity: 0 } : false}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{
          delay: delay + stroke.at,
          duration: stroke.duration,
          ease: [0.4, 0, 0.3, 1],
          opacity: { delay: delay + stroke.at, duration: 0.01 },
        }}
      />
    </svg>
  );
}

/** A red pen loop around one line of the phrase */
function PenLoop({ stroke, delay, animate }: StrokeProps) {
  const padX = 8;
  const padY = 5;
  const w = stroke.w + padX * 2;
  const h = stroke.h + padY * 2;
  return (
    <svg
      className="absolute z-1 overflow-visible stroke-pen"
      style={{
        left: stroke.x - padX,
        top: stroke.y - padY,
        width: w,
        height: h,
      }}
      viewBox={`0 0 ${w} ${h}`}
      fill="none"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <motion.path
        d={circlePath(w, h, stroke.seed)}
        initial={animate ? { pathLength: 0, opacity: 0 } : false}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{
          delay: delay + stroke.at,
          duration: stroke.duration,
          ease: [0.4, 0, 0.3, 1],
          opacity: { delay: delay + stroke.at, duration: 0.01 },
        }}
      />
    </svg>
  );
}
