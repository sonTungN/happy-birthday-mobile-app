import { useCallback, useSyncExternalStore } from 'react'
import { isIOS, isStandalone } from './hooks'

/*
 * Full screen, the way each device allows it: the browser's own full-screen mode where there is one (Android,
 * laptops, iPad), the Home Screen on an iPhone (Safari there can't put a page full screen), nothing to do when
 * the roll is already open as an installed app.
 */

/** Safari's prefixed names, which TypeScript's DOM types leave out */
type WebkitDocument = Document & {
  webkitFullscreenEnabled?: boolean
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => Promise<void> | void
}
type WebkitElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void }

const doc = () => document as WebkitDocument
const root = () => document.documentElement as WebkitElement

/** The browser can show this page full screen */
export function fullscreenAvailable(): boolean {
  if (typeof document === 'undefined') return false
  return Boolean((doc().fullscreenEnabled || doc().webkitFullscreenEnabled) && (root().requestFullscreen || root().webkitRequestFullscreen))
}

export function isFullscreen(): boolean {
  return Boolean(doc().fullscreenElement || doc().webkitFullscreenElement)
}

export async function enterFullscreen(): Promise<void> {
  try {
    if (root().requestFullscreen) await root().requestFullscreen({ navigationUI: 'hide' })
    else await root().webkitRequestFullscreen?.()
  } catch {
    /* refused (no gesture, or not allowed here): nothing changes */
  }
}

export async function exitFullscreen(): Promise<void> {
  try {
    if (doc().exitFullscreen) await doc().exitFullscreen()
    else await doc().webkitExitFullscreen?.()
  } catch {
    /* already out */
  }
}

export type FullscreenWay = 'api' | 'homescreen' | 'none'

/** What "full screen" means on this device right now */
export function fullscreenWay(): FullscreenWay {
  if (typeof document === 'undefined' || isStandalone()) return 'none'
  if (fullscreenAvailable()) return 'api'
  return isIOS ? 'homescreen' : 'none'
}

function subscribe(onChange: () => void): () => void {
  document.addEventListener('fullscreenchange', onChange)
  document.addEventListener('webkitfullscreenchange', onChange)
  return () => {
    document.removeEventListener('fullscreenchange', onChange)
    document.removeEventListener('webkitfullscreenchange', onChange)
  }
}

/** Whether the page is full screen right now, and a way to toggle it (call it from a tap) */
export function useFullscreen(): { full: boolean; toggle: () => void } {
  const full = useSyncExternalStore(subscribe, isFullscreen, () => false)
  const toggle = useCallback(() => {
    void (isFullscreen() ? exitFullscreen() : enterFullscreen())
  }, [])
  return { full, toggle }
}
