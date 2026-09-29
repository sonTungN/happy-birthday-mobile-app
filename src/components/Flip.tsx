import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  type Transition,
} from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { useLatest } from "../lib/hooks";

interface FlipProps {
  /** false: the first side faces the viewer; true: the second */
  turned: boolean;
  first: ReactNode;
  second: ReactNode;
  transition?: Transition;
  /** The element to use: 'span' inside a button, 'div' elsewhere */
  as?: "span" | "div";
  className?: string;
}

/**
 * A card turning over on its vertical axis (put `perspective` on a parent). Only the side facing the viewer is
 * drawn: past 90° the other side takes over, already turned 180° itself, so nothing relies on
 * backface-visibility, which iOS Safari gets wrong when a side has transformed children of its own.
 * The first side stays in the flow (hidden while it's turned away) and gives the card its size.
 */
export function Flip({
  turned,
  first,
  second,
  transition,
  as = "div",
  className = "",
}: FlipProps) {
  const angle = useMotionValue(turned ? 180 : 0);
  const [showSecond, setShowSecond] = useState(turned);
  const transitionRef = useLatest(transition);
  useMotionValueEvent(angle, "change", (a) => setShowSecond(a >= 90));

  useEffect(() => {
    const controls = animate(angle, turned ? 180 : 0, transitionRef.current);
    return () => controls.stop();
  }, [angle, turned, transitionRef]);

  const Tag = as === "span" ? motion.span : motion.div;
  const Face = as;
  return (
    <Tag
      className={`block transform-3d ${className}`}
      style={{ rotateY: angle }}
    >
      <Face
        className={`relative block h-full w-full ${showSecond ? "invisible" : ""}`}
      >
        {first}
      </Face>
      {showSecond && (
        <Face className="absolute inset-0 block [transform:rotateY(180deg)]">
          {second}
        </Face>
      )}
    </Tag>
  );
}
