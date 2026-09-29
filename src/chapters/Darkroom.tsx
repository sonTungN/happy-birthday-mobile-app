import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useTransform,
} from "motion/react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { Flip } from "../components/Flip";
import { Polaroid, Tape } from "../components/Polaroid";
import { content } from "../content";
import { useWindOn } from "../lib/advance";
import { photoUrl } from "../lib/assets";
import { audio } from "../lib/audio";
import { readingOrder } from "../lib/board";
import { capturePointer } from "../lib/geometry";
import { buzz, hapticRef } from "../lib/haptics";
import { useElementSize, useLatest, useTimers } from "../lib/hooks";
import { blankPrint, todayIso } from "../lib/selfie";
import { storage } from "../lib/storage";
import { fill } from "../lib/text";
import type { PhotoEntry } from "../types";
import { PhotoViewer } from "./PhotoViewer";
import { SelfieCamera } from "./SelfieCamera";

/**
 * ready → (tap) ejecting → developing → developed → pinning → ready, once per photo. After the last one:
 * turning (the camera turns round) → selfie (waiting for her tap) → camera (the picture dives into the lens
 * and the phone's camera opens) → returning (back out of the lens) → the same print cycle for her picture → done.
 */
type Phase =
  | "ready"
  | "ejecting"
  | "developing"
  | "developed"
  | "pinning"
  | "turning"
  | "selfie"
  | "camera"
  | "returning"
  | "done";

interface Slot {
  x: number;
  y: number;
  r: number;
}

/** Where each photo lands on the board (center in %, rotation in degrees), per number of photos. */
const LAYOUTS: Slot[][] = [
  [],
  [{ x: 50, y: 45, r: -3 }],
  [
    { x: 31, y: 40, r: -6 },
    { x: 69, y: 58, r: 5 },
  ],
  [
    { x: 28, y: 26, r: -7 },
    { x: 72, y: 40, r: 6 },
    { x: 44, y: 74, r: -3 },
  ],
  [
    { x: 28, y: 24, r: -7 },
    { x: 72, y: 28, r: 6 },
    { x: 30, y: 72, r: 4 },
    { x: 70, y: 76, r: -5 },
  ],
  [
    { x: 26, y: 19, r: -8 },
    { x: 73, y: 22, r: 7 },
    { x: 48, y: 50, r: -3 },
    { x: 25, y: 80, r: 6 },
    { x: 74, y: 82, r: -6 },
  ],
  [
    { x: 26, y: 19, r: -8 },
    { x: 73, y: 21, r: 7 },
    { x: 28, y: 50, r: 4 },
    { x: 72, y: 53, r: -5 },
    { x: 27, y: 81, r: -4 },
    { x: 72, y: 83, r: 6 },
  ],
  [
    { x: 25, y: 18, r: -8 },
    { x: 74, y: 19, r: 7 },
    { x: 49, y: 40, r: -3 },
    { x: 22, y: 61, r: 6 },
    { x: 77, y: 61, r: -6 },
    { x: 33, y: 83, r: -4 },
    { x: 70, y: 84, r: 5 },
  ],
  [
    { x: 25, y: 19, r: -8 },
    { x: 74, y: 20, r: 7 },
    { x: 29, y: 40, r: 4 },
    { x: 72, y: 42, r: -5 },
    { x: 26, y: 61, r: -4 },
    { x: 75, y: 62, r: 6 },
    { x: 31, y: 82, r: 5 },
    { x: 70, y: 83, r: -6 },
  ],
];

const PHOTOS = content.photos.slice(0, LAYOUTS.length - 1);
const SELFIE = content.darkroom.selfie;
/** Her own print lands in the middle of the board, on top of the others */
const CENTER: Slot = { x: 50, y: 50, r: -2 };
/** Polaroid height ÷ width (padding 5.5% + square photo + 21% bottom border) */
const PHOTO_RATIO = 1.155;
const TAPES = ["paper", "smoke"] as const;
const SPRING = { type: "spring", stiffness: 110, damping: 17 } as const;
/** The fingertip shows the rubbing on this many prints; after that she knows */
const RUB_LESSONS = 3;

const wait = (ms: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, ms));

interface Developing {
  index: number;
  /** Layout width of the developing photo in px */
  width: number;
  /** Distance from the top of the chapter to the camera's slot, in px */
  slotY: number;
  /** From the third frame on she knows the ritual: shorter pauses, quicker to develop */
  quick: boolean;
}

interface Shot {
  /** A JPEG data URL, or 'blank' when the camera couldn't be used */
  src: string;
  /** 'YYYY-MM-DD' */
  date: string;
  /** The line she wrote for the back of the print */
  message?: string;
}

/** What survives closing the app: how many photos are pinned, and her picture once it's taken */
interface Saved {
  pinned: number;
  selfie: Shot | null;
}

function loadSaved(): Saved {
  try {
    const raw = storage.get("darkroom");
    const s = raw ? (JSON.parse(raw) as Partial<Saved>) : {};
    const pinned = Math.max(
      0,
      Math.min(PHOTOS.length, Math.floor(Number(s.pinned) || 0)),
    );
    const shot = s.selfie;
    const selfie =
      pinned >= PHOTOS.length &&
      shot &&
      typeof shot.src === "string" &&
      typeof shot.date === "string"
        ? {
            src: shot.src,
            date: shot.date,
            message:
              typeof shot.message === "string" ? shot.message : undefined,
          }
        : null;
    return { pinned, selfie };
  } catch {
    return { pinned: 0, selfie: null };
  }
}

const save = (s: Saved) => storage.set("darkroom", JSON.stringify(s));

/** Her print: the picture she took with her line on the back, or the blank one the camera gave her */
function selfieEntry(shot: Shot): PhotoEntry {
  const blank = shot.src === "blank";
  return {
    file: blank ? blankPrint() : shot.src,
    date: shot.date,
    title: fill(blank ? SELFIE.blankCaption : SELFIE.caption),
    place: blank ? undefined : SELFIE.place,
    note: blank ? fill(SELFIE.blankNote) : shot.message || fill(SELFIE.note),
    signedBy: SELFIE.signature,
  };
}

/**
 * Chapter 3: take photos with an instant camera (seen from the back, as she would hold it), rub them to develop,
 * and pin them to a board. While shooting, the prints can be dragged anywhere. After the last photo the camera
 * turns round: a tap on its shutter dives into the lens and opens the phone's own camera (SelfieCamera), and
 * the picture she takes comes out of the slot like the others, with her line on the back. Then the prints
 * spread out into a grid, in the order she left them: tapping a picture turns it over, dragging a print by its
 * white border rearranges the grid.
 */
export default function Darkroom() {
  const total = PHOTOS.length;
  const slots = LAYOUTS[total];
  const [saved] = useState(loadSaved);

  const rootRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLButtonElement | null>(null);
  const alive = useRef(true);
  const rub = useRef<{ x: number; y: number } | null>(null);
  const rubSound = useRef({ at: 0, distance: 0 });
  /** Where she left each print while shooting (center in px): the grid follows this order */
  const placed = useRef(new Map<number, { x: number; y: number }>());
  const later = useTimers();

  const [shot, setShot] = useState<Shot | null>(saved.selfie);
  const [phase, setPhase] = useState<Phase>(() =>
    total === 0 || saved.selfie
      ? "done"
      : saved.pinned >= total
        ? "selfie"
        : "ready",
  );
  const [pinned, setPinned] = useState(saved.pinned + (saved.selfie ? 1 : 0));
  /** Pinned prints, bottom to top: each new one lands on top; touching one brings it up */
  const [order, setOrder] = useState<number[]>(() =>
    Array.from({ length: saved.pinned + (saved.selfie ? 1 : 0) }, (_, i) => i),
  );
  const [flashLit, setFlashLit] = useState(false);
  /** Where the picture dives in when the camera opens: the middle of the lens, in px from the top left */
  const [origin, setOrigin] = useState("50% 80%");
  /** The roll is done and the prints have spread out into the grid */
  const [grid, setGrid] = useState(false);
  /** Which print sits in each grid cell (reordered by dragging) */
  const [cells, setCells] = useState<number[]>([]);
  const board = useElementSize(boardRef);
  const [viewer, setViewer] = useState<number | null>(null);
  /** Counts the openings: each gets a fresh viewer, so a print never comes up already turned over */
  const [viewerOpens, setViewerOpens] = useState(0);
  const [developing, setDeveloping] = useState<Developing | null>(null);
  const [flashes, setFlashes] = useState(0);
  const [rubbed, setRubbed] = useState(false);
  const phaseRef = useLatest(phase);
  const shotRef = useLatest(shot);

  const progress = useMotionValue(0);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);
  const rotate = useMotionValue(0);
  const filter = useTransform(
    progress,
    (p) =>
      `brightness(${0.25 + 0.75 * p}) contrast(${0.8 + 0.2 * p}) blur(${(1 - p) * 2.4}px)`,
  );
  const veil = useTransform(progress, [0, 1], [0.95, 0]);

  const selfie = useMemo(() => (shot ? selfieEntry(shot) : null), [shot]);
  const blank = shot?.src === "blank";
  /** Every print on the board: the photos, then hers */
  const all = useMemo(() => (selfie ? [...PHOTOS, selfie] : PHOTOS), [selfie]);

  const done = phase === "done";
  /** The camera shows its front, turned round for her picture: from the moment the roll is done */
  const turned =
    phase === "turning" ||
    phase === "selfie" ||
    phase === "camera" ||
    phase === "returning" ||
    shot !== null;
  const cameraOpen = phase === "camera";
  useWindOn(done);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // The roll is done: the camera turns round, and a moment later it's ready for her
  useEffect(() => {
    if (phase !== "turning") return;
    audio.sfx("motor");
    const id = window.setTimeout(() => setPhase("selfie"), 1200);
    return () => window.clearTimeout(id);
  }, [phase]);

  const freeHome = (i: number): Home => {
    const slot = i >= total ? CENTER : slots[i];
    return {
      x: (slot.x / 100) * board.width,
      y: (slot.y / 100) * board.height,
      r: slot.r,
    };
  };

  // Once the camera has folded away and the board has its full size, the prints spread out into the grid,
  // row by row in the order she left them
  useEffect(() => {
    if (!done || grid) return;
    const id = window.setTimeout(() => {
      const rowHeight =
        Math.min(0.34 * board.width, 0.3 * board.height) * PHOTO_RATIO * 0.6;
      const points = Array.from({ length: pinned }, (_, i) => {
        const slot = i >= total ? CENTER : slots[i];
        const p = placed.current.get(i);
        return {
          index: i,
          x: p?.x ?? (slot.x / 100) * board.width,
          y: p?.y ?? (slot.y / 100) * board.height,
        };
      });
      setCells(readingOrder(points, rowHeight));
      setGrid(true);
    }, 750);
    return () => window.clearTimeout(id);
  }, [done, grid, pinned, total, slots, board.width, board.height]);

  const layout = useMemo(
    () => gridCells(pinned, board.width, board.height),
    [pinned, board.width, board.height],
  );
  /** Width of a print on the board (same as the --pw of a pinned print) */
  const baseWidth = Math.min(0.34 * board.width, 0.3 * board.height);
  const gridScale = baseWidth > 0 ? layout.width / baseWidth : 1;

  const homeOf = (i: number): Home =>
    grid ? (layout.cells[cells.indexOf(i)] ?? freeHome(i)) : freeHome(i);

  // Magic grid: dragging a print over another cell slides the others along to make room
  const moveOver = (photo: number, x: number, y: number) => {
    let nearest = 0;
    layout.cells.forEach((cell, k) => {
      const best = layout.cells[nearest];
      if (
        Math.hypot(cell.x - x, cell.y - y) < Math.hypot(best.x - x, best.y - y)
      )
        nearest = k;
    });
    setCells((list) => {
      if (list.indexOf(photo) === nearest) return list;
      const next = list.filter((p) => p !== photo);
      next.splice(nearest, 0, photo);
      return next;
    });
  };

  const pin = async (dev: Developing) => {
    const board = boardRef.current;
    const root = rootRef.current;
    if (!board || !root) return;
    setPhase("pinning");
    const b = board.getBoundingClientRect();
    const r = root.getBoundingClientRect();
    const slot = dev.index >= total ? CENTER : slots[dev.index];
    const targetWidth = Math.min(0.34 * b.width, 0.3 * b.height);
    await Promise.all([
      animate(x, b.left - r.left + (slot.x / 100) * b.width, SPRING),
      animate(y, b.top - r.top + (slot.y / 100) * b.height, SPRING),
      animate(scale, targetWidth / dev.width, SPRING),
      animate(rotate, slot.r, SPRING),
    ]);
    if (!alive.current) return;
    audio.sfx("pop");
    buzz(18);
    const next = dev.index + 1;
    const hers = dev.index >= total;
    setPinned(next);
    setOrder((o) => [...o, dev.index]);
    setDeveloping(null);
    save({
      pinned: Math.min(next, total),
      selfie: hers ? shotRef.current : null,
    });
    setPhase(hers ? "done" : next >= total ? "turning" : "ready");
  };

  const finishDeveloping = (dev: Developing) => {
    if (phaseRef.current !== "developing") return;
    phaseRef.current = "developed";
    setPhase("developed");
    audio.sfx("sparkle");
    later(() => void pin(dev), dev.quick ? 500 : 950);
  };
  const finishRef = useLatest(finishDeveloping);

  // Photos develop on their own in ~6.5 s (4.5 s once she knows the ritual); rubbing speeds it up.
  useEffect(() => {
    if (phase !== "developing" || !developing) return;
    const span = developing.quick ? 4500 : 6500;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const next = Math.min(1, progress.get() + (now - last) / span);
      last = now;
      progress.set(next);
      if (next >= 1) {
        finishRef.current(developing);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, developing, progress, finishRef]);

  /** The print comes out of the slot on top of the camera and settles in view, still dark */
  const eject = async (index: number) => {
    const root = rootRef.current;
    const camera = cameraRef.current;
    if (!root || !camera) return;
    const r = root.getBoundingClientRect();
    const c = camera.getBoundingClientRect();
    const slotY = c.top - r.top + 10;
    const width = Math.max(
      120,
      Math.min(r.width * 0.6, (slotY - 96) / PHOTO_RATIO),
    );
    const height = width * PHOTO_RATIO;
    const quick = index >= 2;
    const dev: Developing = { index, width, slotY, quick };

    setPhase("ejecting");
    setRubbed(false);
    progress.set(0);
    scale.set(1);
    rotate.set(0);
    x.set(r.width / 2);
    y.set(slotY + height / 2 + 4);
    setDeveloping(dev);
    setFlashes((f) => f + 1);
    audio.sfx("shutter");

    await wait(280);
    if (!alive.current) return;
    audio.sfx("motor");
    await animate(y, slotY - height / 2 + height * 0.1, {
      duration: quick ? 0.6 : 0.9,
      ease: [0.3, 0.7, 0.3, 1],
    });
    await wait(quick ? 100 : 160);
    if (!alive.current) return;
    void animate(rotate, -2, { duration: 0.5 });
    await animate(y, Math.max(height / 2 + 70, slotY / 2 + 16), {
      type: "spring",
      stiffness: 120,
      damping: 18,
    });
    if (!alive.current) return;
    setPhase("developing");
  };

  const shoot = () => {
    if (phase !== "ready" || pinned >= total) return;
    void eject(pinned);
  };

  /** Her tap on the shutter: the picture dives into the lens and the phone's camera opens */
  const lookIntoLens = () => {
    if (phase !== "selfie") return;
    const root = rootRef.current;
    const camera = cameraRef.current;
    if (root && camera) {
      const r = root.getBoundingClientRect();
      const c = camera.getBoundingClientRect();
      setOrigin(
        `${c.left - r.left + c.width / 2}px ${c.top - r.top + c.height * 0.54}px`,
      );
    }
    audio.sfx("tap");
    setPhase("camera");
  };

  /** Her picture is taken (or the camera gave a blank print): it goes through the same slot as the others */
  const takeSelfie = (src: string | null, message = "") => {
    setShot({
      src: src ?? "blank",
      date: todayIso(),
      message: message || undefined,
    });
    setFlashLit(true);
    later(() => setFlashLit(false), 220);
    void eject(total);
  };

  /** Back out of the lens; once the darkroom is in view again, the print comes out */
  const printSelfie = (src: string | null, message = "") => {
    setPhase("returning");
    later(() => takeSelfie(src, message), 550);
  };

  const onRubStart = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (phase !== "developing") return;
    capturePointer(e);
    rub.current = { x: e.clientX, y: e.clientY };
    rubSound.current = { at: 0, distance: 0 };
  };

  const onRubMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const last = rub.current;
    if (!last || !developing || phaseRef.current !== "developing") return;
    const distance = Math.hypot(e.clientX - last.x, e.clientY - last.y);
    rub.current = { x: e.clientX, y: e.clientY };
    if (!rubbed && distance > 2) setRubbed(true);
    // A swish of the thumb every few centimetres
    const s = rubSound.current;
    s.distance += distance;
    if (s.distance > 40 && e.timeStamp - s.at > 110) {
      s.distance = 0;
      s.at = e.timeStamp;
      audio.sfx("rub");
    }
    const next = Math.min(
      1,
      progress.get() + distance / (developing.quick ? 420 : 700),
    );
    progress.set(next);
    if (next >= 1) finishDeveloping(developing);
  };

  const onRubEnd = () => {
    rub.current = null;
  };

  const bringToFront = (index: number) =>
    setOrder((o) => [...o.filter((i) => i !== index), index]);

  const openViewer = (index: number) => {
    audio.sfx("paper");
    // Closing and reopening within the exit animation would otherwise keep the old viewer (and its turned-over state)
    setViewerOpens((n) => n + 1);
    setViewer(index);
  };

  const current: PhotoEntry | undefined = developing
    ? all[developing.index]
    : undefined;
  const canShoot = phase === "ready" || phase === "selfie";

  return (
    <div ref={rootRef} className="film-bg absolute inset-0 overflow-hidden">
      {/* Everything on the table. When the phone's camera opens, the picture dives into the lens */}
      <motion.div
        className="absolute inset-0 flex flex-col pt-[calc(var(--safe-top)+58px)]"
        style={{ transformOrigin: origin }}
        initial={false}
        animate={{ scale: cameraOpen ? 3 : 1, opacity: cameraOpen ? 0 : 1 }}
        transition={
          cameraOpen
            ? { duration: 0.7, ease: [0.7, 0, 0.84, 0] }
            : { type: "spring", stiffness: 120, damping: 20 }
        }
      >
        <div className="flex h-[52px] flex-col items-center justify-center gap-0.5 px-4">
          <AnimatePresence mode="wait">
            <motion.p
              key={done ? "outro" : turned ? "selfie" : "title"}
              className="text-center font-display text-[22px] italic"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
            >
              {fill(
                done
                  ? content.darkroom.outro
                  : turned
                    ? SELFIE.title
                    : content.darkroom.title,
              )}
            </motion.p>
          </AnimatePresence>
          <AnimatePresence mode="wait">
            {pinned > 0 && (
              <motion.p
                key={done ? "grid" : "free"}
                className="font-body text-[15px] italic opacity-72"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {fill(
                  done
                    ? content.darkroom.gridHint
                    : content.darkroom.arrangeHint,
                )}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* The board the prints are pinned to: its size (cqw, cqh) sets the size of the prints */}
        <div
          ref={boardRef}
          className="relative mx-3 mt-1 flex-1 [container-type:size]"
        >
          <AnimatePresence>
            {pinned === 0 && !done && (
              <motion.p
                className="absolute inset-x-[4%] inset-y-[6%] grid place-items-center rounded-xs border border-dashed border-white/30 p-4 text-center font-body text-[20px] leading-[1.45] whitespace-pre-line text-white/62 italic"
                exit={{ opacity: 0 }}
              >
                {fill(content.darkroom.emptyBoard)}
              </motion.p>
            )}
          </AnimatePresence>
          {all.slice(0, pinned).map((photo, i) => (
            <BoardPhoto
              key={i}
              photo={photo}
              index={i}
              z={order.indexOf(i) + 1}
              home={homeOf(i)}
              mode={grid ? "grid" : "free"}
              scale={grid ? gridScale : 1}
              hidden={viewer === i}
              boardRef={boardRef}
              onLift={() => bringToFront(i)}
              onOpen={() => openViewer(i)}
              onMove={(x, y) => moveOver(i, x, y)}
              onSettle={(x, y) => placed.current.set(i, { x, y })}
            />
          ))}
        </div>

        {/* The camera's corner of the screen: it folds away once the roll is done */}
        <div
          className={`relative z-10 flex flex-none flex-col items-center gap-3.5 pt-[22px] transition-[height] duration-700 ease-[cubic-bezier(0.65,0,0.35,1)] ${done ? "h-[calc(var(--safe-bottom)+24px)]" : "h-[38%]"}`}
        >
          <motion.button
            ref={(el) => {
              cameraRef.current = el;
              hapticRef(el);
            }}
            type="button"
            className="relative aspect-[1.38] w-[min(70%,290px)] flex-none border-0 bg-transparent p-0 perspective-[1200px]"
            onClick={() => (turned ? lookIntoLens() : shoot())}
            aria-disabled={!canShoot}
            aria-label={turned ? "Open the camera" : "Take a photo"}
            animate={{ opacity: done ? 0 : 1, y: done ? 60 : 0 }}
            whileTap={canShoot ? { scale: 0.95 } : undefined}
            transition={{ duration: 0.5 }}
          >
            {/* The camera turns round on its vertical axis: the back she shoots with, the front that shoots her */}
            <Flip
              as="span"
              className="absolute inset-0"
              turned={turned}
              transition={{ duration: 1.1, ease: [0.65, 0, 0.35, 1] }}
              first={
                <CameraBack
                  ready={phase === "ready"}
                  preview={
                    pinned < total ? photoUrl(PHOTOS[pinned].file) : null
                  }
                />
              }
              second={<CameraFront ready={phase === "selfie"} lit={flashLit} />}
            />
          </motion.button>
          {phase === "selfie" && (
            // A way past it without a picture
            <button
              type="button"
              className="btn-ghost -mt-1.5 min-h-0 py-1 text-[15px]"
              onClick={() => takeSelfie(null)}
            >
              Leave it blank
            </button>
          )}
        </div>
      </motion.div>

      {flashes > 0 && (
        <motion.div
          key={flashes}
          className="pointer-events-none absolute inset-0 z-25 bg-[#fff]"
          initial={{ opacity: 0.95 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
        />
      )}

      {developing && current && (
        // Everything above the camera's slot: the photo slides out of the slot and stays in here
        <div
          className="pointer-events-none absolute top-0 right-0 left-0 z-20 overflow-hidden"
          style={{ height: developing.slotY }}
        >
          <motion.div
            className="pointer-events-auto absolute top-0 left-0 touch-none"
            style={{
              x,
              y,
              scale,
              rotate,
              width: developing.width,
              marginLeft: -developing.width / 2,
              marginTop: -(developing.width * PHOTO_RATIO) / 2,
            }}
            onPointerDown={onRubStart}
            onPointerMove={onRubMove}
            onPointerUp={onRubEnd}
            onPointerCancel={onRubEnd}
          >
            <Polaroid
              src={photoUrl(current.file)}
              alt={current.title}
              caption={current.title}
              date={current.date}
              focus={current.focus}
              photoStyle={{ filter }}
            >
              {/* Dark until developed, then a glint across the finished print */}
              <motion.span
                className="pointer-events-none absolute inset-0 z-2 bg-[linear-gradient(160deg,#3b3b39,#232322)]"
                style={{ opacity: veil }}
              />
              {phase === "developed" && (
                <span className="dev-shine pointer-events-none absolute inset-0 z-3" />
              )}
            </Polaroid>
            {phase === "developing" && !rubbed && developing.index < RUB_LESSONS && (
              // A fingertip rubbing to and fro: "rub it"
              <span
                className="pointer-events-none absolute top-[40%] left-1/2 h-[34px] w-[34px] animate-[dev-rub_1.1s_ease-in-out_infinite] rounded-[50%] border-2 border-white/90 bg-white/28 shadow-[0_2px_10px_rgba(0,0,0,0.45)]"
                aria-hidden
              />
            )}
          </motion.div>
        </div>
      )}

      {/* The phone's camera, once the picture has dived into the lens */}
      <AnimatePresence>
        {cameraOpen && (
          <motion.div
            key="camera"
            className="absolute inset-0 z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.4, duration: 0.35 } }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
          >
            <SelfieCamera
              onPrint={(src, message) => printSelfie(src, message)}
              onBlank={() => printSelfie(null)}
              onClose={() => setPhase("selfie")}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewer !== null && (
          <PhotoViewer
            key={`viewer-${viewerOpens}`}
            photos={cells.map((i) => all[i])}
            index={Math.max(0, cells.indexOf(viewer))}
            onIndex={(p) => setViewer(cells[p])}
            keepAt={shot && !blank ? cells.indexOf(total) : -1}
            onClose={() => setViewer(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface Home {
  /** Center of the print on the board, in px */
  x: number;
  y: number;
  /** Tilt in degrees */
  r: number;
}

/** Print width that fits a cell of the grid */
const fitWidth = (cellW: number, cellH: number) =>
  Math.min(cellW * 0.84, (cellH * 0.86) / PHOTO_RATIO);

/**
 * The grid the prints spread out into once the roll is done: cell centers (px) and the print width that fits.
 * Two or three columns, whichever gives bigger prints on this screen (nine prints on a phone: 3 × 3).
 */
function gridCells(
  count: number,
  width: number,
  height: number,
): { cells: Home[]; width: number } {
  const rowsFor = (cols: number) => Math.max(1, Math.ceil(count / cols));
  const cols =
    count <= 2 ||
    fitWidth(width / 2, height / rowsFor(2)) >=
      fitWidth(width / 3, height / rowsFor(3))
      ? 2
      : 3;
  const rows = rowsFor(cols);
  const cellW = width / cols;
  const cellH = height / rows;
  const cells = Array.from({ length: count }, (_, k) => {
    const row = Math.floor(k / cols);
    const inRow = Math.min(cols, count - row * cols);
    // A last row that isn't full sits in the middle
    const offset = ((cols - inRow) * cellW) / 2;
    return {
      x: offset + ((k % cols) + 0.5) * cellW,
      y: (row + 0.5) * cellH,
      r: k % 2 ? 2 : -2,
    };
  });
  return { cells, width: fitWidth(cellW, cellH) };
}

interface BoardPhotoProps {
  photo: PhotoEntry;
  index: number;
  z: number;
  /** Where the print belongs: its pin spot while shooting, its grid cell afterwards */
  home: Home;
  /** 'free': she can put it anywhere and it stays there. 'grid': it snaps to its cell, a tap on the picture turns it over */
  mode: "free" | "grid";
  scale: number;
  hidden: boolean;
  boardRef: RefObject<HTMLDivElement | null>;
  onLift: () => void;
  onOpen: () => void;
  /** While dragged in the grid: its center, to slide the others out of the way */
  onMove: (x: number, y: number) => void;
  /** Where she let go of it while shooting */
  onSettle: (x: number, y: number) => void;
}

/** Is the pointer on the picture itself (not the white border or the caption)? The picture is the top square of the print. */
function onPicture(e: {
  currentTarget: HTMLElement;
  clientX: number;
  clientY: number;
}): boolean {
  const r = e.currentTarget.getBoundingClientRect();
  const px = (e.clientX - r.left) / r.width;
  const py = (e.clientY - r.top) / r.width;
  return px > 0.05 && px < 0.95 && py > 0.05 && py < 0.95;
}

function BoardPhoto({
  photo,
  index,
  z,
  home,
  mode,
  scale,
  hidden,
  boardRef,
  onLift,
  onOpen,
  onMove,
  onSettle,
}: BoardPhotoProps) {
  const down = useRef<{ x: number; y: number; t: number } | null>(null);
  const dragging = useRef(false);
  const [lifted, setLifted] = useState(false);
  const x = useMotionValue(home.x);
  const y = useMotionValue(home.y);
  const homeRef = useLatest(home);

  // In the grid every print glides to its cell (the others make room while one is dragged);
  // while shooting, a print stays wherever she left it
  useEffect(() => {
    if (mode !== "grid" || dragging.current) return;
    void animate(x, home.x, SPRING);
    void animate(y, home.y, SPRING);
  }, [mode, home.x, home.y, x, y]);

  return (
    <motion.div
      // Centered on (x, y); --pw is the print's width, a third of the board at most
      className="absolute top-0 left-0 -mt-[calc(var(--pw)*0.5775)] -ml-[calc(var(--pw)/2)] w-(--pw) cursor-grab touch-none [--pw:min(34cqw,30cqh)]"
      style={{ x, y, zIndex: lifted ? 50 : z }}
      initial={false}
      animate={{ rotate: home.r, scale, opacity: hidden ? 0 : 1 }}
      transition={SPRING}
      drag
      dragConstraints={boardRef}
      dragElastic={0.12}
      dragMomentum={false}
      whileDrag={{ scale: scale * 1.06, rotate: 0 }}
      onDragStart={() => {
        dragging.current = true;
        setLifted(true);
      }}
      onDrag={() => {
        if (mode === "grid") onMove(x.get(), y.get());
      }}
      onDragEnd={() => {
        dragging.current = false;
        setLifted(false);
        if (mode !== "grid") {
          onSettle(x.get(), y.get());
          return;
        }
        void animate(x, homeRef.current.x, SPRING);
        void animate(y, homeRef.current.y, SPRING);
      }}
      onPointerDown={(e) => {
        down.current = { x: e.clientX, y: e.clientY, t: e.timeStamp };
        onLift();
      }}
      // The viewer opens on the click, not on pointer-up: a tap's click comes after its pointer-up, and with
      // the viewer already up by then, the click landed on it (turning the print over, or closing it again)
      onClick={(e) => {
        const start = down.current;
        down.current = null;
        if (mode !== "grid" || !start) return;
        // A short tap on the picture (not a drag, not the border) opens it
        const tap =
          Math.hypot(e.clientX - start.x, e.clientY - start.y) < 12 &&
          e.timeStamp - start.t < 500;
        if (tap && onPicture(e)) onOpen();
      }}
    >
      <Polaroid
        src={photoUrl(photo.file)}
        alt={photo.title}
        caption={photo.title}
        date={photo.date}
        focus={photo.focus}
        extras={
          <Tape
            color={TAPES[index % TAPES.length]}
            style={{ rotate: `${index % 2 ? 3 : -4}deg` }}
          />
        }
      />
    </motion.div>
  );
}

/**
 * The camera from the back, the way she holds it: eyepiece, film door, shutter button on the top edge.
 * Like an Instax, the print comes out of the slot on top with the picture facing her.
 * The viewfinder shows a dim glimpse of the next shot.
 */
function CameraBack({
  ready,
  preview,
}: {
  ready: boolean;
  preview: string | null;
}) {
  return (
    <span className="absolute inset-0">
      {/* The shutter button sits on the top edge and sticks out above the body; it pulses when ready */}
      <span
        className={`camera-shutter absolute -top-[9px] right-[12%] h-4 w-[17%] ${ready ? "animate-[camera-pulse_1.6s_ease-in-out_infinite]" : ""}`}
      />
      {/* Black leatherette with a chrome top plate */}
      <span className="camera-body absolute inset-0 overflow-hidden rounded-[14px]">
        {/* The print slot on top: photos come out here, picture side facing her */}
        <span className="absolute top-[7px] right-[18%] left-[18%] z-1 h-[7px] rounded-xs bg-[#0b0b0b] shadow-[inset_0_2px_3px_rgba(0,0,0,0.8)]" />
        {/* Rubber eyecup around the viewfinder: a dim glimpse of the next shot */}
        <span className="camera-eyepiece absolute top-[10%] left-[7%] z-1 aspect-[1.45] w-[25%] rounded-[9px] p-[5px]">
          <span className="camera-finder relative block h-full w-full overflow-hidden rounded-sm bg-[#050505] shadow-[inset_0_0_8px_rgba(0,0,0,0.9)]">
            {preview && (
              <img
                src={preview}
                alt=""
                draggable={false}
                className="block h-full w-full object-cover [filter:grayscale(1)_brightness(0.55)_blur(1.2px)]"
              />
            )}
          </span>
        </span>
        {/* "Ready" light next to the eyepiece */}
        <span
          className={`absolute top-[13%] left-[36%] z-1 h-[7px] w-[7px] rounded-[50%] ${ready ? "bg-[#f4f1ea] shadow-[0_0_6px_2px_rgba(255,248,230,0.7)]" : "bg-[#3a3a3a] shadow-[inset_0_1px_1px_rgba(0,0,0,0.6)]"}`}
        />
        <span className="absolute top-[13%] right-[8%] z-1 font-ui text-[8px] font-bold tracking-[0.18em] text-[#5f5d58] uppercase">
          Instant · Auto
        </span>
        {/* The film door: a raised panel with their names written on it, and a latch */}
        {/* The film door sits clear of the viewfinder above it (which ends at about 34% of the height) */}
        <span className="camera-door absolute top-[41%] right-[6%] bottom-[8%] left-[6%] z-1 rounded-lg ">
          <span className="absolute bottom-[11%] left-[7%] font-script text-[20px] leading-[1.2] whitespace-nowrap text-[#c4c2bc]">
            {content.darkroom.cameraName}
          </span>
          <span className="absolute top-1/2 -right-px h-[28%] w-1.5 -translate-y-1/2 rounded-l-[3px] bg-[linear-gradient(90deg,#8f8d88,#d5d3cd)]" />
        </span>
      </span>
    </span>
  );
}

/**
 * The camera from the front, turned round to face her: the lens, the flash, and the little selfie mirror
 * beside the lens. Turned round, the shutter button is now on the left. A tap on it dives into the lens.
 */
function CameraFront({ ready, lit }: { ready: boolean; lit: boolean }) {
  return (
    <span className="absolute inset-0">
      {/* The same shutter button, seen from the front; here it's the lens she taps, so it doesn't pulse */}
      <span className="camera-shutter absolute -top-[9px] left-[12%] h-4 w-[17%]" />
      <span className="camera-body absolute inset-0 overflow-hidden rounded-[14px]">
        <span className="absolute top-[7px] right-[18%] left-[18%] z-1 h-[7px] rounded-xs bg-[#0b0b0b] shadow-[inset_0_2px_3px_rgba(0,0,0,0.8)]" />
        {/* The flash window on the chrome plate: it fires when the print comes out */}
        <span
          className={`camera-flash absolute top-[9%] right-[8%] z-1 h-[15%] w-[24%] rounded-[3px] ${lit ? "camera-flash-lit" : ""}`}
        />
        <span className="absolute top-[13%] left-[8%] z-1 font-ui text-[8px] font-bold tracking-[0.18em] text-[#5f5d58] uppercase">
          Instant · Auto
        </span>
        {/* The lens; when it's her turn a ring pulses out of it: look in here (the tap zooms into it) */}
        <span className="camera-lens absolute top-[54%] left-1/2 z-1 aspect-square w-[40%] -translate-1/2 rounded-[50%]" />
        {ready && (
          <span className="pointer-events-none absolute top-[54%] left-1/2 z-1 aspect-square w-[40%] -translate-1/2 animate-[lens-ping_1.6s_ease-out_infinite] rounded-[50%] border border-[rgba(248,246,240,0.7)]" />
        )}
        {/* The lamp left of the lens: lit when it's her turn */}
        <span
          className={`absolute top-[52%] left-[13%] z-1 h-[8px] w-[8px] rounded-[50%] ${ready ? "bg-[#f4f1ea] shadow-[0_0_6px_2px_rgba(255,248,230,0.7)]" : "bg-[#3a3a3a] shadow-[inset_0_1px_1px_rgba(0,0,0,0.6)]"}`}
        />
      </span>
    </span>
  );
}
