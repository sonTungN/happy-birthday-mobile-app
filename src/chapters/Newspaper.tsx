import { AnimatePresence, motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Marked } from "../components/Marked";
import { content } from "../content";
import { useWindOn } from "../lib/advance";
import { photoUrl, videoUrl } from "../lib/assets";
import { audio } from "../lib/audio";
import { useLatest, usePaperSurface, useSeen, useTimers } from "../lib/hooks";
import { unmarked } from "../lib/marks";
import { candleAge, fill, formatEditionDate } from "../lib/text";
import type { NewsStory } from "../types";

/** How full a line of headline should be: a compositor leaves a little air at the end */
const FILL = 0.94;
/** The sizes a headline may be set at, by kind, in px */
const FIT = {
  lead: { min: 40, max: 66 },
  column: { min: 19, max: 30 },
  wide: { min: 24, max: 40 },
};

/**
 * Sets a headline the way a compositor would: as large as it can be and still come out on whole, nearly full
 * lines (up to three), so no line is left half empty. The size goes straight onto the element and is worked
 * out again when the fonts arrive or the column changes width. Put the returned ref on a block around the
 * Marked headline; `text` is the plain wording, without the mark-up.
 */
function useHeadlineFit(text: string, min: number, max: number) {
  const wrap = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const box = wrap.current;
    const el = box?.firstElementChild as HTMLElement | null;
    if (!box || !el) return;
    const fit = () => {
      const col = box.clientWidth;
      if (!col) return;
      const cs = getComputedStyle(el);
      const tracking =
        parseFloat(cs.letterSpacing) / parseFloat(cs.fontSize) || 0;
      // The whole headline on one line at the largest size (offsetWidth: unmoved by the sheet's spin)
      const probe = document.createElement("span");
      probe.textContent = text;
      probe.style.cssText = `position:absolute;left:-9999px;top:0;visibility:hidden;white-space:nowrap;font-family:${cs.fontFamily};font-weight:${cs.fontWeight};font-size:${max}px;letter-spacing:${tracking}em`;
      box.appendChild(probe);
      const oneLine = probe.offsetWidth;
      probe.remove();
      if (!oneLine) return;
      // The fewest lines the words fit on at a decent size, and the size that fills them
      let lines = 1;
      let size = (max * col * FILL) / oneLine;
      while (size < min && lines < 3) {
        lines += 1;
        size = (max * col * lines * FILL) / oneLine;
      }
      size = Math.min(max, Math.max(min, size));
      // The words may not break as evenly as that: fill the lines they really take, or come down until they fit
      for (let tries = 0; tries < 8; tries++) {
        el.style.fontSize = `${size.toFixed(1)}px`;
        const rows = Math.round(
          el.offsetHeight / parseFloat(getComputedStyle(el).lineHeight),
        );
        if (rows <= lines) break;
        if (rows <= 3 && lines < rows) {
          lines = rows;
          size = Math.min(
            max,
            Math.max(min, (max * col * lines * FILL) / oneLine),
          );
        } else {
          if (size <= min) break;
          size = Math.max(min, size * 0.95);
        }
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    void document.fonts.ready.then(fit);
    return () => ro.disconnect();
  }, [text, min, max]);
  return wrap;
}

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
  // The paper comes out on her birthday this year, and looks back
  const editionDate = content.birthday.replace(/^\d{4}/, (y) =>
    String(Number(y) + candleAge()),
  );
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
            className="news-dateline relative mt-3 mb-2 flex flex-wrap justify-between gap-x-2.5 border-t border-b-2 border-t-news-ink/60 border-b-news-ink px-px pt-[5px] pb-1 text-[10px] font-semibold tracking-[0.1em] uppercase"
            {...ink(landed, 1)}
          >
            <span className="whitespace-nowrap">{fill(newspaper.edition)}</span>
            <span className="whitespace-nowrap">
              {formatEditionDate(editionDate)}
            </span>
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

        {/* Below the fold: printed last, in one go. The moving picture comes straight after her, then the archive */}
        <motion.div {...ink(landed, 3)}>
          {newspaper.clip && (
            <MovingPicture clip={newspaper.clip} enabled={leadDone} />
          )}
          {newspaper.archiveLabel && (
            // The stories from the week she was born, under a small kicker
            <p className="mt-5 mb-1.5 text-[10px] font-bold tracking-[0.2em] text-news-ink/70 uppercase">
              {fill(newspaper.archiveLabel)}
            </p>
          )}
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

          {newspaper.correction && (
            <Correction correction={newspaper.correction} enabled={leadDone} />
          )}
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
  lead: "mt-3 text-[19px] leading-[1.42] font-normal text-justify hyphens-auto text-pretty text-news-ink/86",
  column:
    "mt-2.5 text-[15px] leading-[1.4] font-normal text-justify hyphens-auto text-pretty text-news-ink/86",
  wide: "mt-2.5 text-[17px] leading-[1.42] font-normal text-justify hyphens-auto text-pretty text-news-ink/86",
};

/** The paragraphs of a story, after the dek (after the photo, for the lead) */
const BODY = {
  lead: "text-[16.5px] leading-[1.45] font-normal text-justify hyphens-auto text-pretty text-news-ink/84",
  column:
    "mt-2 text-[14px] leading-[1.4] font-normal text-justify hyphens-auto text-pretty text-news-ink/84",
  wide: "mt-2 text-[15.5px] leading-[1.42] font-normal text-justify hyphens-auto text-pretty text-news-ink/84",
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
  const photos = content.newspaper.growUp;
  const headline = fill(story.headline);
  const fitRef = useHeadlineFit(unmarked(headline), FIT.lead.min, FIT.lead.max);
  return (
    <article className="pt-5 pb-5">
      {/* Printed third, after the masthead and the date line. The photo is the editor's, so it isn't printed */}
      <motion.div
        {...ink(landed, 2)}
        onAnimationComplete={() => setPrinted(true)}
      >
        <span className={TAG}>{fill(story.tag)}</span>
        <div ref={fitRef}>
          <Marked
            as="h2"
            className={HEADLINE.lead}
            text={headline}
            play={printed}
            delay={0.5}
            onDone={() => setStep(1)}
          />
        </div>
        <Marked
          className={DEK.lead}
          text={fill(story.dek)}
          play={step >= 1}
          delay={0.1}
          onDone={() => {
            setStep(2);
            if (photos.length === 0) onDone();
          }}
        />
        {/* A hairline with the paper's name, so her pictures keep off the standfirst */}
        {photos.length > 0 && (
          <div className="mt-3.5 flex items-center gap-2" aria-hidden>
            <span className="font-masthead text-[15px] leading-none whitespace-nowrap">
              {fill(content.newspaper.masthead)}
            </span>
            <span className="h-px flex-1 bg-news-ink/45" />
          </div>
        )}
      </motion.div>
      {photos.length > 0 && (
        <Clipping
          photos={photos}
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
              play={photos.length > 0 ? step >= 4 : step >= 2}
              delay={0.3 + i * 0.4}
            />
          ))}
        </motion.div>
      )}
    </article>
  );
}

interface ClippingProps {
  /** Her, growing up: pasted on one after another, each with its note by the arrow */
  photos: { file: string; note?: string }[];
  /** Draw the arrow and write the note */
  annotate: boolean;
  /** Paste the first photo onto the page */
  show: boolean;
  /** The arrow is drawn */
  onArrow: () => void;
  /** The first photo is on */
  onDone: () => void;
}

/** Each photo stays this long before the next fades in over it (in GROW_FADE seconds) */
const GROW_HOLD_MS = 2000;
const GROW_FADE = 0.5;

/**
 * Her photos, pasted onto the page: a cut-out with a red outline when it's a .png with the background removed,
 * otherwise a press photo. A red pen arrow points at where she'll go, with a note scribbled at its tail;
 * the first photo comes last. Then she grows up: the next photo fades in as the one before fades out, note
 * and all, round and round.
 */
function Clipping({ photos, annotate, show, onArrow, onDone }: ClippingProps) {
  const [current, setCurrent] = useState(0);
  /** The first photo has landed: from here on the pictures change by fading */
  const [pasted, setPasted] = useState(false);
  const onArrowRef = useLatest(onArrow);
  const onDoneRef = useLatest(onDone);
  const photo = photos[current % photos.length];
  const cutout = /\.png$/i.test(photo.file);
  const fade = { duration: GROW_FADE };

  useEffect(() => {
    if (annotate) audio.sfx("pen");
  }, [annotate]);

  useEffect(() => {
    if (!pasted || photos.length < 2) return;
    const id = window.setInterval(
      () => setCurrent((c) => (c + 1) % photos.length),
      GROW_HOLD_MS + GROW_FADE * 1000,
    );
    return () => window.clearInterval(id);
  }, [pasted, photos.length]);

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
    // Two frames: the note and the arrow in the left third, her in the right two thirds, scaled to the height and centred
    <div className="relative mt-2 grid h-[205px] grid-cols-[1fr_2fr]">
      <div className="relative">
        <div className="relative h-9">
          {/* Written by hand the first time, then each note fades in with its photo */}
          <AnimatePresence>
            {photo.note && (
              <motion.span
                key={current}
                className="absolute top-0 left-0 -rotate-7 font-hand text-[23px] font-semibold whitespace-nowrap text-pen"
                initial={
                  pasted
                    ? { opacity: 0 }
                    : { clipPath: "inset(-30% 100% -30% 0)" }
                }
                animate={
                  pasted
                    ? { opacity: 1 }
                    : annotate
                      ? { clipPath: "inset(-30% 0% -30% 0)" }
                      : undefined
                }
                exit={{ opacity: 0, transition: fade }}
                transition={
                  pasted ? fade : { delay: 0.5, duration: 0.7, ease: "linear" }
                }
              >
                {fill(photo.note)}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        {/* An arc from under the first letters of the note, sweeping down and right into her; drawn once */}
        <svg
          className="mt-1 block w-full overflow-visible stroke-pen"
          viewBox="0 0 100 80"
          fill="none"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <motion.path d="M14 2 C10 46 34 66 96 60" {...draw(0, 0.5)} />
          <motion.path
            d="M82 51 L97 60 L83 69"
            {...draw(0.5, 0.18)}
            onAnimationComplete={() => annotate && onArrowRef.current()}
          />
        </svg>
      </div>
      {/* A cut-out gets a red outline down its left side; a press photo is printed in halftone (effects.css: .news-cutout, .news-press).
          The first one is pasted on with a spring; every one after that fades in as the last fades out */}
      <AnimatePresence>
        <motion.figure
          key={current}
          className={
            cutout
              ? "news-cutout absolute inset-0 m-0 col-start-2"
              : "news-press absolute inset-0 m-0 col-start-2 bg-[rgba(246,243,236,0.65)] p-[5px] shadow-[0_1px_0_rgba(0,0,0,0.15),0_6px_14px_rgba(0,0,0,0.2)]"
          }
          initial={
            pasted
              ? { opacity: 0 }
              : { opacity: 0, y: 26, rotate: 5, scale: 0.92 }
          }
          animate={
            show
              ? pasted
                ? { opacity: 1 }
                : { opacity: 1, y: 0, rotate: cutout ? 0 : -1.5, scale: 1 }
              : undefined
          }
          exit={{ opacity: 0, transition: fade }}
          transition={
            pasted
              ? fade
              : { delay: 0.15, type: "spring", stiffness: 190, damping: 17 }
          }
          onAnimationComplete={() => {
            if (!show || pasted) return;
            setPasted(true);
            onDoneRef.current();
          }}
        >
          <img
            src={photoUrl(photo.file)}
            alt=""
            draggable={false}
            className={
              cutout
                ? "h-full w-full object-contain object-center"
                : "h-full w-full object-cover"
            }
          />
        </motion.figure>
      </AnimatePresence>
    </div>
  );
}

/**
 * The picture that moves, at the foot of the page, like the ones in the wizards' paper: the clip plays, silent,
 * once she has scrolled to it. A tap turns the sound on (the music steps aside), another turns it off.
 */
function MovingPicture({
  clip,
  enabled,
}: {
  clip: NonNullable<typeof content.newspaper.clip>;
  enabled: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const seen = useSeen(ref, enabled, 0.4);
  const [headlineDone, setHeadlineDone] = useState(false);
  const [sound, setSound] = useState(false);
  const src = videoUrl(clip.file);
  const headline = fill(clip.headline);
  const fitRef = useHeadlineFit(unmarked(headline), FIT.wide.min, FIT.wide.max);

  // It plays while she is looking at it
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (seen) void video.play().catch(() => {});
    else video.pause();
  }, [seen]);

  // Sound on: the music steps aside until the sound is off again, or the page is gone
  useEffect(() => {
    if (!sound) return;
    audio.hold("clip");
    return () => audio.release("clip");
  }, [sound]);

  const toggleSound = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = sound;
    setSound(!sound);
  };

  return (
    <article ref={ref} className="border-b-2 border-news-ink pt-3 pb-5">
      <span className={TAG}>{fill(clip.tag)}</span>
      <div ref={fitRef}>
        <Marked
          as="h2"
          className={HEADLINE.wide}
          text={headline}
          play={seen}
          delay={0.2}
          onDone={() => setHeadlineDone(true)}
        />
      </div>
      {/* The frame floats right and the type runs down its left and on under it, the way a paper sets a picture */}
      <div className="mt-1 flow-root">
        <figure className="float-right mt-1.5 mr-0 mb-1 ml-3.5 w-[56%]">
          {/* Framed and printed in halftone like a press photo, but it moves (effects.css: .news-moving) */}
          <button
            type="button"
            className="news-moving block w-full cursor-pointer border-0 p-[5px] text-left"
            onClick={toggleSound}
            aria-label={sound ? clip.captionOn : clip.caption}
          >
            {src ? (
              <video
                ref={videoRef}
                src={src}
                muted
                loop
                playsInline
                preload="metadata"
                className="block h-auto w-full"
              />
            ) : (
              <div className="grid aspect-[9/16] place-items-center font-body text-[14px] italic">
                No film in the camera
              </div>
            )}
          </button>
          <figcaption className="mt-1.5 text-center font-body text-[12px] leading-[1.3] text-news-ink/75 italic">
            {sound ? clip.captionOn : clip.caption}
          </figcaption>
        </figure>
        <Marked
          className={DEK.column}
          text={fill(clip.dek)}
          play={headlineDone}
          delay={0.08}
        />
        {clip.body?.map((para, i) => (
          <Marked
            key={i}
            className={BODY.column}
            text={fill(para)}
            play={headlineDone}
            delay={0.4 + i * 0.4}
          />
        ))}
      </div>
    </article>
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
  const headline = fill(story.headline);
  const fitRef = useHeadlineFit(unmarked(headline), FIT[size].min, FIT[size].max);
  return (
    <article ref={ref} className={`pt-[18px] pb-5 ${className}`}>
      <span className={TAG}>{fill(story.tag)}</span>
      <div ref={fitRef}>
        <Marked
          as="h2"
          className={HEADLINE[size]}
          text={headline}
          play={seen}
          delay={0.2 + order * 0.35}
          onDone={() => setHeadlineDone(true)}
        />
      </div>
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
function Correction({
  correction,
  enabled,
}: {
  correction: NonNullable<typeof content.newspaper.correction>;
  enabled: boolean;
}) {
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
        className="mt-2 text-[17px] leading-[1.45] text-justify hyphens-auto text-pretty"
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
