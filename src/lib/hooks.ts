import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react'
import { audio } from './audio'

/** URL parameters: ?chapter=candles, ?debug, ?reset, ?nocountdown… */
export const params = new URLSearchParams(typeof location === 'undefined' ? '' : location.search)

declare global {
  interface Navigator {
    /** iOS Safari: true when opened from the Home Screen */
    standalone?: boolean
  }
}

/** Opened as an installed app (from the Home Screen) rather than in a browser tab. */
export function isStandalone(): boolean {
  return navigator.standalone === true || matchMedia('(display-mode: standalone)').matches
}

export const isIOS =
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

export function useElementSize<T extends HTMLElement>(ref: RefObject<T | null>): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () =>
      setSize((s) => (s.width === el.clientWidth && s.height === el.clientHeight ? s : { width: el.clientWidth, height: el.clientHeight }))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return size
}

export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

export function useMuted(): boolean {
  return useSyncExternalStore(audio.subscribe, audio.getMuted)
}

/**
 * true once `ms` milliseconds have passed since `key` last changed. Used to reveal "rescue" buttons
 * (light them for me, cut it for me…) when someone is stuck on an interaction.
 */
export function useAfter(ms: number, key: unknown = 0): boolean {
  const [doneKey, setDoneKey] = useState<unknown>(() => Symbol('pending'))
  useEffect(() => {
    const id = window.setTimeout(() => setDoneKey(key), ms)
    return () => window.clearTimeout(id)
  }, [ms, key])
  return doneKey === key
}

/** setTimeout that cancels itself when the component unmounts (e.g. leaving a chapter halfway through). */
export function useTimers(): (fn: () => void, ms: number) => void {
  const ids = useRef(new Set<number>())
  useEffect(() => {
    const set = ids.current
    return () => {
      set.forEach((id) => window.clearTimeout(id))
      set.clear()
    }
  }, [])
  return useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      ids.current.delete(id)
      fn()
    }, ms)
    ids.current.add(id)
  }, [])
}

/**
 * true once at least `amount` of the element has been on screen, counting only from when `enabled` turns
 * true (e.g. after a page has finished flying in). Never goes back to false.
 */
export function useSeen(ref: RefObject<Element | null>, enabled: boolean, amount = 0.5): boolean {
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!enabled || seen || !el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting && e.intersectionRatio >= amount * 0.98)) setSeen(true)
      },
      { threshold: amount },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ref, enabled, seen, amount])
  return seen
}

/**
 * While mounted, marks the page as light paper (html[data-surface=paper]): the film-advance label is then
 * printed in dark ink instead of white, so it stays readable over the newspaper or the letter.
 */
export function usePaperSurface(): void {
  useEffect(() => {
    const root = document.documentElement
    root.dataset.surface = 'paper'
    return () => {
      delete root.dataset.surface
    }
  }, [])
}

/** A ref that always holds the latest value: for callbacks that run inside requestAnimationFrame / setTimeout. */
export function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value)
  useLayoutEffect(() => {
    ref.current = value
  })
  return ref
}
