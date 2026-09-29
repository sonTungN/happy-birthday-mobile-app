import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { content } from "../content";
import { photoUrl } from "../lib/assets";
import { audio } from "../lib/audio";
import { hapticRef } from "../lib/haptics";
import { params, useNow, useTimers } from "../lib/hooks";
import { storage } from "../lib/storage";
import {
  formatClock,
  formatLockDate,
  formatUnlock,
  pad,
  splitCountdown,
} from "../lib/text";
import type { ChapterProps } from "../types";

const KEYS: [string, string][] = [
  ["1", ""],
  ["2", "ABC"],
  ["3", "DEF"],
  ["4", "GHI"],
  ["5", "JKL"],
  ["6", "MNO"],
  ["7", "PQRS"],
  ["8", "TUV"],
  ["9", "WXYZ"],
];

const twelveHour = (() => {
  try {
    return (
      new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions()
        .hour12 === true
    );
  } catch {
    return false;
  }
})();

const unlockAt = (() => {
  // `npm run dev` skips the countdown (add ?countdown to see it); the real site always respects it,
  // except on a device that has entered the preview code (below) and in test builds (VITE_SKIP_COUNTDOWN=1)
  if (
    !content.unlockAt ||
    import.meta.env.VITE_SKIP_COUNTDOWN === "1" ||
    (import.meta.env.DEV && !params.has("countdown"))
  )
    return null;
  const date = new Date(content.unlockAt);
  return Number.isNaN(date.getTime()) ? null : date;
})();

/** Chapter 0: an iPhone-style lock screen. The passcode is her birthday. */
export default function Lock({ onDone }: ChapterProps) {
  const now = useNow(1000);
  const later = useTimers();
  const [code, setCode] = useState("");
  const [shakes, setShakes] = useState(0);
  const [fails, setFails] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  /** This device may go past the countdown (for testing before the day): ?nocountdown once, or the preview code */
  const [preview, setPreview] = useState(
    () => storage.get("preview") === "1" || params.has("nocountdown"),
  );
  /** The preview code is being asked for */
  const [asking, setAsking] = useState(false);
  const knocks = useRef<number[]>([]);
  const waiting =
    unlockAt !== null && !preview && now.getTime() < unlockAt.getTime();
  const length = (asking ? content.previewCode : content.passcode).length;

  // Five quick taps on the lock while it's counting down: the keypad asks for the preview code
  const knock = () => {
    if (!waiting || asking) return;
    const t = performance.now();
    knocks.current = [...knocks.current.filter((k) => t - k < 2500), t];
    if (knocks.current.length < 5) return;
    knocks.current = [];
    setCode("");
    setAsking(true);
  };

  const press = (digit: string) => {
    if (open || code.length >= length) return;
    audio.sfx("tap");
    const next = code + digit;
    setCode(next);
    if (next.length < length) return;
    if (asking) {
      if (next === content.previewCode) {
        storage.set("preview", "1");
        setPreview(true);
        setAsking(false);
        setCode("");
        audio.sfx("unlock");
      } else {
        audio.sfx("error");
        setShakes((s) => s + 1);
        later(() => setCode(""), 420);
      }
      return;
    }
    if (next === content.passcode) {
      setOpen(true);
      storage.set("unlocked", "1");
      later(() => audio.sfx("unlock"), 120);
      later(onDone, 950);
    } else {
      audio.sfx("error");
      setShakes((s) => s + 1);
      setFails(fails + 1);
      const special = content.passcodeReplies[next] ?? null;
      setReply(special);
      if (special || fails + 1 >= 2) setShowHint(true);
      later(() => setCode(""), 420);
    }
  };

  const erase = () => {
    if (!open) setCode((c) => c.slice(0, -1));
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center overflow-hidden bg-charcoal text-white">
      {/* The wallpaper: her photo, blurred and grey */}
      <div
        className="absolute -inset-10 bg-cover bg-center [filter:grayscale(1)_blur(22px)_brightness(0.85)] [transform:scale(1.08)]"
        style={{ backgroundImage: `url("${photoUrl(content.lockPhoto)}")` }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,8,8,0.35)_0%,rgba(8,8,8,0.2)_40%,rgba(8,8,8,0.65)_100%)]" />

      <div className="relative mt-[calc(var(--safe-top)+64px)] flex flex-col items-center short:mt-[calc(var(--safe-top)+50px)]">
        {/* The lock. Five quick taps on it during the countdown ask for the preview code (see `knock`) */}
        <button
          type="button"
          className="mb-2.5 border-0 bg-transparent p-1 text-white"
          tabIndex={-1}
          aria-hidden
          onClick={knock}
        >
          <svg
            className="h-6 w-5 overflow-visible"
            viewBox="0 0 24 28"
            aria-hidden
          >
            <motion.path
              d="M7 13V9a5 5 0 0 1 10 0v4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              initial={false}
              animate={open ? { y: -4, x: 4 } : { y: 0, x: 0 }}
            />
            <rect
              x="4"
              y="12"
              width="16"
              height="13"
              rx="3"
              fill="currentColor"
            />
          </svg>
        </button>
        <p className="font-body text-[20px] italic opacity-92">
          {formatLockDate(now)}
        </p>
        <p className="mt-1.5 font-ui text-[clamp(66px,22vw,92px)] leading-none font-bold tabular-nums [text-shadow:0_2px_20px_rgba(0,0,0,0.3)] short:text-[64px]">
          {formatClock(now, twelveHour)}
        </p>
      </div>

      {waiting && unlockAt && !asking ? (
        <Countdown ms={unlockAt.getTime() - now.getTime()} until={unlockAt} />
      ) : (
        <div className="relative mt-auto mb-[calc(var(--safe-bottom)+26px)] flex w-full flex-col items-center gap-[18px] short:gap-3.5">
          <AnimatePresence mode="wait">
            {showHint && !asking && (
              <motion.p
                key={reply ?? "hint"}
                className="absolute right-6 bottom-[calc(100%+14px)] left-6 rounded-[3px] bg-bone px-4 py-3 text-center font-body text-[18px] text-ink italic shadow-[4px_4px_0_rgba(0,0,0,0.5)]"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
              >
                {reply ?? content.passcodeHint}
              </motion.p>
            )}
          </AnimatePresence>
          <p className={PROMPT}>
            {asking ? "Preview code" : open ? "Unlocked" : "Enter Passcode"}
          </p>
          <motion.div
            key={shakes}
            className="flex h-3.5 gap-[22px]"
            animate={shakes ? { x: [0, -16, 13, -9, 6, -3, 0] } : undefined}
            transition={{ duration: 0.45 }}
          >
            {Array.from({ length }, (_, i) => (
              <span
                key={i}
                className={`h-[13px] w-[13px] rounded-[50%] border-[1.5px] border-white transition-[background] duration-120 ${i < code.length ? "bg-white" : ""}`}
              />
            ))}
          </motion.div>
          <div className="mt-1.5 grid grid-cols-[repeat(3,78px)] justify-center gap-x-[26px] gap-y-4 short:grid-cols-[repeat(3,68px)] short:gap-x-6 short:gap-y-3">
            {KEYS.map(([digit, letters]) => (
              <Key
                key={digit}
                digit={digit}
                letters={letters}
                onPress={press}
              />
            ))}
            {asking ? (
              <button
                type="button"
                className={TEXT_KEY}
                onClick={() => {
                  setAsking(false);
                  setCode("");
                }}
              >
                Cancel
              </button>
            ) : (
              <button
                type="button"
                className={TEXT_KEY}
                onClick={() => {
                  setReply(null);
                  setShowHint((v) => !v || reply !== null);
                }}
              >
                Hint
              </button>
            )}
            <Key digit="0" letters="" onPress={press} />
            <button
              type="button"
              className={TEXT_KEY}
              onClick={erase}
              disabled={!code}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const PROMPT = "font-ui text-[15px] font-semibold tracking-[0.16em] uppercase";
const TEXT_KEY =
  "border-0 bg-transparent font-body text-[18px] text-white italic disabled:opacity-35";

/** A round, frosted iPhone passcode key */
function Key({
  digit,
  letters,
  onPress,
}: {
  digit: string;
  letters: string;
  onPress: (digit: string) => void;
}) {
  return (
    <button
      type="button"
      className="relative flex h-[78px] w-[78px] flex-col items-center justify-center rounded-[50%] border border-white/22 bg-[rgba(255,255,255,0.12)] p-0 text-white backdrop-blur-[14px] transition-[background] duration-150 active:bg-[rgba(255,255,255,0.42)] short:h-[68px] short:w-[68px]"
      ref={hapticRef}
      onClick={() => onPress(digit)}
      aria-label={digit}
    >
      <span className="pt-1 font-ui text-[32px] leading-none font-normal short:text-[28px]">
        {digit}
      </span>
      {letters && (
        <span className="mt-0.5 font-ui text-[10px] font-bold tracking-[0.18em]">
          {letters}
        </span>
      )}
    </button>
  );
}

function Countdown({ ms, until }: { ms: number; until: Date }) {
  const { days, hours, minutes, seconds } = splitCountdown(ms);
  const units: [number, string][] = [
    [days, "days"],
    [hours, "hrs"],
    [minutes, "min"],
    [seconds, "sec"],
  ];
  return (
    <div className="relative mt-auto mb-[calc(var(--safe-bottom)+26px)] flex w-full flex-col items-center gap-[18px]">
      <p className={PROMPT}>Not yet…</p>
      <div className="flex gap-2.5">
        {units.map(([value, label]) => (
          <div
            key={label}
            className="flex w-[70px] flex-col items-center rounded-sm border border-white/25 bg-[rgba(255,255,255,0.1)] pt-3 pb-2.5 backdrop-blur-[14px]"
          >
            <span className="font-ui text-[30px] font-bold tabular-nums">
              {pad(value)}
            </span>
            <span className="font-ui text-[11px] font-semibold tracking-[0.14em] uppercase opacity-80">
              {label}
            </span>
          </div>
        ))}
      </div>
      <p className="max-w-[300px] text-center font-body text-[19px] italic">
        Come back on {formatUnlock(until)}.
      </p>
    </div>
  );
}
