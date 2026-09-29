import { useEffect, useRef, useState } from 'react'
import { audio } from '../lib/audio'
import { hapticRef } from '../lib/haptics'
import { CameraError, dataUrlToBlob, hasTorch, keepPrint, openCamera, setTorch as setLamp, snapshot, stopStream, type CameraFault, type Facing } from '../lib/selfie'

interface SelfieCameraProps {
  /** She printed it: the picture (a data URL) and her line for the back of the print */
  onPrint: (src: string, message: string) => void
  /** No camera to be had: the print comes out blank */
  onBlank: () => void
  /** Back to the darkroom without a picture */
  onClose: () => void
}

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))
/** Room on the back of a print */
const MESSAGE_MAX = 90
const ZOOMS = [1, 2]
/** A round button on black */
const ROUND = 'grid place-items-center rounded-[50%] border-0 p-0 text-white'

/**
 * The phone's camera, the way a camera app shows it: a square viewfinder, a shutter, flash, zoom, and the other
 * camera for when someone else takes the picture. Once it's taken she writes a line for the back of the print
 * and prints it, or keeps the photo as it is.
 */
export function SelfieCamera({ onPrint, onBlank, onClose }: SelfieCameraProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [facing, setFacing] = useState<Facing>('user')
  const [zoom, setZoom] = useState(1)
  const [flash, setFlash] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [fault, setFault] = useState<CameraFault | null>(null)
  /** The back camera has a lamp the browser can switch on (Android does, iPhones don't let a page) */
  const [torch, setTorch] = useState(false)
  const [flashing, setFlashing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [shot, setShot] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState(false)
  const mirror = facing === 'user'
  const line = message.trim()

  // Open the camera; again when she switches cameras, or tries again after the browser said no
  useEffect(() => {
    let live = true
    let stream: MediaStream | null = null
    openCamera(facing)
      .then(async (opened) => {
        if (!live) {
          stopStream(opened)
          return
        }
        stream = opened
        streamRef.current = opened
        const video = videoRef.current
        if (video) {
          video.srcObject = opened
          await video.play().catch(() => {})
        }
        setTorch(hasTorch(opened))
        setFault(null)
      })
      .catch((err: unknown) => {
        if (live) setFault(err instanceof CameraError ? err.reason : 'failed')
      })
    return () => {
      live = false
      stopStream(stream)
      streamRef.current = null
    }
  }, [facing, attempt])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const capture = async () => {
    const video = videoRef.current
    if (busy || !video || video.videoWidth === 0) return
    setBusy(true)
    try {
      if (flash && mirror) {
        // The screen is the flash for the front camera: white for a moment before the picture
        setFlashing(true)
        await wait(420)
      } else if (flash && torch) {
        await setLamp(streamRef.current, true)
        await wait(150)
      }
      audio.sfx('shutter')
      setShot(snapshot(video, { mirror, zoom }))
    } catch {
      /* no picture this time: she can try again */
    } finally {
      if (flash && torch) void setLamp(streamRef.current, false)
      setFlashing(false)
      setBusy(false)
    }
  }

  /** The flash button does something on this camera: the screen for the front one, a lamp for the back one */
  const canFlash = mirror || torch

  const switchCamera = () => {
    audio.sfx('tap')
    setZoom(1)
    setFacing((f) => (f === 'user' ? 'environment' : 'user'))
  }

  const cycleZoom = () => {
    audio.sfx('tap')
    setZoom((z) => ZOOMS[(ZOOMS.indexOf(z) + 1) % ZOOMS.length])
  }

  const caption = shot
    ? line
      ? 'Ready to print.'
      : 'Add a line for the back of the print, then print it.'
    : fault
      ? ''
      : 'The ninth frame: you, today.'

  return (
    <div className="absolute inset-0 flex flex-col bg-[#050505] pt-[calc(var(--safe-top)+62px)] pb-[calc(var(--safe-bottom)+18px)]">
      <div className="flex items-center justify-between px-4">
        <span className="font-ui text-[11px] font-bold tracking-[0.22em] text-white/55 uppercase">The ninth frame</span>
        <button type="button" className={`${ROUND} h-10 w-10 bg-white/12`} onClick={onClose} aria-label="Back to the darkroom">
          <CloseIcon />
        </button>
      </div>

      {/* The viewfinder: a square, like the print it becomes */}
      <div className="relative mx-auto mt-3 aspect-square w-[min(100%-28px,430px)] overflow-hidden rounded-[36px] bg-[#111]">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
          style={{ transform: `scale(${mirror ? -zoom : zoom}, ${zoom})` }}
        />
        {shot && <img src={shot} alt="" className="absolute inset-0 h-full w-full object-cover" />}

        {!shot && !fault && (
          <>
            {canFlash && (
              <button
                type="button"
                className={`${ROUND} absolute top-4 left-4 h-11 w-11 ${flash ? 'bg-white text-ink' : 'bg-white/20'}`}
                onClick={() => {
                  audio.sfx('tap')
                  setFlash((f) => !f)
                }}
                aria-label={flash ? 'Flash on' : 'Flash off'}
                aria-pressed={flash}
              >
                <BoltIcon />
              </button>
            )}
            <button type="button" className={`${ROUND} absolute top-4 right-4 h-11 w-11 bg-white/20 font-ui text-[13px] font-bold`} onClick={cycleZoom} aria-label={`Zoom ${zoom}×`}>
              {zoom}×
            </button>
          </>
        )}

        {shot &&
          (editing ? (
            <input
              ref={inputRef}
              value={message}
              maxLength={MESSAGE_MAX}
              placeholder="Add a message"
              enterKeyHint="done"
              onChange={(e) => setMessage(e.target.value)}
              onBlur={() => setEditing(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
              }}
              className="absolute top-4 left-1/2 w-[min(84%,320px)] -translate-x-1/2 rounded-full border border-white/35 bg-[rgba(15,15,15,0.82)] px-4 py-2 text-center font-body text-[17px] text-white outline-none backdrop-blur-[6px] select-text placeholder:text-white/55"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="absolute bottom-4 left-1/2 max-w-[85%] -translate-x-1/2 truncate rounded-full border-0 bg-[rgba(15,15,15,0.72)] px-4 py-2 font-body text-[17px] text-white backdrop-blur-[6px]"
            >
              {line || 'Add a message'}
            </button>
          ))}

        {fault && !shot && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="font-display text-[22px] italic">The camera is off here.</p>
            <p className="font-body text-[17px] leading-[1.4] text-white/75 italic">
              {fault === 'insecure'
                ? 'It needs a secure address (https).'
                : fault === 'denied'
                  ? 'Allow the camera for this site in Settings, then try again.'
                  : 'This browser can’t open the camera. Try Safari.'}
            </p>
            <div className="mt-2 flex gap-3">
              <button type="button" className="btn btn-light" onClick={() => setAttempt((a) => a + 1)}>
                Try again
              </button>
              <button type="button" className="btn btn-outline" onClick={onBlank}>
                Leave it blank
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="mt-4 min-h-[24px] px-8 text-center font-body text-[17px] text-white/72 italic">{caption}</p>

      <div className="mt-auto flex items-center justify-around px-8">
        {shot ? (
          <>
            <button type="button" className={`${ROUND} h-12 w-12 bg-white/12`} ref={hapticRef} onClick={() => setShot(null)} aria-label="Take it again">
              <CloseIcon />
            </button>
            <button
              type="button"
              className={`${ROUND} h-[78px] w-[78px] bg-bone text-ink disabled:opacity-35`}
              ref={hapticRef}
              disabled={!line}
              onClick={() => {
                audio.sfx('paper')
                onPrint(shot, line)
              }}
              aria-label="Print it"
            >
              <PrintIcon />
            </button>
            <button type="button" className={`${ROUND} h-12 w-12 bg-white/12`} ref={hapticRef} onClick={() => void keepPrint(dataUrlToBlob(shot), 'reel-twenty-two-photo.jpg')} aria-label="Save the photo">
              <DownloadIcon />
            </button>
          </>
        ) : (
          <>
            <span className="h-12 w-12" aria-hidden />
            <button type="button" className={`${ROUND} h-[78px] w-[78px] border-[4px] border-white/95 bg-transparent`} ref={hapticRef} disabled={!!fault} onClick={() => void capture()} aria-label="Take the picture">
              <span className="block h-[60px] w-[60px] rounded-[50%] bg-white" />
            </button>
            <button type="button" className={`${ROUND} h-12 w-12 bg-white/12`} ref={hapticRef} onClick={switchCamera} aria-label="Switch camera">
              <SwitchIcon />
            </button>
          </>
        )}
      </div>

      {flashing && <div className="absolute inset-0 z-10 bg-white" aria-hidden />}
    </div>
  )
}

const ICON = { viewBox: '0 0 24 24', className: 'h-6 w-6', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const

function CloseIcon() {
  return (
    <svg {...ICON}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

function BoltIcon() {
  return (
    <svg {...ICON} fill="currentColor" stroke="none">
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
    </svg>
  )
}

function SwitchIcon() {
  return (
    <svg {...ICON}>
      <path d="M4 12a8 8 0 0 1 13.7-5.7L20 8M20 3.5V8h-4.5" />
      <path d="M20 12a8 8 0 0 1-13.7 5.7L4 16M4 20.5V16h4.5" />
    </svg>
  )
}

/** A print coming out of the slot */
function PrintIcon() {
  return (
    <svg {...ICON} className="h-7 w-7">
      <path d="M7 8V3h10v5" />
      <rect x="4" y="8" width="16" height="7" rx="1.5" />
      <path d="M8 12h8v9H8z" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg {...ICON}>
      <path d="M12 4v11m-5-5 5 5 5-5M5 20h14" />
    </svg>
  )
}
