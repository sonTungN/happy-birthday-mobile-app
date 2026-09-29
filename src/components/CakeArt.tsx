import { useId } from 'react'
import { BOTTOM_Y, CAKE_H, CAKE_W, DRIP_PATH, PEARLS, SPRINKLES, TOP } from '../lib/cake'

/** The birthday cake in black and white, drawn in SVG. Its viewBox matches the coordinates in lib/cake.ts. */
export function CakeArt({ message, className }: { message?: string; className?: string }) {
  // Unique ids: the cake can be on screen twice (the two halves after cutting).
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const id = (name: string) => `${uid}-${name}`
  const url = (name: string) => `url(#${id(name)})`
  const left = TOP.cx - TOP.rx
  const right = TOP.cx + TOP.rx

  return (
    <svg className={className} viewBox={`0 0 ${CAKE_W} ${CAKE_H}`} aria-hidden>
      <defs>
        <linearGradient id={id('body')} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#a9a59d" />
          <stop offset="0.32" stopColor="#e4e0d7" />
          <stop offset="0.58" stopColor="#f6f3ec" />
          <stop offset="1" stopColor="#9e9a92" />
        </linearGradient>
        <radialGradient id={id('top')} cx="0.42" cy="0.38" r="0.75">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e6e2d9" />
        </radialGradient>
        <linearGradient id={id('drip')} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e9e5dc" />
        </linearGradient>
        <linearGradient id={id('plate')} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#f2f1ee" />
          <stop offset="1" stopColor="#9d9b97" />
        </linearGradient>
        <path id={id('arc')} d="M 58 180 Q 160 214 262 180" />
      </defs>

      {/* plate */}
      <ellipse cx="160" cy="278" rx="148" ry="18" fill="rgba(0, 0, 0, 0.45)" />
      <ellipse cx="160" cy="268" rx="150" ry="24" fill={url('plate')} />
      <ellipse cx="160" cy="264" rx="134" ry="16" fill="#dcdad5" />

      {/* body */}
      <path
        d={`M ${left} ${TOP.cy} L ${left} ${BOTTOM_Y} A ${TOP.rx} ${TOP.ry} 0 0 0 ${right} ${BOTTOM_Y} L ${right} ${TOP.cy} A ${TOP.rx} ${TOP.ry} 0 0 0 ${left} ${TOP.cy} Z`}
        fill={url('body')}
      />
      <path d={`M ${left} 214 A ${TOP.rx} ${TOP.ry} 0 0 0 ${right} 214 L ${right} 226 A ${TOP.rx} ${TOP.ry} 0 0 1 ${left} 226 Z`} fill="#2f2e2c" />
      {PEARLS.map((p) => (
        <circle key={p.x} cx={p.x} cy={p.y} r="4.6" fill="#fbfaf7" stroke="#b9b6ae" strokeWidth="0.8" />
      ))}
      {message && (
        <text fontSize="34" fill="#2a2a2a" style={{ fontFamily: 'var(--font-script)' }}>
          <textPath href={`#${id('arc')}`} startOffset="50%" textAnchor="middle">
            {message}
          </textPath>
        </text>
      )}

      {/* frosting */}
      <path d={DRIP_PATH} fill={url('drip')} />
      <ellipse cx={TOP.cx} cy={TOP.cy} rx={TOP.rx} ry={TOP.ry} fill={url('top')} />
      {SPRINKLES.map((s, i) => (
        <rect key={i} x={s.x - 3.5} y={s.y - 1.2} width="7" height="2.4" rx="1.2" fill={s.color} transform={`rotate(${s.rotate} ${s.x} ${s.y})`} />
      ))}
    </svg>
  )
}
