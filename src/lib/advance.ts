import { createContext, useContext, useEffect } from 'react'
import { useLatest } from './hooks'

interface Advance {
  /** Lights up the wind-on wheel. `action` runs when she winds on (default: the next chapter). */
  arm: (action?: () => void) => void
  disarm: () => void
}

export const AdvanceContext = createContext<Advance>({ arm: () => {}, disarm: () => {} })

/**
 * Instead of a "Next" button, a finished chapter arms the film-advance wheel next to the frame counter.
 * While `ready` is true the wheel is live; winding it runs `action`, or moves to the next chapter.
 */
export function useWindOn(ready: boolean, action?: () => void): void {
  const { arm, disarm } = useContext(AdvanceContext)
  const actionRef = useLatest(action)
  const custom = action !== undefined
  useEffect(() => {
    if (!ready) return
    arm(custom ? () => actionRef.current?.() : undefined)
    return disarm
  }, [ready, custom, arm, disarm, actionRef])
}
