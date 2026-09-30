import { AnimatePresence, motion } from "motion/react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { InstallHint } from "../components/Overlays";
import { Polaroid, Tape } from "../components/Polaroid";
import { StudioMark } from "../components/StudioMark";
import { content } from "../content";
import { photoUrl } from "../lib/assets";
import { audio } from "../lib/audio";
import { burst, originOf, stars } from "../lib/confetti";
import { useWindOn } from "../lib/advance";
import { hapticRef } from "../lib/haptics";
import { isStandalone, useAfter, useTimers } from "../lib/hooks";
import { fill } from "../lib/text";
import { drawFace, type TicketFace } from "../lib/tickets";
import { Invitation } from "./Invitation";
import { ScratchCard } from "./ScratchCard";

interface FinaleProps {
  /** The roll is finished (credits rolling): the frame counter reads 00 */
  onDone: () => void;
  onRestart: () => void;
}

type Phase = "tickets" | "credits" | "end";

/** Credits scroll speed (px per second) */
const CREDITS_SPEED = 64;
/** Held down, the credits run this many times faster */
const FAST_ROLL = 4;

/**
 * Chapter 6 (frame 01 → 00): pick two of four tickets, wind on to the closing credits, then the last photo of the roll.
 * One ticket hides the invitation to the real plan (content.event), and she always finds it (see drawFace).
 */
export default function Finale({ onDone, onRestart }: FinaleProps) {
  const { tickets, event } = content;
  const rootRef = useRef<HTMLDivElement>(null);
  const later = useTimers();
  const cards = tickets.list.length;
  const picks = Math.min(tickets.picks, cards);
  // What is behind each ticket: drawn when she starts scratching it, so every replay is a new draw
  const [faces, setFaces] = useState<(TicketFace | null)[]>(() =>
    tickets.list.map(() => null),
  );
  const facesRef = useRef(faces);
  const orderRef = useRef<number[]>([]);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [tapMode, setTapMode] = useState(false);
  const [phase, setPhase] = useState<Phase>(cards ? "tickets" : "credits");
  const [install, setInstall] = useState(false);
  const [invitation, setInvitation] = useState(false);
  const [invitationSeen, setInvitationSeen] = useState(false);
  const chosenCount = faces.filter(Boolean).length;
  const allPicked = revealed.length >= picks;
  const eventIndex = faces.findIndex((face) => face?.kind === "event");
  const eventRevealed = eventIndex >= 0 && revealed.includes(eventIndex);
  const helpTimer = useAfter(20000, phase);

  // The last wind of the roll starts the credits: the counter reads 00 from here on
  useEffect(() => {
    if (phase !== "tickets") onDone();
  }, [phase, onDone]);

  const openInvitation = () => {
    setInvitationSeen(true);
    setInvitation(true);
  };

  // Found on the first pick, the invitation waits (she can open it with "Tap for details").
  // Once both picks are done, it opens on its own, unless she has already read it.
  useEffect(() => {
    if (!allPicked || !eventRevealed || invitationSeen) return;
    const id = window.setTimeout(() => {
      setInvitationSeen(true);
      setInvitation(true);
    }, 1800);
    return () => window.clearTimeout(id);
  }, [allPicked, eventRevealed, invitationSeen]);

  // Both picks done (and the invitation seen): winding on rolls the credits
  useWindOn(
    phase === "tickets" && allPicked && (!eventRevealed || invitationSeen),
    () => setPhase("credits"),
  );

  const choose = (index: number) => {
    if (facesRef.current[index] || orderRef.current.length >= picks) return;
    const drawn = orderRef.current
      .map((i) => facesRef.current[i])
      .filter((face): face is TicketFace => face !== null);
    const face = drawFace({
      drawn,
      picks,
      cards,
      event,
      coupons: tickets.list,
    });
    facesRef.current = facesRef.current.map((f, i) => (i === index ? face : f));
    orderRef.current = [...orderRef.current, index];
    setFaces(facesRef.current);
  };

  const reveal = (index: number, card: HTMLElement | null) => {
    setRevealed((list) => (list.includes(index) ? list : [...list, index]));
    audio.sfx("ding");
    later(() => audio.sfx("stamp"), 320);
    if (card) burst(originOf(card, rootRef.current), 36);
    if (revealed.length + 1 >= picks) later(() => audio.sfx("stamp"), 900);
  };

  return (
    <div ref={rootRef} className="film-bg absolute inset-0 overflow-hidden">
      <AnimatePresence mode="wait">
        {phase === "tickets" && (
          <motion.div
            key="tickets"
            className="absolute inset-0 touch-pan-y overflow-y-auto overscroll-contain px-[18px] pt-[calc(var(--safe-top)+66px)] pb-[calc(var(--safe-bottom)+20px)] text-center [-webkit-overflow-scrolling:touch]"
            exit={{ opacity: 0, scale: 0.96 }}
          >
            <motion.h1
              className="font-display text-[28px] font-bold"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {fill(tickets.title)}
            </motion.h1>
            <p className="mt-1.5 font-body text-[19px] leading-[1.35] italic opacity-92">
              {fill(tickets.intro)}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-x-3.5 gap-y-4">
              {faces.map((face, i) => {
                const isChosen = face !== null;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 30, rotate: i % 2 ? 3 : -3 }}
                    animate={{ opacity: 1, y: 0, rotate: i % 2 ? 1.5 : -1.5 }}
                    transition={{ delay: 0.15 + i * 0.1 }}
                  >
                    <ScratchCard
                      face={face}
                      index={i}
                      revealed={revealed.includes(i)}
                      locked={!isChosen && chosenCount >= picks}
                      held={
                        allPicked && !isChosen ? fill(tickets.heldStamp) : null
                      }
                      tapToReveal={tapMode}
                      onChoose={() => choose(i)}
                      onReveal={(card) => reveal(i, card)}
                      onOpen={openInvitation}
                    />
                  </motion.div>
                );
              })}
            </div>
            <div className="mt-[22px] flex min-h-[60px] justify-center">
              {allPicked ? (
                <motion.div
                  className="flex flex-col items-center gap-3.5"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <p className="font-body text-[18px] leading-[1.35] italic opacity-92">
                    {fill(tickets.heldLine)}
                  </p>
                  {eventRevealed && invitationSeen && (
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={openInvitation}
                    >
                      Open the invitation again
                    </button>
                  )}
                </motion.div>
              ) : (
                helpTimer &&
                !tapMode && (
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setTapMode(true)}
                  >
                    Can’t scratch? Tap two tickets instead
                  </button>
                )
              )}
            </div>
          </motion.div>
        )}
        {phase === "credits" && (
          <Credits key="credits" onDone={() => setPhase("end")} />
        )}
        {phase === "end" && (
          <End
            key="end"
            onRestart={onRestart}
            onInstall={() => setInstall(true)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {invitation && event && phase === "tickets" && (
          <Invitation event={event} onClose={() => setInvitation(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {install && <InstallHint onClose={() => setInstall(false)} />}
      </AnimatePresence>
    </div>
  );
}

/** 'in Twenty-two' → 'in Twenty-Two' (film-title style after a hyphen) */
const titleCase = (text: string) =>
  text.replace(
    /-(\u2060?)(\p{Ll})/gu,
    (_, joiner: string, letter: string) => `-${joiner}${letter.toUpperCase()}`,
  );

/** Old-style closing credits rolling up the screen. */
function Credits({ onDone }: { onDone: () => void }) {
  const { finale, studio } = content;
  const boxRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [roll, setRoll] = useState<CSSProperties | null>(null);

  useLayoutEffect(() => {
    const box = boxRef.current?.clientHeight ?? 0;
    const list = listRef.current?.offsetHeight ?? 0;
    setRoll({
      "--from": `${box}px`,
      "--to": `${-list}px`,
      "--duration": `${(box + list) / CREDITS_SPEED}s`,
    } as CSSProperties);
    audio.sfx("wind");
  }, []);

  // Held down, the roll runs faster; let go and it settles back (the CSS animation, through its playback rate)
  const speed = (rate: number) => {
    for (const a of listRef.current?.getAnimations() ?? []) a.playbackRate = rate;
  };

  return (
    <motion.div
      ref={boxRef}
      className="absolute inset-0 touch-none overflow-hidden bg-[#070707] select-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.6 } }}
      onPointerDown={() => speed(FAST_ROLL)}
      onPointerUp={() => speed(1)}
      onPointerCancel={() => speed(1)}
      onPointerLeave={() => speed(1)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* The roll fades in at the bottom and out at the top, so no line collides with the controls or the "hold" label */}
      <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent_0,#000_15%,#000_86%,transparent_100%)]">
        {/* Starts below the screen and rolls up at CREDITS_SPEED (--from, --to and --duration are measured above) */}
        <div
          ref={listRef}
          className={`absolute top-0 right-0 left-0 flex flex-col items-center gap-[30px] px-7 text-center [transform:translateY(100vh)] ${roll ? "animate-[credits-roll_var(--duration)_linear_forwards]" : ""}`}
          style={roll ?? undefined}
          onAnimationEnd={onDone}
        >
          {/* The studio's ident opens the picture */}
          <div className="mb-[14px] flex flex-col items-center gap-3">
            <StudioMark className="h-[96px] w-[96px] text-bone" />
            <span className="font-ui text-[12px] font-bold tracking-[0.3em] text-silver uppercase">
              {studio.name} {studio.kind}
            </span>
            <span className="-mt-1.5 font-body text-[19px] text-silver italic">
              presents
            </span>
          </div>
          <p className="font-display text-[30px] leading-[1.15] font-bold">
            {fill("{fullName}")}
          </p>
          <p className="-mt-[22px] mb-[26px] font-script text-[34px] text-silver">
            {titleCase(fill("in {AgeWords}"))}
          </p>
          {finale.credits.map((credit, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <span className="font-ui text-[11px] font-bold tracking-[0.24em] text-silver uppercase">
                {fill(credit.role)}
              </span>
              <span className="font-body text-[23px] leading-[1.25]">
                {fill(credit.name)}
              </span>
            </div>
          ))}
          <p className="mt-[30px] max-w-[280px] font-body text-[17px] text-silver italic">
            {fill(finale.creditsNote)}
          </p>
          {/* The studio signs off */}
          <div className="mt-2 flex flex-col items-center gap-2.5 pb-5">
            <StudioMark className="h-[46px] w-[46px] text-silver" />
            {studio.handle && (
              <span className="font-ui text-[11px] tracking-[0.2em] text-silver">
                {studio.handle}
              </span>
            )}
          </div>
        </div>
      </div>
      <span className="absolute right-[18px] bottom-[calc(var(--safe-bottom)+16px)] font-ui text-[10px] font-bold tracking-[0.2em] text-white/45 uppercase">
        Hold to speed up
      </span>
    </motion.div>
  );
}

function End({
  onRestart,
  onInstall,
}: {
  onRestart: () => void;
  onInstall: () => void;
}) {
  const { finale } = content;
  const later = useTimers();

  useEffect(() => {
    audio.sfx("wind");
    later(() => stars({ x: 0.5, y: 0.4 }, 20), 1100);
  }, [later]);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center px-6 pt-[calc(var(--safe-top)+60px)] pb-[calc(var(--safe-bottom)+20px)] text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="mb-[18px] w-[min(56%,240px)] short:mb-3 short:w-[min(46%,190px)]"
        initial={{ y: -520, rotate: -24 }}
        animate={{ y: 0, rotate: -4 }}
        transition={{ type: "spring", stiffness: 70, damping: 11, delay: 0.3 }}
      >
        <Polaroid
          src={photoUrl(finale.photo)}
          caption={fill(finale.caption)}
          extras={<Tape />}
        />
      </motion.div>

      <motion.h1
        className="font-script text-[76px] leading-none font-normal short:text-[60px]"
        initial={{ opacity: 0, scale: 1.15 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.1, duration: 1.2 }}
      >
        {fill(finale.title)}
      </motion.h1>
      <motion.span
        className="mt-2 mb-3 block h-[5px] w-[120px] border-y border-white/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        aria-hidden
      />
      <motion.p
        className="max-w-[320px] font-body text-[21px] leading-[1.35] italic short:text-[19px]"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6 }}
      >
        {fill(finale.line)}
      </motion.p>
      <motion.p
        className="mt-3.5 font-ui text-[12px] font-bold tracking-[0.2em] text-silver uppercase"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.1 }}
      >
        {fill("{days} days on Earth, and counting")}
      </motion.p>
      <motion.p
        className="mt-1 font-script text-[36px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.4 }}
      >
        {fill("— {sender}")}
      </motion.p>

      <motion.div
        className="mt-4 flex flex-col items-center gap-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.8 }}
      >
        <button
          type="button"
          className="btn btn-light"
          ref={hapticRef}
          onClick={onRestart}
        >
          Watch it again
        </button>
        {!isStandalone() && (
          <button type="button" className="btn-ghost" onClick={onInstall}>
            Keep it on your Home Screen
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}
