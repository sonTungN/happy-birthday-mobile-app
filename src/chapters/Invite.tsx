import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { Polaroid, Tape } from "../components/Polaroid";
import { Seal } from "../components/Seal";
import { content } from "../content";
import { photoUrl } from "../lib/assets";
import { audio } from "../lib/audio";
import { burst, originOf } from "../lib/confetti";
import { hapticRef } from "../lib/haptics";
import { useTimers } from "../lib/hooks";
import { fill } from "../lib/text";
import type { ChapterProps } from "../types";

// Positions inside the photo cluster box (see .cluster in the CSS)
const PHOTO_LAYOUT = [
  { left: "1%", top: "9%", rotate: -8 },
  { left: "30%", top: "24%", rotate: 3 },
  { left: "59%", top: "5%", rotate: 9 },
];

/**
 * Every denied appeal makes Accept a little bigger: it takes more of the row and the row stands taller,
 * and Appeal is pinched (it gives up side padding, so its label always fits) until it folds away for
 * good. It is all layout: a scale would push the button out of the card.
 */
const GROW = 0.25;
const RISE = 3;
const PINCH = 3;
/** Where the buttons start from: the min-height and side padding of .btn (global.css), in px */
const BTN = { height: 50, pad: 24 };
const SQUEEZE = { type: "spring", stiffness: 300, damping: 24 } as const;

/** Chapter 1: an official notice asking her to accept turning a year older. Every appeal is denied. */
export default function Invite({ onDone }: ChapterProps) {
  const { invite } = content;
  const rootRef = useRef<HTMLDivElement>(null);
  const acceptRef = useRef<HTMLButtonElement | null>(null);
  const later = useTimers();
  const [appeals, setAppeals] = useState(0);
  const [accepted, setAccepted] = useState(false);

  const photos = (invite.photos ?? content.photos.map((p) => p.file)).slice(
    0,
    3,
  );
  const appealGone = appeals >= invite.rulings.length;
  const ruling =
    appeals > 0
      ? fill(invite.rulings[Math.min(appeals, invite.rulings.length) - 1])
      : null;

  const appeal = () => {
    if (accepted || appealGone) return;
    setAppeals((a) => a + 1);
    audio.playMusic();
    audio.sfx("stamp");
  };

  const accept = () => {
    if (accepted) return;
    setAccepted(true);
    audio.playMusic();
    later(() => audio.sfx("stamp"), 120);
    later(() => burst(originOf(acceptRef.current, rootRef.current), 70), 200);
    later(onDone, 1700);
  };

  return (
    <div
      ref={rootRef}
      className="film-bg absolute inset-0 flex flex-col items-center overflow-hidden px-5 pt-[calc(var(--safe-top)+70px)] pb-[calc(var(--safe-bottom)+18px)] text-center"
    >
      {/* A silent-film title card: black, double white rule, a star at each corner (effects.css: .invite-card) */}
      <motion.div
        className="invite-card relative w-full max-w-[350px] border-[1.5px] border-white/85 bg-[rgba(8,8,8,0.72)] px-[22px] pt-[22px] pb-5"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
      >
        <p className="font-script text-[clamp(22px,7.6vw,30px)] leading-[1.1] whitespace-nowrap text-silver">
          {fill(invite.eyebrow)}
        </p>
        <h1 className="mt-2 font-display text-[clamp(23px,6.8vw,28px)] leading-[1.22] font-bold text-balance">
          {fill(invite.question)}
        </h1>
        <span
          className="mx-auto mt-3.5 block h-px w-[70px] bg-white/50"
          aria-hidden
        />
        {/* "L.S.", locus sigilli: where the seal goes. Accepting stamps it (and the seal covers the spot) */}
        <span
          className={`mx-auto mt-3 grid h-12 w-12 place-items-center rounded-[50%] border border-dashed border-white/32 pt-0.5 font-body text-[13px] text-white/38 italic transition-opacity delay-200 duration-100 ${accepted ? "opacity-0" : ""}`}
          aria-hidden
        >
          L.S.
        </span>
        {accepted && (
          <Seal
            className="absolute bottom-2 left-1/2 -ml-[35px] h-[70px] w-[70px] text-paper/94"
            word={invite.approved}
            ring={fill(invite.sealRing)}
            delay={0.1}
          />
        )}
      </motion.div>

      {/* The two buttons share the width of the notice above them; when Appeal goes, it folds away and Accept widens with it */}
      <motion.div
        className="mt-[22px] flex w-full max-w-[350px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <motion.button
          ref={(el) => {
            acceptRef.current = el;
            hapticRef(el);
          }}
          type="button"
          className="btn btn-light relative z-6 flex-1"
          animate={{
            flexGrow: 1 + appeals * GROW,
            minHeight: `${BTN.height + appeals * RISE}px`,
          }}
          transition={SQUEEZE}
          onClick={accept}
        >
          {invite.accept}
        </motion.button>
        <AnimatePresence>
          {!appealGone && !accepted && (
            <motion.button
              type="button"
              ref={hapticRef}
              className="btn btn-outline ml-3 min-w-0 flex-1 overflow-hidden"
              animate={{
                paddingLeft: `${BTN.pad - appeals * PINCH}px`,
                paddingRight: `${BTN.pad - appeals * PINCH}px`,
              }}
              transition={SQUEEZE}
              exit={{
                opacity: 0,
                flexGrow: 0,
                width: 0,
                marginLeft: 0,
                paddingLeft: 0,
                paddingRight: 0,
                borderWidth: 0,
                transition: { duration: 0.45, ease: [0.4, 0, 0.2, 1] },
              }}
              onClick={appeal}
            >
              {invite.appeal}
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Fixed-shape box, centered in the space left under the buttons */}
      <div className="relative my-auto aspect-[1/0.84] w-full max-w-[420px] flex-none">
        {photos.map((file, i) => {
          const entry = content.photos.find((p) => p.file === file);
          const layout = PHOTO_LAYOUT[i];
          return (
            <motion.div
              key={`${file}-${i}`}
              className="absolute w-[40%]"
              style={{
                left: layout.left,
                top: layout.top,
                zIndex: i === 1 ? 2 : 1,
              }}
              initial={{ y: 90, opacity: 0, rotate: layout.rotate - 12 }}
              animate={{ y: 0, opacity: 1, rotate: layout.rotate }}
              transition={{
                delay: 0.3 + i * 0.12,
                type: "spring",
                stiffness: 130,
                damping: 15,
              }}
            >
              <div
                className="animate-[invite-float_5s_ease-in-out_infinite]"
                style={{ animationDelay: `${i * -1.4}s` }}
              >
                <Polaroid
                  src={photoUrl(file)}
                  alt={entry?.title}
                  caption={entry?.title}
                  date={entry?.date}
                  focus={entry?.focus}
                  extras={
                    i === 2 ? (
                      <Tape color="smoke" style={{ rotate: "3deg" }} />
                    ) : undefined
                  }
                />
              </div>
            </motion.div>
          );
        })}

        <AnimatePresence>
          {ruling && !accepted && (
            <motion.div
              key={appeals}
              // A slip from the court, slapped on top of the photos (effects.css: .invite-ruling)
              className="invite-ruling absolute top-[22%] right-[7%] left-[7%] z-5 rounded-xs px-[18px] pt-3.5 pb-[18px] text-left text-ink"
              initial={{ y: -40, opacity: 0, rotate: appeals % 2 ? -3 : 2.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0, y: 24, transition: { duration: 0.25 } }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
            >
              <span className="flex justify-between gap-2.5 border-b border-ink/30 pb-2 font-ui text-[10px] font-bold tracking-[0.16em] text-smoke uppercase">
                <span>Court of Birthdays</span>
                <span>Ruling No. {appeals}</span>
              </span>
              <p className="mt-2.5 pr-[20%] font-body text-[18px] leading-[1.3] text-pretty italic">
                {ruling}
              </p>
              <motion.span
                className="absolute right-3 bottom-3 -rotate-12 rounded-[3px] border-[2.5px] border-ink/82 px-2.5 pt-[5px] pb-0.5 font-ui text-[15px] font-bold tracking-[0.18em] text-ink/82 mix-blend-multiply"
                initial={{ scale: 2.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 600,
                  damping: 22,
                  delay: 0.12,
                }}
              >
                {invite.denied}
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
