import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { EnvelopeArt } from '../components/EnvelopeArt'
import { content } from '../content'
import { useWindOn } from '../lib/advance'
import { audioUrl, photoUrl } from '../lib/assets'
import { audio } from '../lib/audio'
import { usePaperSurface, useTimers } from '../lib/hooks'
import { fill } from '../lib/text'

type Step = 'sealed' | 'opening' | 'reading'

/**
 * The end of the candles scene: the envelope from the cake. Peel off the wax seal, open it, read the letter.
 * Reaching the signature lights up the wind-on wheel.
 */
export default function Letter() {
  const later = useTimers()
  const [step, setStep] = useState<Step>('sealed')

  const open = () => {
    if (step !== 'sealed') return
    setStep('opening')
    // Paper, not a crack: the flap lifts, then the letter unfolds
    audio.sfx('paper')
    later(() => audio.sfx('unfold'), 1750)
    later(() => setStep('reading'), 2100)
  }

  return (
    <div className="film-bg absolute inset-0 overflow-hidden">
      <AnimatePresence mode="wait">
        {step !== 'reading' ? (
          <motion.div
            key="envelope"
            className="absolute inset-0 flex flex-col items-center justify-center gap-[34px] px-5 pt-[calc(var(--safe-top)+60px)] pb-[calc(var(--safe-bottom)+40px)]"
            exit={{ opacity: 0, y: 40, scale: 0.92 }}
            transition={{ duration: 0.45 }}
          >
            <motion.h1 className="max-w-[320px] text-center font-display text-[28px] leading-[1.2] font-bold" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              {fill(content.letter.title)}
            </motion.h1>
            <motion.div className="w-[min(84%,360px)]" initial={{ scale: 0.6, rotate: -8, opacity: 0 }} animate={{ scale: 1, rotate: -2, opacity: 1 }} transition={{ type: 'spring', stiffness: 120, damping: 14 }}>
              <EnvelopeArt initials={content.initials} open={step === 'opening'} lifted={step === 'opening'} onSeal={open} />
            </motion.div>
          </motion.div>
        ) : (
          <motion.div key="letter" className="absolute inset-0" initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ type: 'spring', stiffness: 80, damping: 17 }}>
            <LetterPaper />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function LetterPaper() {
  const { letter } = content
  const voice = audioUrl(letter.voiceNote)
  const image = letter.image ? photoUrl(letter.image) : null
  const [typed, setTyped] = useState(!image)
  const [read, setRead] = useState(false)
  useWindOn(read)
  // The wind-on label sits over the paper: print it in ink
  usePaperSurface()

  return (
    <div className="absolute inset-0 touch-pan-y overflow-y-auto overscroll-contain px-3.5 pt-[calc(var(--safe-top)+64px)] pb-[calc(var(--safe-bottom)+24px)] [-webkit-overflow-scrolling:touch]">
      {/* Aged writing paper: foxed edges, faint rules (effects.css: .letter-paper) */}
      <article className="letter-paper relative min-h-[calc(100%-90px)] rounded-xs px-[26px] pt-9 pb-10 text-ink">
        {voice && <VoiceNote src={voice} />}
        {image && (
          <button
            type="button"
            className="mb-[18px] ml-auto block rounded-xs border border-ink/50 bg-transparent px-3 pt-[7px] pb-[5px] font-ui text-[11px] font-bold tracking-[0.14em] text-ink uppercase"
            onClick={() => setTyped((v) => !v)}
          >
            {typed ? 'See the handwritten letter' : 'Read the typed version'}
          </button>
        )}
        {image && !typed ? (
          <img className="mt-2 h-auto w-full rounded-xs [filter:var(--photo-filter)]" src={image} alt="Handwritten letter" />
        ) : (
          <>
            <motion.p className="font-script text-[40px] leading-[44px]" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              {fill(letter.greeting)}
            </motion.p>
            {letter.paragraphs.map((paragraph, i) => (
              <motion.p
                key={i}
                className="mt-[34px] font-body text-[21px] leading-[34px] whitespace-pre-line"
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.8, delay: i < 2 ? 0.9 + i * 0.6 : 0.1 }}
              >
                {fill(paragraph)}
              </motion.p>
            ))}
            <motion.p className="mt-[34px] font-body text-[21px] leading-[34px] italic" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
              {fill(letter.closing)}
            </motion.p>
            <motion.p
              className="mt-1 font-script text-[46px] leading-[1.2]"
              initial={{ clipPath: 'inset(0 100% 0 0)' }}
              whileInView={{ clipPath: 'inset(0 0% 0 0)' }}
              viewport={{ once: true }}
              transition={{ duration: 1.6, ease: 'easeInOut', delay: 0.3 }}
            >
              {fill(letter.signature)}
            </motion.p>
          </>
        )}
      </article>
      {/* Reaching the end of the letter lights up the wind-on wheel */}
      <motion.div className="h-px" onViewportEnter={() => setRead(true)} viewport={{ once: true }} aria-hidden />
    </div>
  )
}

function VoiceNote({ src }: { src: string }) {
  const ref = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => () => audio.release('voice'), [])

  const toggle = () => {
    const el = ref.current
    if (!el) return
    if (el.paused) {
      audio.hold('voice')
      void el.play().catch(() => audio.release('voice'))
    } else {
      el.pause()
    }
  }

  const stopped = () => {
    setPlaying(false)
    audio.release('voice')
  }

  return (
    <div className="mb-[22px] flex items-center gap-3 rounded-[3px] border border-ink/20 bg-black/5 py-2.5 pr-3.5 pl-2.5">
      <button
        type="button"
        className="grid h-10 w-10 flex-none place-items-center rounded-[50%] border-0 bg-ink p-0 text-[14px] text-white"
        onClick={toggle}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? '❚❚' : '▶'}
      </button>
      <div className="flex flex-1 flex-col gap-1.5 font-body text-[17px] italic">
        <span>{fill('Listen to {sender} read it')}</span>
        <span className="h-[3px] overflow-hidden bg-black/12">
          <span className="block h-full bg-ink" style={{ width: `${progress * 100}%` }} />
        </span>
      </div>
      <audio
        ref={ref}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={stopped}
        onEnded={() => {
          stopped()
          setProgress(0)
        }}
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime / (e.currentTarget.duration || 1))}
      />
    </div>
  )
}
