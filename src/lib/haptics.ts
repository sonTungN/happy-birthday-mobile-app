import { hapticTrigger } from 'ios-haptics'

const isIOS =
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

/** A light buzz on Android (iOS has no navigator.vibrate). */
export function buzz(ms = 12): void {
  try {
    navigator.vibrate?.(ms)
  } catch {
    /* not supported */
  }
}

/**
 * Attach to a button's `ref` so the phone gives a light tap of haptic feedback when it's pressed.
 * iOS: uses Safari 17.4+'s <input switch> trick (only works on a real tap).
 * Android: navigator.vibrate.
 */
export function hapticRef(el: HTMLElement | null): void {
  if (!el) return
  if (isIOS) {
    hapticTrigger(el)
  } else if (!el.dataset.buzz) {
    el.dataset.buzz = '1'
    el.addEventListener('pointerdown', () => buzz(), { passive: true })
  }
}
