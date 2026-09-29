import { motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef } from "react";
import { audio } from "../lib/audio";
import { downloadIcs } from "../lib/calendar";
import { hapticRef } from "../lib/haptics";
import { fill, formatLongDate } from "../lib/text";
import type { PlanEvent } from "../types";

/** The invitation behind the feature ticket: the real plan, developing out of the dark. */
export function Invitation({
  event,
  onClose,
}: {
  event: PlanEvent;
  onClose: () => void;
}) {
  const ticketRef = useRef<HTMLElement>(null);
  const stubRef = useRef<HTMLDivElement>(null);

  // Put the side notches exactly on the tear-off line, whatever the text length
  useLayoutEffect(() => {
    const ticket = ticketRef.current;
    const stub = stubRef.current;
    if (ticket && stub)
      ticket.style.setProperty("--notch", `${stub.offsetTop}px`);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => audio.sfx("unfold"), 300);
    return () => window.clearTimeout(id);
  }, []);

  const rows: [string, string][] = [
    ["Date", formatLongDate(event.date)],
    ["Time", event.time],
    ["Place", event.place],
    ["Dress", event.dress],
  ];

  return (
    <motion.div
      className="film-bg absolute inset-0 z-20 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 flex touch-pan-y flex-col items-center overflow-y-auto overscroll-contain px-5 pt-[calc(var(--safe-top)+70px)] pb-[calc(var(--safe-bottom)+20px)] [-webkit-overflow-scrolling:touch]">
        <motion.p
          className="mb-[18px] font-script text-[36px] text-silver"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {fill(event.feature)}
        </motion.p>

        <motion.article
          ref={ticketRef}
          // A large old theatre ticket: notched sides, double inner rule, a tear-off stub (effects.css: .invitation-ticket)
          className="invitation-ticket relative w-full max-w-[360px] rounded-[3px] px-[22px] pt-5 pb-4 text-ink"
          initial={{ filter: "brightness(0) blur(6px)", y: 24, rotate: -4 }}
          animate={{ filter: "brightness(1) blur(0px)", y: 0, rotate: -1.2 }}
          transition={{ duration: 2.6, ease: "easeOut" }}
        >
          <div className="flex justify-between gap-2.5 border-b-[3px] border-double border-ink/70 pb-2.5 font-ui text-[10px] font-bold tracking-[0.18em] uppercase">
            <span>{fill(event.kicker)}</span>
            <span>No. {fill("{age}")}</span>
          </div>
          <h1 className="mt-4 mb-3.5 text-center font-display text-[30px] leading-[1.12] font-bold text-balance">
            {fill(event.title)}
          </h1>
          <dl className="m-0 grid gap-2 border-t border-ink/35 pt-3 pb-3.5">
            {rows.map(([label, value]) => (
              <div
                key={label}
                className="grid grid-cols-[58px_1fr] items-baseline gap-2.5"
              >
                <dt className="font-ui text-[10px] font-bold tracking-[0.18em] text-smoke uppercase">
                  {label}
                </dt>
                <dd className="m-0 font-body text-[19px] leading-[1.3]">
                  {fill(value)}
                </dd>
              </div>
            ))}
          </dl>
          {/* Below the perforation */}
          <div
            ref={stubRef}
            className="border-t-2 border-dashed border-ink/40 pt-3.5"
          >
            <p className="text-center font-body text-[19px] leading-[1.35] italic">
              {fill(event.note)}
            </p>
            <div className="mt-3.5 flex justify-between gap-2.5 font-ui text-[10px] font-bold tracking-[0.18em] text-smoke uppercase">
              <span>{fill("For {name}")}</span>
              <span>Keep this ticket</span>
            </div>
          </div>
        </motion.article>

        <motion.div
          className="mt-[26px] flex flex-col items-center gap-2.5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.4 }}
        >
          <button
            type="button"
            className="btn btn-light"
            ref={hapticRef}
            onClick={() => downloadIcs(event)}
          >
            Add to calendar
          </button>
          {event.mapUrl && (
            <a
              className="btn btn-outline"
              href={event.mapUrl}
              target="_blank"
              rel="noreferrer"
            >
              Directions
            </a>
          )}
          <button type="button" className="btn-ghost" onClick={onClose}>
            Back to the tickets
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
