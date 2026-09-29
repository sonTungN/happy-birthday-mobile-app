import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Marked } from "../components/Marked";
import { content } from "../content";
import { useWindOn } from "../lib/advance";
import { photoUrl } from "../lib/assets";
import { audio } from "../lib/audio";
import { useLatest, usePaperSurface, useSeen, useTimers } from "../lib/hooks";
import { fill, formatLongDate } from "../lib/text";
import type { NewsStory } from "../types";

/** The film leader covers the first moments of a chapter: the paper starts spinning once it has cleared */
const SPIN_DELAY = 0.75;
const SPIN_TIME = 1.3;
/** Once the blank sheet has landed, the ink comes up on it, one block after another from the top */
const INK_TIME = 0.6;
const INK_STAGGER = 0.12;

/**
 * Type on the sheet: blank while the paper spins in; once it has landed, the ink comes up, soft at first,
 * then sharp. `order` counts the blocks from the top of the page.
 */
function ink(landed: boolean, order: number) {
  return {
    initial: { opacity: 0, filter: "blur(3px)" },
    animate: landed
      ? { opacity: 1, filter: "blur(0px)", transitionEnd: { filter: "none" } }
      : undefined,
    transition: {
      delay: order * INK_STAGGER,
      duration: INK_TIME,
      ease: "easeOut" as const,
    },
  };
}

/**
 * Chapter 2: the front page of the day she was born. A blank sheet spins in like the headline montages of
 * old films and lands, and the ink comes up on it; then an editor goes over it by hand: a yellow highlighter
 * across the key words, her photo pasted on as a cut-out with a red arrow at it. She scrolls down the page,
 * and every story is marked the first time it comes into view (and stays marked after that).
 */
export default function Newspaper() {
  const { newspaper } = content;
  const [lead, ...rest] = newspaper.stories;
  // Two stories share a row; one on its own runs full width
  const pair = rest.length >= 2 ? rest.slice(0, 2) : [];
  const wide = rest.length >= 2 ? rest.slice(2) : rest;
  const endRef = useRef<HTMLDivElement>(null);
  const later = useTimers();
  const [landed, setLanded] = useState(false);
  const [leadDone, setLeadDone] = useState(!lead);
  const reachedEnd = useSeen(endRef, landed, 1);

  // The wind-on wheel lights up once she has read down to the foot of the page
  useWindOn(reachedEnd && leadDone);

  // While the page is up, the film-advance label is printed in dark ink
  usePaperSurface();

  useEffect(() => later(() => audio.sfx("whoosh"), SPIN_DELAY * 1000), [later]);

  return (
    <div className="film-bg absolute inset-0 overflow-hidden">
      {/* The sheet of newsprint (effects.css: .newsprint). While it spins in: no scrolling, no taps */}
      <motion.div
        className={`newsprint absolute inset-0 origin-[50%_42%] touch-pan-y overscroll-contain px-5 pt-[calc(var(--safe-top)+86px)] pb-[calc(var(--safe-bottom)+64px)] font-news text-news-ink shadow-[0_24px_70px_rgba(0,0,0,0.55)] [-webkit-overflow-scrolling:touch] ${landed ? "overflow-x-hidden overflow-y-auto" : "pointer-events-none overflow-hidden"}`}
        initial={{ scale: 0.04, rotate: -720, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{
          delay: SPIN_DELAY,
          duration: SPIN_TIME,
          ease: [0.14, 0.78, 0.3, 1],
          opacity: { delay: SPIN_DELAY, duration: 0.15 },
        }}
        onAnimationComplete={() => {
          if (landed) return;
          audio.sfx("paper");
          setLanded(true);
        }}
      >
        <header className="text-center">
          <motion.h1
            className="font-masthead text-[clamp(34px,11vw,46px)] leading-none font-normal whitespace-nowrap"
            {...ink(landed, 0)}
          >
            {fill(newspaper.masthead)}
          </motion.h1>
          {/* A hairline, the edition and the date, then a thick-and-thin rule (the thin one: effects.css .news-dateline) */}
          <motion.p
            className="news-dateline relative mt-3 mb-2 flex justify-between gap-2.5 border-t border-b-2 border-t-news-ink/60 border-b-news-ink px-px pt-[5px] pb-1 text-[10px] font-semibold tracking-[0.12em] whitespace-nowrap uppercase"
            {...ink(landed, 1)}
          >
            <span>{fill(newspaper.edition)}</span>
            <span>{formatLongDate(content.birthday)}</span>
          </motion.p>
        </header>

        {lead && (
          <LeadStory
            story={lead}
            landed={landed}
            onDone={() => setLeadDone(true)}
          />
        )}
        {/* The lead sits above the fold, like a real front page. The fold is in the paper, so it's there from the start */}
        <div className="news-fold relative h-0" aria-hidden />

        {/* Below the fold: printed last, in one go */}
        <motion.div {...ink(landed, 3)}>
          {pair.length > 0 && (
            // Two stories side by side, with a hairline between the columns
            <div className="grid grid-cols-[1fr_1fr] border-y border-news-ink/60">
              {pair.map((story, i) => (
                <Story
                  key={i}
                  story={story}
                  size="column"
                  enabled={leadDone}
                  order={i}
                  className={
                    i === 0
                      ? "border-r border-news-ink/26 pr-[13px]"
                      : "pl-[13px]"
                  }
                />
              ))}
            </div>
          )}

          {wide.map((story, i) => (
            <Story
              key={i}
              story={story}
              size="wide"
              enabled={leadDone}
              className="border-b border-news-ink/60"
            />
          ))}

          <Correction enabled={leadDone} />
        </motion.div>
        <div ref={endRef} className="mt-6 h-px" aria-hidden />
      </motion.div>
    </div>
  );
}

/** A small red label, like the date tag on a clipping */
const TAG =
  "inline-block bg-pen px-2 pt-1 pb-[3px] text-[12px] leading-[1.2] font-semibold tracking-[0.02em] text-[#f6f0e6]";

/** Headlines: the lead is big, the two side by side are small, the others in between */
const HEADLINE = {
  lead: "mt-3 text-[clamp(48px,16vw,66px)] leading-[0.98] font-[640] tracking-[-0.025em] text-balance",
  column:
    "mt-2.5 text-[clamp(21px,6.4vw,26px)] leading-[1.06] font-[640] tracking-[-0.018em] text-balance",
  wide: "mt-2.5 text-[clamp(30px,9.4vw,38px)] leading-[1.04] font-[640] tracking-[-0.018em] text-balance",
};

/** The line under each headline (the "dek") */
const DEK = {
  lead: "mt-3 text-[19px] leading-[1.42] font-normal text-pretty text-news-ink/86",
  column:
    "mt-2.5 text-[15px] leading-[1.4] font-normal text-pretty text-news-ink/86",
  wide: "mt-2.5 text-[17px] leading-[1.42] font-normal text-pretty text-news-ink/86",
};

/** The paragraphs of a story, after the dek (after the photo, for the lead) */
const BODY = {
  lead: "text-[16.5px] leading-[1.45] font-normal text-pretty text-news-ink/84",
  column:
    "mt-2 text-[14px] leading-[1.4] font-normal text-pretty text-news-ink/84",
  wide: "mt-2 text-[15.5px] leading-[1.42] font-normal text-pretty text-news-ink/84",
};

/**
 * The lead, once its ink is up: the editor marks the headline, then the standfirst, draws the arrow and
 * scribbles the note, and pastes her photo on last of all.
 */
function LeadStory({
  story,
  landed,
  onDone,
}: {
  story: NewsStory;
  landed: boolean;
  onDone: () => void;
}) {
  const [printed, setPrinted] = useState(false);
  const [step, setStep] = useState(0);
  const photo = story.photo ?? null;
  return (
    <article className="pt-5 pb-5">
      {/* Printed third, after the masthead and the date line. The photo is the editor's, so it isn't printed */}
      <motion.div
        {...ink(landed, 2)}
        onAnimationComplete={() => setPrinted(true)}
      >
        <span className={TAG}>{fill(story.tag)}</span>
        <Marked
          as="h2"
          className={HEADLINE.lead}
          text={fill(story.headline)}
          play={printed}
          delay={0.5}
          onDone={() => setStep(1)}
        />
        <Marked
          className={DEK.lead}
          text={fill(story.dek)}
          play={step >= 1}
          delay={0.1}
          onDone={() => {
            setStep(2);
            if (!photo) onDone();
          }}
        />
      </motion.div>
      {photo && (
        <Clipping
          file={photo}
          note={story.note}
          annotate={step >= 2}
          show={step >= 3}
          onArrow={() => setStep(3)}
          onDone={() => {
            setStep(4);
            onDone();
          }}
        />
      )}
      {/* The story itself, under the photo: printed with the rest of the page, marked once the photo is on */}
      {story.body && story.body.length > 0 && (
        <motion.div {...ink(landed, 3)}>
          {story.body.map((para, i) => (
            <Marked
              key={i}
              className={`${BODY.lead} ${i === 0 ? "news-dropcap mt-4" : "mt-2.5"}`}
              text={fill(para)}
              play={photo ? step >= 4 : step >= 2}
              delay={0.3 + i * 0.4}
            />
          ))}
        </motion.div>
      )}
    </article>
  );
}

interface ClippingProps {
  file: string;
  note?: string;
  /** Draw the arrow and write the note */
  annotate: boolean;
  /** Paste the photo onto the page */
  show: boolean;
  /** The arrow is drawn */
  onArrow: () => void;
  /** The photo is on */
  onDone: () => void;
}

/**
 * Her photo, pasted onto the page: a cut-out with a red outline when it's a .png with the background removed,
 * otherwise a press photo. A red pen arrow points at where she'll go, with a note scribbled at its tail;
 * the photo itself comes last.
 */
function Clipping({
  file,
  note,
  annotate,
  show,
  onArrow,
  onDone,
}: ClippingProps) {
  const cutout = /\.png$/i.test(file);
  const onArrowRef = useLatest(onArrow);
  const onDoneRef = useLatest(onDone);

  useEffect(() => {
    if (annotate) audio.sfx("pen");
  }, [annotate]);

  const draw = (delay: number, duration: number) => ({
    initial: { pathLength: 0, opacity: 0 },
    animate: annotate ? { pathLength: 1, opacity: 1 } : undefined,
    transition: {
      delay,
      duration,
      ease: [0.5, 0, 0.35, 1] as const,
      opacity: { delay, duration: 0.01 },
    },
  });

  return (
    <div className="relative mt-2 h-[205px]">
      {/* A cut-out gets a red outline, slightly off register; a press photo is printed in halftone (effects.css: .news-cutout, .news-press) */}
      <motion.figure
        className={
          cutout
            ? "news-cutout absolute -right-1.5 bottom-0 m-0 h-full w-[74%]"
            : "news-press absolute right-0 bottom-0 m-0 h-full w-[70%] bg-[rgba(246,243,236,0.65)] p-[5px] shadow-[0_1px_0_rgba(0,0,0,0.15),0_6px_14px_rgba(0,0,0,0.2)]"
        }
        initial={{ opacity: 0, y: 26, rotate: 5, scale: 0.92 }}
        animate={
          show
            ? { opacity: 1, y: 0, rotate: cutout ? 0 : -1.5, scale: 1 }
            : undefined
        }
        transition={{
          delay: 0.15,
          type: "spring",
          stiffness: 190,
          damping: 17,
        }}
        onAnimationComplete={() => show && onDoneRef.current()}
      >
        <img
          src={photoUrl(file)}
          alt=""
          draggable={false}
          className={
            cutout
              ? "h-full w-full object-contain object-[100%_100%]"
              : "h-full w-full object-cover"
          }
        />
      </motion.figure>
      <svg
        className="absolute top-11 left-[4%] w-[30%] overflow-visible stroke-pen"
        viewBox="0 0 110 80"
        fill="none"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <motion.path d="M6 10 C34 2 74 10 96 52" {...draw(0, 0.45)} />
        <motion.path
          d="M81 47 L97 55 L100 37"
          {...draw(0.45, 0.18)}
          onAnimationComplete={() => annotate && onArrowRef.current()}
        />
      </svg>
      {note && (
        <motion.span
          className="absolute top-2 left-0 -rotate-7 font-hand text-[23px] font-semibold whitespace-nowrap text-pen"
          initial={{ clipPath: "inset(-30% 100% -30% 0)" }}
          animate={annotate ? { clipPath: "inset(-30% 0% -30% 0)" } : undefined}
          transition={{ delay: 0.5, duration: 0.7, ease: "linear" }}
        >
          {fill(note)}
        </motion.span>
      )}
    </div>
  );
}

interface StoryProps {
  story: NewsStory;
  size: "column" | "wide";
  /** Rules and gutters around it */
  className?: string;
  /** The lead has been marked: start watching for this story to come into view (one thing at a time) */
  enabled: boolean;
  /** In a shared row, the second column is marked a moment after the first */
  order?: number;
}

function Story({
  story,
  size,
  enabled,
  order = 0,
  className = "",
}: StoryProps) {
  const ref = useRef<HTMLElement>(null);
  const seen = useSeen(ref, enabled, 0.6);
  const [headlineDone, setHeadlineDone] = useState(false);
  return (
    <article ref={ref} className={`pt-[18px] pb-5 ${className}`}>
      <span className={TAG}>{fill(story.tag)}</span>
      <Marked
        as="h2"
        className={HEADLINE[size]}
        text={fill(story.headline)}
        play={seen}
        delay={0.2 + order * 0.35}
        onDone={() => setHeadlineDone(true)}
      />
      <Marked
        className={DEK[size]}
        text={fill(story.dek)}
        play={headlineDone}
        delay={0.08}
      />
      {story.body?.map((para, i) => (
        <Marked
          key={i}
          className={BODY[size]}
          text={fill(para)}
          play={headlineDone}
          delay={0.4 + i * 0.4}
        />
      ))}
    </article>
  );
}

/** The boxed correction at the foot of the page, signed by the editor */
function Correction({ enabled }: { enabled: boolean }) {
  const { correction } = content.newspaper;
  const ref = useRef<HTMLElement>(null);
  const seen = useSeen(ref, enabled, 0.7);
  const [marked, setMarked] = useState(false);
  return (
    <aside
      ref={ref}
      className="mt-6 border border-news-ink px-4 pt-3.5 pb-3 outline outline-news-ink/26 -outline-offset-5"
    >
      <h3 className="text-[11px] font-bold tracking-[0.2em] uppercase">
        {fill(correction.title)}
      </h3>
      <Marked
        className="mt-2 text-[17px] leading-[1.45] text-pretty"
        text={fill(correction.text)}
        play={seen}
        delay={0.3}
        onDone={() => setMarked(true)}
      />
      <motion.p
        className="mt-1.5 ml-auto w-fit font-script text-[30px] leading-[1.2]"
        initial={{ clipPath: "inset(-30% 100% -30% 0)" }}
        animate={marked ? { clipPath: "inset(-30% 0% -30% 0)" } : undefined}
        transition={{ duration: 1, ease: [0.45, 0, 0.55, 1] }}
      >
        {fill(correction.signature)}
      </motion.p>
    </aside>
  );
}
