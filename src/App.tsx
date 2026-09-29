import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Candles from './chapters/Candles'
import Darkroom from './chapters/Darkroom'
import Finale from './chapters/Finale'
import Invite from './chapters/Invite'
import Lock from './chapters/Lock'
import Newspaper from './chapters/Newspaper'
import { ErrorBoundary } from './components/ErrorBoundary'
import { FilmAdvance } from './components/FilmAdvance'
import { Leader } from './components/Leader'
import { FullscreenAsk, InstallHint, ResumeOverlay } from './components/Overlays'
import { AdvanceContext } from './lib/advance'
import { preloadPhotos } from './lib/assets'
import { audio } from './lib/audio'
import { bindConfetti } from './lib/confetti'
import { enterFullscreen, fullscreenWay, useFullscreen } from './lib/fullscreen'
import { params, useMuted } from './lib/hooks'
import { storage } from './lib/storage'

const CHAPTERS = ['lock', 'invite', 'news', 'darkroom', 'candles', 'finale'] as const
type ChapterId = (typeof CHAPTERS)[number]

/** The classic leader countdown that plays once, when the film starts */
const INTRO_COUNTDOWN = [5, 4, 3, 2]

/** Old or inner names that live inside another chapter (for ?chapter=… while testing) */
const ALIASES: Record<string, ChapterId> = { gazette: 'news', cake: 'candles', letter: 'candles' }

/** Where to start: ?chapter=… for testing, otherwise wherever the roll was left off. */
function initialState(): { index: number; resume: boolean } {
  if (params.has('reset')) {
    storage.remove('chapter')
    storage.remove('unlocked')
    storage.remove('darkroom')
  }
  const asked = params.get('chapter') ?? ''
  const forced = CHAPTERS.indexOf(ALIASES[asked] ?? (asked as ChapterId))
  if (forced >= 0) return { index: forced, resume: forced >= 2 }
  if (storage.get('unlocked') !== '1') return { index: 0, resume: false }
  const saved = Number(storage.get('chapter') ?? 1)
  const index = Number.isInteger(saved) && saved >= 1 && saved < CHAPTERS.length ? saved : 1
  return { index, resume: index >= 2 }
}

export default function App() {
  const [start] = useState(initialState)
  const [index, setIndex] = useState(start.index)
  const [resume, setResume] = useState(start.resume)
  const [rollEnded, setRollEnded] = useState(false)
  const [leader, setLeader] = useState<number[] | null>(null)
  const [armed, setArmed] = useState(false)
  const armedAction = useRef<(() => void) | null>(null)
  const pending = useRef<number | null>(null)
  const confettiRef = useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()
  const chapter = CHAPTERS[index]

  // Asked once, in a browser: watch it full screen (on an iPhone, that means the Home Screen)
  const [askFull, setAskFull] = useState(() => storage.get('fullscreenAsked') !== '1' && fullscreenWay() !== 'none')
  const [install, setInstall] = useState(false)
  const dismissAsk = () => {
    storage.set('fullscreenAsked', '1')
    setAskFull(false)
  }
  const acceptAsk = () => {
    dismissAsk()
    if (fullscreenWay() === 'api') void enterFullscreen()
    else setInstall(true)
  }

  useEffect(() => {
    bindConfetti(confettiRef.current)
    const id = window.setTimeout(() => {
      preloadPhotos()
      preloadFonts()
    }, 800)
    return () => {
      window.clearTimeout(id)
      bindConfetti(null)
    }
  }, [])

  useEffect(() => {
    if (index >= 1) storage.set('chapter', String(index))
    // From the photos onwards the background music plays (it starts on the next tap if sound is still locked)
    if (index >= 2) audio.playMusic()
  }, [index])

  // Swap chapters while the leader covers the screen
  useEffect(() => {
    if (!leader) return
    const id = window.setTimeout(() => {
      if (pending.current === null) return
      setIndex(pending.current)
      pending.current = null
    }, 250)
    return () => window.clearTimeout(id)
  }, [leader])

  const goTo = useCallback(
    (next: number, intro = false) => {
      const target = Math.max(0, Math.min(next, CHAPTERS.length - 1))
      setRollEnded(false)
      if (reduced) {
        setIndex(target)
        return
      }
      pending.current = target
      audio.sfx('wind')
      setLeader(intro ? INTRO_COUNTDOWN : [CHAPTERS.length - target])
    },
    [reduced],
  )

  const next = useCallback(() => goTo(index + 1), [goTo, index])
  const startFilm = useCallback(() => goTo(1, true), [goTo])
  // Starting over empties the darkroom too, so the roll is shot again from the first frame
  const restart = useCallback(() => {
    storage.remove('darkroom')
    goTo(1)
  }, [goTo])
  const endRoll = useCallback(() => setRollEnded(true), [])
  const leaderDone = useCallback(() => setLeader(null), [])

  // The wind-on wheel: a finished chapter arms it (see useWindOn), winding it moves the film on
  const arm = useCallback((action?: () => void) => {
    armedAction.current = action ?? null
    setArmed(true)
  }, [])
  const disarm = useCallback(() => {
    armedAction.current = null
    setArmed(false)
  }, [])
  const advance = useMemo(() => ({ arm, disarm }), [arm, disarm])
  const wind = useCallback(() => {
    const action = armedAction.current
    disarm()
    if (action) action()
    else next()
  }, [disarm, next])

  const frame = rollEnded ? 0 : CHAPTERS.length - index

  return (
    <MotionConfig reducedMotion="user">
      {/* The screen. On a laptop it becomes a phone-sized frame (effects.css: .app-stage) */}
      <main className="app-stage">
        <AdvanceContext.Provider value={advance}>
          <motion.section key={chapter} className="absolute inset-0 overflow-hidden bg-[#0b0b0b]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
            <ErrorBoundary onSkip={next}>
              {chapter === 'lock' && <Lock onDone={startFilm} />}
              {chapter === 'invite' && <Invite onDone={next} />}
              {chapter === 'news' && <Newspaper />}
              {chapter === 'darkroom' && <Darkroom />}
              {/* Candles → cutting the cake → the envelope inside → the letter: one continuous scene */}
              {chapter === 'candles' && <Candles />}
              {chapter === 'finale' && <Finale onDone={endRoll} onRestart={restart} />}
            </ErrorBoundary>
          </motion.section>
        </AdvanceContext.Provider>

        <FilmAdvance value={frame} total={CHAPTERS.length} armed={armed && !leader} onWind={wind} />
        <SoundToggle />
        <FullscreenToggle onInstall={() => setInstall(true)} />
        <canvas ref={confettiRef} className="pointer-events-none absolute inset-0 z-60 h-full w-full" />

        <AnimatePresence>{leader && <Leader key={leader.join('-')} numbers={leader} onDone={leaderDone} />}</AnimatePresence>

        <AnimatePresence>
          {resume && (
            <ResumeOverlay
              frame={frame}
              onContinue={() => setResume(false)}
              onRestart={() => {
                setResume(false)
                restart()
              }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>{askFull && <FullscreenAsk way={fullscreenWay() === 'api' ? 'api' : 'homescreen'} onAccept={acceptAsk} onDismiss={dismissAsk} />}</AnimatePresence>
        <AnimatePresence>{install && <InstallHint onClose={() => setInstall(false)} />}</AnimatePresence>

        <FilmFx />
      </main>
      <p className="hidden desk:fixed desk:right-0 desk:bottom-2.5 desk:left-0 desk:block desk:text-center desk:font-body desk:text-[14px] desk:text-white/45 desk:italic">
        Best viewed on a phone
      </p>
    </MotionConfig>
  )
}

/** Fetches the newspaper's fonts early, so its page never lands in a fallback font */
function preloadFonts() {
  for (const font of ['640 60px Newsreader', 'italic 400 16px Newsreader', '46px Chomsky', '600 23px Caveat']) {
    void document.fonts.load(font, 'Aễ').catch(() => {})
  }
}

/** Old projected film: grain, a flickering lamp, scratches, dust and burnt edges. Always on top, never catches a tap. */
function FilmFx() {
  return (
    <div className="pointer-events-none absolute inset-0 z-90 overflow-hidden" aria-hidden>
      <div className="fx-grain absolute -inset-[60px] opacity-16" />
      {/* The projector lamp breathing */}
      <div className="absolute inset-0 animate-[fx-flicker_3.4s_steps(1)_infinite] bg-[#fff] opacity-0" />
      {/* Scratches on the print, a light one and a dark one */}
      <span className="absolute top-0 bottom-0 left-[30%] w-px animate-[fx-scratch_4.6s_steps(1)_infinite] bg-[rgba(255,255,255,0.4)] opacity-0" />
      <span className="absolute top-0 bottom-0 left-[30%] w-px animate-[fx-scratch_6.3s_steps(1)_-2s_infinite] bg-[rgba(0,0,0,0.45)] opacity-0" />
      {/* Specks of dust */}
      <span className="absolute top-[30%] left-[20%] h-[3px] w-[3px] animate-[fx-dust_2.9s_steps(1)_infinite] rounded-[50%] bg-[rgba(0,0,0,0.65)] opacity-0" />
      <span className="absolute top-[30%] left-[20%] h-[3px] w-[3px] animate-[fx-dust_3.7s_steps(1)_-1.3s_infinite] rounded-[50%] bg-[rgba(255,255,255,0.75)] opacity-0" />
      {/* Burnt-out edges */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_78%_at_50%_45%,transparent_58%,rgba(0,0,0,0.42)_100%)]" />
    </div>
  )
}

/** Next to the sound button: full screen on and off. On an iPhone's Safari it shows how to add the roll to the Home Screen instead. */
function FullscreenToggle({ onInstall }: { onInstall: () => void }) {
  const { full, toggle } = useFullscreen()
  const way = fullscreenWay()
  if (way === 'none') return null
  return (
    <button
      type="button"
      className="absolute top-[calc(var(--safe-top)+12px)] left-[62px] z-50 grid h-10 w-10 place-items-center rounded-[50%] border border-white/40 bg-[rgba(10,10,10,0.5)] p-0 text-white backdrop-blur-[8px]"
      onClick={way === 'api' ? toggle : onInstall}
      aria-label={way === 'homescreen' ? 'Open full screen: add to the Home Screen' : full ? 'Leave full screen' : 'Full screen'}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {full ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
      </svg>
    </button>
  )
}

function SoundToggle() {
  const muted = useMuted()
  return (
    <button
      type="button"
      className="absolute top-[calc(var(--safe-top)+12px)] left-3.5 z-50 grid h-10 w-10 place-items-center rounded-[50%] border border-white/40 bg-[rgba(10,10,10,0.5)] p-0 text-white backdrop-blur-[8px]"
      onClick={() => audio.setMuted(!muted)}
      aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z" fill="currentColor" />
        {muted ? (
          <path d="M16 9.5l5 5m0-5l-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        ) : (
          <path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        )}
      </svg>
    </button>
  )
}
