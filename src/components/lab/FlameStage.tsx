import { useEffect, useId, useMemo, useState } from 'react'
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { RotateCcw } from 'lucide-react'
import type { FlameData } from '../../lib/lab'

const mono = 'font-mono uppercase tracking-[0.25em]'

// Flame outline in a 100 x 170 box, base at y = 150. Four variants with the same
// structure, so the browser can morph between them and the tip wanders like a real flame.
const SHAPES = [
  'M50 8 C56 42 88 64 88 106 C88 134 70 150 50 150 C30 150 12 134 12 106 C12 64 44 42 50 8 Z',
  'M59 16 C59 46 91 68 88 106 C88 134 70 150 50 150 C30 150 12 134 12 106 C12 72 51 48 59 16 Z',
  'M44 2 C53 40 87 60 88 106 C88 134 70 150 50 150 C30 150 12 134 12 106 C12 60 41 38 44 2 Z',
  'M53 12 C54 44 89 62 88 106 C88 134 70 150 50 150 C30 150 12 134 12 106 C12 66 48 44 53 12 Z',
]

interface Palette {
  outer: [string, string, string]
  mid: [string, string, string]
  core: [string, string, string]
  glow: string
  embers: boolean
}

// Methanol burns pale blue, heptane burns orange and sooty yellow.
const PALETTES: Record<'blue' | 'orange', Palette> = {
  blue: {
    outer: ['#2B4BFF', '#3A9BFF', '#4CC9F0'],
    mid: ['#3A7BFF', '#5CD4FF', '#BFF1FF'],
    core: ['#8FE3FF', '#E4FAFF', '#FFFFFF'],
    glow: '76,201,240',
    embers: false,
  },
  orange: {
    outer: ['#E8431A', '#FF6B2C', '#FF8F3A'],
    mid: ['#FF7A2E', '#FFB347', '#FFD36B'],
    core: ['#FFD25A', '#FFF0B3', '#FFFFFF'],
    glow: '255,140,50',
    embers: true,
  },
}

const LAYERS = [
  { sx: 1, sy: 1, dur: 2.3, grad: 'outer', blur: true },
  { sx: 0.7, sy: 0.74, dur: 1.7, grad: 'mid', blur: false },
  { sx: 0.4, sy: 0.46, dur: 1.25, grad: 'core', blur: false },
] as const

const EMBERS = [
  { x: 42, delay: 0, dur: 2.6 },
  { x: 58, delay: 0.9, dur: 3.1 },
  { x: 50, delay: 1.7, dur: 2.8 },
  { x: 36, delay: 2.2, dur: 3.4 },
  { x: 63, delay: 0.4, dur: 3.0 },
]

// Schematic only: duration, droplet size and final size come from the nearest NASA tests.
// The flame shape and flicker are an illustration, not measured frames.
export default function FlameStage({ data, fuel }: { data: FlameData; fuel: string }) {
  const [run, setRun] = useState(0)
  const reduced = useReducedMotion()
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const progress = useMotionValue(0)
  const d0 = data.initial_droplet_diameter_mm

  const ratio = useMemo(() => {
    const de = data.extinction_diameter_mm
    return de && d0 > 0 ? Math.min(0.9, Math.max(0.12, de / d0)) : 0.4
  }, [data.extinction_diameter_mm, d0])

  useEffect(() => {
    progress.set(0)
    const controls = animate(progress, 1, { duration: Math.max(1, data.flame_duration_s), ease: 'linear' })
    return () => controls.stop()
  }, [run, data.flame_duration_s, progress])

  // the droplet diameter shrinks by the d-squared law: d^2 falls linearly with time
  const scale = useTransform(progress, (p) => Math.sqrt(1 - (1 - ratio * ratio) * p))
  const ignite = useTransform(progress, (p) => Math.min(1, p / 0.06))
  const flameScale = useTransform([scale, ignite], ([s, i]: number[]) => s * i)
  const opacity = useTransform(progress, [0, 0.04, 0.9, 1], [0, 1, 1, 0])
  const elapsed = useTransform(progress, (p) => (p * data.flame_duration_s).toFixed(1))

  const pal = PALETTES[fuel.toLowerCase() === 'methanol' ? 'blue' : 'orange']
  const height = Math.min(190, Math.max(100, 70 + d0 * 32))
  const width = (height * 100) / 170
  const dropSize = Math.max(8, d0 * 5)

  const shapeValues = (rot: number) => {
    const list = [...SHAPES.slice(rot), ...SHAPES.slice(0, rot)]
    return [...list, list[0]].join(';')
  }
  const splines = SHAPES.map(() => '0.45 0 0.55 1').join(';')

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/60">
      <div className="relative h-64">
        <div className="absolute inset-x-0 bottom-10 flex justify-center">
          <div className="relative" style={{ width, height }}>
            <motion.div
              className="absolute inset-0"
              style={{ scale: flameScale, opacity, transformOrigin: '50% 100%' }}
            >
              {/* glow shaped like the flame, breathing slowly */}
              <motion.div
                className="absolute"
                style={{
                  left: '-70%',
                  right: '-70%',
                  top: '-18%',
                  bottom: '-12%',
                  background: `radial-gradient(ellipse 50% 52% at 50% 62%, rgba(${pal.glow},0.55) 0%, rgba(${pal.glow},0.22) 45%, rgba(${pal.glow},0) 100%)`,
                  filter: 'blur(10px)',
                }}
                animate={reduced ? undefined : { opacity: [0.75, 1, 0.8, 1, 0.75], scale: [1, 1.06, 1.01, 1.07, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              />
              <svg viewBox="0 0 100 170" width={width} height={height} className="relative overflow-visible" aria-hidden="true">
                <defs>
                  {(['outer', 'mid', 'core'] as const).map((k) => (
                    <linearGradient key={k} id={`${uid}-${k}`} x1="0" y1="1" x2="0" y2="0">
                      <stop offset="0%" stopColor={pal[k][0]} stopOpacity="0.95" />
                      <stop offset="55%" stopColor={pal[k][1]} stopOpacity="0.9" />
                      <stop offset="100%" stopColor={pal[k][2]} stopOpacity="0" />
                    </linearGradient>
                  ))}
                  <filter id={`${uid}-soft`} x="-30%" y="-20%" width="160%" height="140%">
                    <feGaussianBlur stdDeviation="1.6" />
                  </filter>
                </defs>

                {LAYERS.map((l, i) => (
                  <g key={l.grad} transform={`translate(50 150) scale(${l.sx} ${l.sy}) translate(-50 -150)`}>
                    <path
                      d={SHAPES[i]}
                      fill={`url(#${uid}-${l.grad})`}
                      filter={l.blur ? `url(#${uid}-soft)` : undefined}
                      style={{ mixBlendMode: 'screen' }}
                    >
                      {!reduced && (
                        <animate
                          attributeName="d"
                          dur={`${l.dur}s`}
                          repeatCount="indefinite"
                          calcMode="spline"
                          keySplines={splines}
                          values={shapeValues(i)}
                        />
                      )}
                    </path>
                  </g>
                ))}

                {pal.embers &&
                  !reduced &&
                  EMBERS.map((e, i) => (
                    <circle key={i} cx={e.x} cy="90" r="1.4" fill="#FFD36B" opacity="0">
                      <animate attributeName="cy" from="110" to="-6" dur={`${e.dur}s`} begin={`${e.delay}s`} repeatCount="indefinite" />
                      <animate attributeName="cx" values={`${e.x};${e.x + (i % 2 ? 7 : -7)};${e.x}`} dur={`${e.dur}s`} begin={`${e.delay}s`} repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0;0.9;0" dur={`${e.dur}s`} begin={`${e.delay}s`} repeatCount="indefinite" />
                    </circle>
                  ))}
              </svg>
            </motion.div>

            {/* the fuel droplet the flame is burning on */}
            <motion.div
              className="absolute left-1/2 rounded-full"
              style={{
                width: dropSize,
                height: dropSize,
                bottom: height * (20 / 170) - dropSize * 0.55,
                x: '-50%',
                scale,
                background: 'radial-gradient(circle at 35% 30%, #fff, rgba(255,255,255,0.55) 40%, rgba(255,255,255,0.18))',
                boxShadow: `0 0 12px rgba(${pal.glow},0.7)`,
              }}
            />
          </div>
        </div>

        <span className={`${mono} absolute top-3 left-4 text-[9px] text-muted`}>Schematic</span>
        <button
          onClick={() => setRun((r) => r + 1)}
          aria-label="Replay"
          className={`${mono} absolute top-2.5 right-3 flex cursor-pointer items-center gap-1.5 px-2 py-1 text-[9px] text-muted hover:text-flame`}
        >
          <RotateCcw size={12} /> Replay
        </button>
        <div className="absolute bottom-3 left-4 font-mono text-xs text-ink">
          <motion.span>{elapsed}</motion.span> s <span className="text-muted">/ {data.flame_duration_s} s</span>
        </div>
      </div>
      <p className="border-t border-white/10 px-4 py-2 text-[11px] leading-snug text-muted">{data.note}</p>
    </div>
  )
}