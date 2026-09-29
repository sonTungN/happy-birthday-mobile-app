import { motion } from "motion/react";
import { content } from "../content";
import { photoUrl } from "../lib/assets";
import { hapticRef } from "../lib/haptics";
import { fill, pad } from "../lib/text";
import { Polaroid } from "./Polaroid";

interface ResumeProps {
  frame: number;
  onContinue: () => void;
  onRestart: () => void;
}

/** Shown when someone comes back to a roll they already started. The tap also unlocks sound on iOS. */
export function ResumeOverlay({ frame, onContinue, onRestart }: ResumeProps) {
  return (
    <motion.div
      className="film-bg absolute inset-0 z-80 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="flex w-[min(86%,340px)] flex-col items-center gap-3.5 text-center"
        initial={{ y: 30, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 160, damping: 18 }}
      >
        <Polaroid
          src={photoUrl(content.lockPhoto)}
          caption="welcome back"
          className="mb-2.5 w-[170px] -rotate-4"
        />
        <h2 className="font-display text-[26px] leading-[1.2] font-bold">
          {fill("Welcome back, {name}")}
        </h2>
        <p className="mb-2 font-body text-[19px] text-white/85 italic">
          Your roll is on frame {pad(frame)}. Pick up where you left off?
        </p>
        <button
          type="button"
          className="btn btn-dark"
          ref={hapticRef}
          onClick={onContinue}
        >
          Keep going
        </button>
        <button type="button" className="btn-ghost" onClick={onRestart}>
          Start over
        </button>
      </motion.div>
    </motion.div>
  );
}

function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 align-[-4px] text-ink"
      aria-label="Share"
    >
      <path
        d="M12 3v12M7.5 7.5 12 3l4.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 10H6.5A1.5 1.5 0 0 0 5 11.5v8A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-8a1.5 1.5 0 0 0-1.5-1.5H16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** How to add the site to the Home Screen so it opens like an app. */
export function InstallHint({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      className="absolute inset-0 z-80 flex items-center justify-center bg-[rgba(5,5,5,0.72)] backdrop-blur-[6px]"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="flex w-full flex-col gap-4 self-end border-t-[1.5px] border-ink bg-bone px-6 pt-[26px] pb-[calc(var(--safe-bottom)+26px)] text-ink"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 220, damping: 26 }}
      >
        <h3 className="font-display text-[22px] font-bold">
          Keep it on your Home Screen
        </h3>
        <ol className="m-0 grid gap-3 pl-[22px] font-body text-[18px] leading-[1.4]">
          <li>
            Tap the <ShareIcon /> <b>Share</b> button in Safari
          </li>
          <li>
            Scroll down and choose <b>Add to Home Screen</b>
          </li>
          <li>
            Tap <b>Add</b>. Now it opens like an app, any time.
          </li>
        </ol>
        <button type="button" className="btn btn-dark" onClick={onClose}>
          Got it
        </button>
      </motion.div>
    </motion.div>
  );
}

interface FullscreenAskProps {
  /** 'api': the browser can go full screen itself. 'homescreen': an iPhone, where the Home Screen is the way */
  way: "api" | "homescreen";
  onAccept: () => void;
  onDismiss: () => void;
}

/** Asked once, the first time the roll is opened in a browser: it's made for the whole screen. */
export function FullscreenAsk({
  way,
  onAccept,
  onDismiss,
}: FullscreenAskProps) {
  const homescreen = way === "homescreen";
  return (
    <motion.div
      className="absolute inset-0 z-80 flex items-end bg-[rgba(5,5,5,0.55)] backdrop-blur-[4px]"
      onClick={onDismiss}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="flex w-full flex-col items-center gap-3.5 border-t-[1.5px] border-ink bg-bone px-6 pt-[26px] pb-[calc(var(--safe-bottom)+22px)] text-center text-ink"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 220, damping: 26 }}
      >
        <h3 className="font-display text-[22px] font-bold">
          Made for the whole screen
        </h3>
        <p className="font-body text-[18px] leading-[1.4] text-[#3a3a3a] italic">
          {homescreen
            ? "From your Home Screen it opens like an app, with no browser bars."
            : "Full screen, with nothing else in the way."}
        </p>
        <button
          type="button"
          className="btn btn-dark mt-1 w-full"
          ref={hapticRef}
          onClick={onAccept}
        >
          {homescreen ? "Show me how" : "Full screen"}
        </button>
        <button
          type="button"
          className="btn-ghost text-[#3a3a3a]"
          onClick={onDismiss}
        >
          Not now
        </button>
      </motion.div>
    </motion.div>
  );
}
