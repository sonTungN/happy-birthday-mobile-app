import { AnimatePresence, motion, type PanInfo } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Polaroid } from '../components/Polaroid'
import { content } from '../content'
import { photoUrl } from '../lib/assets'
import { audio } from '../lib/audio'
import { hapticRef } from '../lib/haptics'
import { keepPrint, renderPrint } from '../lib/selfie'
import { formatShortDate } from '../lib/text'
import type { PhotoEntry } from '../types'

interface PhotoViewerProps {
  /** The prints, in the order they sit on the board */
  photos: PhotoEntry[]
  index: number
  onIndex: (index: number) => void
  /** Position of her own print, the one she can save (-1: none) */
  keepAt: number
  onClose: () => void
}

/** How far a swipe has to go (px), or how fast (px/s), to bring the next print */
const SWIPE = 60
const FLICK = 500

/** One print, big. Tap it to turn it over and read the back; swipe sideways for the next one. */
export function PhotoViewer({ photos, index, onIndex, keepAt, onClose }: PhotoViewerProps) {
  const [flipped, setFlipped] = useState(false)
  /** Which way the last swipe went, so the next print slides in from that side */
  const [dir, setDir] = useState(0)
  const swiped = useRef(false)
  /** Her print, drawn as a file ahead of time so the share sheet opens the moment she taps */
  const [rendered, setRendered] = useState<{ of: PhotoEntry; blob: Blob } | null>(null)
  const photo = photos[index]
  const keepable = index === keepAt
  const print = rendered && rendered.of === photo ? rendered.blob : null

  useEffect(() => {
    if (!keepable) return
    let live = true
    renderPrint({ src: photoUrl(photo.file), caption: photo.title, date: photo.date })
      .then((blob) => {
        if (live) setRendered({ of: photo, blob })
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [keepable, photo])

  const go = (next: number) => {
    if (next < 0 || next >= photos.length || next === index) return
    setDir(next > index ? 1 : -1)
    setFlipped(false)
    audio.sfx('paper')
    onIndex(next)
  }

  const onDragEnd = (_: unknown, info: PanInfo) => {
    // The tap that ends a swipe must not flip the print or close the viewer
    swiped.current = true
    window.setTimeout(() => {
      swiped.current = false
    }, 350)
    if (info.offset.x < -SWIPE || info.velocity.x < -FLICK) go(index + 1)
    else if (info.offset.x > SWIPE || info.velocity.x > FLICK) go(index - 1)
  }

  return (
    <motion.div
      className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-[18px] bg-[rgba(5,5,5,0.78)] p-6 backdrop-blur-[6px]"
      onClick={() => {
        if (!swiped.current) onClose()
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-[min(80%,330px)] perspective-[1400px]"
        initial={{ scale: 0.6, rotate: -8, y: 40 }}
        animate={{ scale: 1, rotate: 0, y: 0 }}
        exit={{ scale: 0.6, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 20 }}
      >
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div
            key={index}
            ref={hapticRef}
            className="relative cursor-pointer touch-pan-y transform-3d"
            custom={dir}
            variants={{
              enter: (d: number) => ({ x: d * 90, opacity: 0, rotate: d * 5 }),
              center: { x: 0, opacity: 1, rotate: 0 },
              exit: (d: number) => ({ x: -d * 90, opacity: 0, rotate: -d * 5 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: 'easeOut' }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.45}
            dragSnapToOrigin
            onDragEnd={onDragEnd}
            onClick={(e) => {
              e.stopPropagation()
              if (swiped.current) return
              audio.sfx('paper')
              setFlipped((f) => !f)
            }}
          >
            <motion.div className="relative transform-3d" animate={{ rotateY: flipped ? 180 : 0 }} transition={{ type: 'spring', stiffness: 150, damping: 19 }}>
              <div className="backface-hidden">
                <Polaroid src={photoUrl(photo.file)} alt={photo.title} caption={photo.title} date={photo.date} focus={photo.focus} />
              </div>
              {/* The back of an old print: aged paper, faint rules, a note in ink (effects.css: .photo-back) */}
              <div className="photo-back absolute inset-0 flex [transform:rotateY(180deg)] flex-col rounded-xs px-[9%] pt-[11%] pb-[9%] text-ink backface-hidden">
                <p className="font-ui text-[13px] font-bold tracking-[0.18em] text-[#3a3a3a] uppercase">{formatShortDate(photo.date)}</p>
                {photo.place && <p className="mt-1 font-body text-[17px] text-[#595754] italic">{photo.place}</p>}
                <p className="mt-4 flex-1 font-body text-[21px] leading-[32px]">{photo.note}</p>
                <p className="self-end font-script text-[28px] text-[#2a2a2a]">— {photo.signedBy ?? content.sender}</p>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <div className="flex flex-col items-center gap-1 text-center">
        <p className="font-body text-[18px] italic">{flipped ? 'Tap to flip it back' : 'Tap the photo to flip it over'}</p>
        {photos.length > 1 && (
          <p className="font-ui text-[11px] font-bold tracking-[0.18em] text-white/55 uppercase">
            {index + 1} of {photos.length} · swipe for the next
          </p>
        )}
      </div>

      {keepable && (
        <button
          type="button"
          className="btn btn-light"
          ref={hapticRef}
          disabled={!print}
          onClick={(e) => {
            e.stopPropagation()
            if (print) void keepPrint(print, 'reel-twenty-two.jpg')
          }}
        >
          {content.darkroom.selfie.keep}
        </button>
      )}
      <button type="button" className="btn-ghost" onClick={onClose}>
        Close
      </button>
    </motion.div>
  )
}
