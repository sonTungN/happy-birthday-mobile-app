import { motion } from 'motion/react'
import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { Seal } from '../components/Seal'
import { audio } from '../lib/audio'
import { capturePointer } from '../lib/geometry'
import type { TicketFace } from '../lib/tickets'
import { fill, formatShortDate, pad } from '../lib/text'

/** Share of the foil that must be scratched off before the card reveals itself */
const REVEAL_AT = 0.5
const BRUSH = 34

interface ScratchCardProps {
  /** What is behind the foil. null until she starts scratching (it's drawn at that moment) */
  face: TicketFace | null
  index: number
  revealed: boolean
  /** She has used up her picks on other tickets: this one can't be scratched */
  locked: boolean
  /** All picks are revealed and this ticket wasn't one of them */
  held: string | null
  /** Tap mode (for when scratching doesn't work): a tap reveals the ticket */
  tapToReveal: boolean
  /** The first scratch on this ticket: it now counts as one of her picks */
  onChoose: () => void
  onReveal: (card: HTMLElement | null) => void
  /** "Click for details" on the revealed feature ticket: opens the full invitation */
  onOpen: () => void
}

const TITLE = 'mt-2 font-display text-[16px] leading-[1.2] font-bold'
const NOTE = 'mt-1.5 font-body text-[15px] leading-[1.25] italic'

/** A ticket hidden under silver foil. Scratch it with a finger. */
export function ScratchCard({ face, index, revealed, locked, held, tapToReveal, onChoose, onReveal, onOpen }: ScratchCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const state = useRef<{ last: { x: number; y: number } | null; checkedAt: number; soundAt: number; done: boolean }>({
    last: null,
    checkedAt: 0,
    soundAt: 0,
    done: false,
  })

  // Paint the foil once
  useEffect(() => {
    const canvas = canvasRef.current
    const card = cardRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !card || !ctx) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = card.clientWidth
    const h = card.clientHeight
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    ctx.scale(dpr, dpr)
    const foil = ctx.createLinearGradient(0, 0, w, h)
    foil.addColorStop(0, '#bdbbb6')
    foil.addColorStop(0.45, '#efefec')
    foil.addColorStop(0.55, '#d3d1cc')
    foil.addColorStop(1, '#a3a19c')
    ctx.fillStyle = foil
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    for (let i = 0; i < 46; i++) ctx.fillRect(((i * 73) % 100) * 0.01 * w, ((i * 41) % 100) * 0.01 * h, 2, 2)
    ctx.fillStyle = '#4b4a48'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '700 10px "Josefin Sans", system-ui, sans-serif'
    ctx.fillText('ADMIT ONE', w / 2, 24)
    ctx.fillText(`No. ${pad(index + 1)}`, w / 2, h - 22)
    ctx.font = '700 15px "Josefin Sans", system-ui, sans-serif'
    ctx.fillText('SCRATCH', w / 2, h / 2 - 2)
    ctx.fillRect(w / 2 - 34, h / 2 + 14, 68, 1)
    ctx.fillRect(w / 2 - 34, h / 2 + 17, 68, 1)
  }, [index])

  const point = (e: ReactPointerEvent) => {
    const r = canvasRef.current?.getBoundingClientRect()
    return r ? { x: e.clientX - r.left, y: e.clientY - r.top } : { x: 0, y: 0 }
  }

  const scratch = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.globalCompositeOperation = 'destination-out'
    ctx.lineWidth = BRUSH
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
  }

  const coverage = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return 0
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
    let clear = 0
    let total = 0
    for (let i = 3; i < data.length; i += 4 * 24) {
      total++
      if (data[i] < 128) clear++
    }
    return total ? clear / total : 0
  }

  const check = () => {
    const s = state.current
    if (s.done || revealed || coverage() < REVEAL_AT) return
    s.done = true
    onReveal(cardRef.current)
  }

  const onDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (revealed || locked) return
    if (tapToReveal) {
      onChoose()
      state.current.done = true
      onReveal(cardRef.current)
      return
    }
    onChoose()
    capturePointer(e)
    const p = point(e)
    state.current.last = p
    scratch(p, { x: p.x + 0.1, y: p.y })
  }

  const onMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const s = state.current
    if (!s.last || revealed) return
    const p = point(e)
    scratch(s.last, p)
    s.last = p
    if (e.timeStamp - s.soundAt > 140) {
      s.soundAt = e.timeStamp
      audio.sfx('fizzle')
    }
    if (e.timeStamp - s.checkedAt > 180) {
      s.checkedAt = e.timeStamp
      check()
    }
  }

  const onUp = () => {
    state.current.last = null
    check()
  }

  const feature = face?.kind === 'event'

  // No click handler on the card itself: the click that ends a scratch would bubble up to it
  return (
    <div ref={cardRef} className="relative aspect-[3/4] drop-shadow-[4px_5px_0_rgba(0,0,0,0.5)]">
      {/* An old cinema ticket with notched sides. The feature ticket (the real plan) is printed in reverse: bone on black */}
      <div
        className={`ticket-notches absolute inset-0 flex flex-col items-center rounded-[3px] px-3 pt-3.5 pb-2.5 ${feature ? 'ticket-feature text-bone' : 'ticket-paper text-ink'}`}
      >
        <div className="flex w-full justify-between font-ui text-[9.5px] font-bold tracking-[0.2em]">
          <span>ADMIT ONE</span>
          <span>No.{pad(index + 1)}</span>
        </div>
        <span className={`mt-4 h-1 w-[46px] border-y ${feature ? 'border-bone/70' : 'border-ink/70'}`} aria-hidden />
        {face?.kind === 'coupon' && (
          <>
            <p className={TITLE}>{fill(face.coupon.title)}</p>
            {face.coupon.note && <p className={`${NOTE} text-smoke`}>{fill(face.coupon.note)}</p>}
          </>
        )}
        {face?.kind === 'event' && (
          <>
            <span className="mt-2.5 font-script text-[19px] leading-none text-silver">{fill(face.event.feature)}</span>
            <p className={TITLE}>{fill(face.event.title)}</p>
            <p className={`${NOTE} text-silver`}>
              {formatShortDate(face.event.date)} · {face.event.time}
            </p>
            {revealed && (
              <motion.button
                type="button"
                // A small underlined line, not a big button
                className="mt-2 animate-[ticket-beckon_2.2s_ease-in-out_infinite] rounded-none border-0 border-b border-bone/70 bg-transparent px-0.5 pt-1 pb-0.5 font-ui text-[9px] font-bold tracking-[0.16em] whitespace-nowrap text-bone uppercase"
                onClick={onOpen}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                Click for details
              </motion.button>
            )}
          </>
        )}
        <div
          className={`mt-auto flex w-full justify-end gap-1.5 border-t border-dashed pt-2 font-ui text-[8.5px] font-bold tracking-[0.12em] uppercase ${feature ? 'border-bone/35 text-silver' : 'border-ink/35 text-smoke'}`}
        >
          <span>{fill('For {name}')}</span>
        </div>
        {/* The round seal, bottom-left corner, over the dashed rule */}
        {revealed && (
          <Seal
            className={`absolute bottom-[5px] left-[5px] h-12 w-12 ${feature ? 'text-bone/90 mix-blend-normal' : 'text-ink/80 mix-blend-multiply'}`}
            word={feature ? 'RESERVED' : 'CLAIMED'}
            ring={fill('ADMIT ONE · FOR {name} · {age} ·')}
          />
        )}
      </div>
      {/* The silver foil (painted in the canvas above), cut to the same ticket shape */}
      <canvas
        ref={canvasRef}
        className={`ticket-notches absolute inset-0 h-full w-full touch-none rounded-[3px] transition-opacity duration-600 ${revealed ? 'pointer-events-none opacity-0' : ''} ${locked && !revealed ? 'pointer-events-none brightness-60' : ''}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        aria-label={`Scratch ticket ${index + 1}`}
      />
      {held && (
        <motion.span
          // HELD OVER: stamped on the foil of the tickets she didn't pick (opaque, so it covers "SCRATCH")
          className="pointer-events-none absolute top-[49%] left-1/2 z-2 -translate-1/2 rounded-[3px] border-[2.5px] border-white/90 bg-[#1c1c1c] px-3 pt-[9px] pb-1.5 font-ui text-[14px] font-bold tracking-[0.18em] whitespace-nowrap text-white mix-blend-normal"
          initial={{ scale: 2.4, opacity: 0, rotate: -4 }}
          animate={{ scale: 1, opacity: 1, rotate: -12 }}
          transition={{ type: 'spring', stiffness: 300, damping: 16, delay: 0.2 + index * 0.08 }}
        >
          {held}
        </motion.span>
      )}
    </div>
  )
}
