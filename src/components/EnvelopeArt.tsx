import { motion } from "motion/react";
import { hapticRef } from "../lib/haptics";

interface EnvelopeProps {
  initials: string;
  /** Flap open and the letter peeking out */
  open?: boolean;
  /** The wax seal is peeled off in one piece (paper, not a crack) */
  lifted?: boolean;
  /** Makes the seal tappable */
  onSeal?: () => void;
  className?: string;
}

/**
 * A letter envelope with a wax seal. Its width comes from the parent; its height follows the aspect ratio.
 * The paper and the wax are drawn in effects.css (.envelope-*).
 */
export function EnvelopeArt({
  initials,
  open = false,
  lifted = false,
  onSeal,
  className = "",
}: EnvelopeProps) {
  const interactive = Boolean(onSeal) && !lifted;
  return (
    <div className={`relative aspect-[1.6] perspective-[900px] ${className}`}>
      <div className="envelope-back absolute inset-0 rounded-md" />
      <motion.div
        className="envelope-letter absolute top-[7%] right-[7%] left-[7%] z-2 h-[86%] rounded-xs"
        initial={false}
        animate={{ y: open ? "-48%" : "0%" }}
        transition={{
          delay: open ? 0.75 : 0,
          type: "spring",
          stiffness: 90,
          damping: 14,
        }}
      />
      <svg
        className="absolute inset-0 z-3 h-full w-full rounded-md drop-shadow-[0_-1px_0_rgba(0,0,0,0.12)]"
        viewBox="0 0 160 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path d="M0 0 L80 56 L0 100 Z" fill="#d9d3c6" />
        <path d="M160 0 L80 56 L160 100 Z" fill="#d3cdc0" />
        <path d="M0 100 L80 47 L160 100 Z" fill="#e4dfd3" />
      </svg>
      <motion.div
        className="absolute top-0 right-0 left-0 z-4 h-[62%] origin-top"
        initial={false}
        animate={{ rotateX: open ? 180 : 0, zIndex: open ? 1 : 4 }}
        transition={{
          rotateX: { duration: 0.7, ease: [0.4, 0, 0.2, 1] },
          zIndex: { delay: open ? 0.3 : 0, duration: 0 },
        }}
      >
        <svg
          className="block h-full w-full drop-shadow-[0_2px_2px_rgba(0,0,0,0.25)]"
          viewBox="0 0 160 62"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path d="M0 0 L160 0 L80 60 Z" fill="#cbc4b6" />
        </svg>
      </motion.div>
      {/* A button only when it can be tapped: inside the cake the whole envelope is already one */}
      {onSeal ? (
        <motion.button
          type="button"
          ref={interactive ? hapticRef : undefined}
          className={`${SEAL} ${interactive ? "envelope-pulse" : "cursor-default"}`}
          onClick={interactive ? onSeal : undefined}
          tabIndex={interactive ? 0 : -1}
          aria-label="Open the letter"
          {...peel(lifted)}
        >
          <Wax initials={initials} />
        </motion.button>
      ) : (
        <motion.span className={SEAL} aria-hidden {...peel(lifted)}>
          <Wax initials={initials} />
        </motion.span>
      )}
    </div>
  );
}

const SEAL =
  "@container absolute top-[60%] left-1/2 z-5 aspect-square w-[22%] -translate-1/2 rounded-[50%] border-0 bg-transparent p-0";

/** Black sealing wax with the initials pressed in */
function Wax({ initials }: { initials: string }) {
  return (
    <span className="envelope-wax absolute inset-0 grid place-items-center font-script text-[30cqw] whitespace-nowrap text-bone/85">
      {initials}
    </span>
  );
}

/** The seal peels off in one piece, up and away */
function peel(lifted: boolean) {
  return {
    initial: false,
    animate: lifted
      ? { y: -46, scale: 1.2, rotate: -16, opacity: 0 }
      : { y: 0, scale: 1, rotate: 0, opacity: 1 },
    transition: { duration: 0.7, ease: [0.3, 0.6, 0.4, 1] },
  } as const;
}
