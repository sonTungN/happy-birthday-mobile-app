import { isIOS, isStandalone } from './hooks'

/** The laptop layout (effects.css .app-stage): a phone-sized frame, not the whole screen */
const DESK = '(min-width: 640px) and (min-height: 640px)'

/**
 * iOS 26, web apps opened from the Home Screen with viewport-fit=cover: on a cold start the viewport is reported
 * shorter than the screen (by the height of a toolbar that isn't there), so a full-screen element stops well
 * above the bottom edge and the strip below it is bare. The screen's own height is right, so the stage is sized
 * to it whenever the two disagree; a rotation or resize makes iOS report the true height again.
 */
export function keepStageFull(stage: HTMLElement): () => void {
  if (!isIOS || !isStandalone() || matchMedia(DESK).matches) return () => {}
  const fit = () => {
    const portrait = matchMedia('(orientation: portrait)').matches
    const screenHeight = portrait ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height)
    stage.style.height = screenHeight - window.innerHeight > 8 ? `${screenHeight}px` : ''
  }
  fit()
  window.addEventListener('resize', fit)
  window.addEventListener('orientationchange', fit)
  return () => {
    window.removeEventListener('resize', fit)
    window.removeEventListener('orientationchange', fit)
    stage.style.height = ''
  }
}
