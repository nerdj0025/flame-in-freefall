# Flame in Freefall - Lab page update (frontend only). Run from INSIDE the project folder
# (the one that contains package.json and src). It gives the Lab page these tabs:
# Virtual lab (original design with the flame), Detective, Case file, Gap map,
# Research tools and Invisible flame. The backend is not touched.
$ErrorActionPreference = 'Stop'
$root = (Get-Location).Path
if (-not (Test-Path (Join-Path $root 'package.json'))) {
  Write-Host 'ERROR: package.json not found. cd into the flame-in-freefall folder first.' -ForegroundColor Red
  exit 1
}
if (-not (Test-Path (Join-Path $root 'src'))) {
  Write-Host 'ERROR: src folder not found. Run this from the folder that contains package.json.' -ForegroundColor Red
  exit 1
}
$utf8 = New-Object System.Text.UTF8Encoding($false)
function W($rel, $content) {
  $path = Join-Path $root $rel
  $dir = Split-Path $path -Parent
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force $dir | Out-Null }
  [System.IO.File]::WriteAllText($path, ($content -replace "`r?`n", "`r`n"), $utf8)
  Write-Host ("wrote " + $rel)
}
W 'src/components/lab/CompareSummary.tsx' @'
import { motion } from 'motion/react'
import type { Comparison } from '../../lib/lab'
import { INPUT_LABEL } from '../../lib/lab'

const mono = 'font-mono uppercase tracking-[0.25em]'

export default function CompareSummary({ c, lines }: { c: Comparison; lines: string[] }) {
  const max = Math.max(c.burn_time_median_a, c.burn_time_median_b, 0.001)
  const rows = [
    { label: 'Scenario A', value: c.burn_time_median_a, color: '#FF6B2C' },
    { label: 'Scenario B', value: c.burn_time_median_b, color: '#4CC9F0' },
  ]
  const d = c.difference_b_minus_a
  return (
    <div className="glass p-5">
      <h2 className={`${mono} mb-4 text-[11px] text-flame`}>Side by side</h2>
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-muted">{r.label}</span>
              <span className="font-mono font-semibold">{r.value} s</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full"
                style={{ background: r.color }}
                initial={{ width: 0 }}
                animate={{ width: (r.value / max) * 100 + '%' }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm">
        {Math.abs(d) < 0.05 ? (
          <>Both scenarios have the same median burn time in the nearest NASA tests.</>
        ) : (
          <>
            B burns <span className="font-semibold text-flame">{Math.abs(d)} s {d >= 0 ? 'longer' : 'shorter'}</span> than A
            (median of the nearest NASA tests).
          </>
        )}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {c.inputs_that_differ.length === 0 ? (
          <span className="text-xs text-muted">The inputs are identical.</span>
        ) : (
          c.inputs_that_differ.map((k) => (
            <span key={k} className={`${mono} rounded-full border border-white/15 px-2.5 py-1 text-[9px] text-muted`}>
              {INPUT_LABEL[k] ?? k} differs
            </span>
          ))
        )}
      </div>
      <ul className="mt-4 space-y-2 text-sm leading-relaxed text-ink/90">
        {lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      <ul className="mt-4 space-y-1 text-[11px] text-ember">
        {c.warnings.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
    </div>
  )
}
'@
W 'src/components/lab/Explain.tsx' @'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { getExplanation } from '../../lib/lab'
import type { CombustionExplanation, Scenario } from '../../lib/lab'
import { Notes, Pill, mono } from './ui'

// "Explain the physics" button: loads a physics background for the chosen conditions on demand.
export default function Explain({ scenario }: { scenario: Scenario }) {
  const [data, setData] = useState<CombustionExplanation | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function load() {
    setBusy(true)
    setErr('')
    try {
      setData(await getExplanation(scenario))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load the explanation.')
    } finally {
      setBusy(false)
    }
  }

  if (!data) {
    return (
      <div className="mt-6">
        <button
          onClick={load}
          disabled={busy}
          className={`${mono} flex cursor-pointer items-center gap-2 border border-flame/60 px-4 py-2.5 text-[10px] text-ink hover:bg-flame/10 disabled:cursor-wait disabled:opacity-60`}
        >
          {busy && <Loader2 size={13} className="animate-spin" />}
          Explain the physics
        </button>
        {err && <p className="mt-2 text-xs text-red-300">{err}</p>}
      </div>
    )
  }
  const x = data.scientific_explanation
  const rows: [string, string][] = [
    ['Fuel', x.fuel_role],
    ['Oxygen and pressure', x.oxygen_pressure_interaction],
    ['Pressure', x.pressure_role],
    ['Droplet size', x.droplet_role],
    ['Microgravity', x.microgravity_role],
  ]
  return (
    <div className="mt-6 space-y-3 rounded-lg border border-white/10 bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className={`${mono} text-[10px] text-muted`}>Physics background</p>
        <Pill text={data.evidence_level} color="#4CC9F0" />
      </div>
      <p className="text-xs text-muted">
        Oxygen partial pressure: <span className="font-semibold text-ink">{data.oxygen_partial_pressure_mmhg} mmHg</span>{' '}
        (reference 21% at 760 mmHg = 159.6 mmHg)
      </p>
      <dl className="space-y-2 text-sm">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className={`${mono} text-[9px] text-muted`}>{k}</dt>
            <dd className="leading-relaxed text-ink/90">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-muted">{data.why_review_before_repeating}</p>
      <Notes title="Limitations" lines={data.limitations} />
    </div>
  )
}
'@
W 'src/components/lab/FlameStage.tsx' @'
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
'@
W 'src/components/lab/GapMap.tsx' @'
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Loader2 } from 'lucide-react'
import { getGaps } from '../../lib/lab'
import type { GapCandidate, GapCell, GapReply } from '../../lib/lab'
import { FuelPicker, Notes, Pill, mono } from './ui'

const CYAN = '#4CC9F0'

// Which grid cell does a candidate experiment sit in?
function cellOf(c: GapCandidate, cells: GapCell[]) {
  return cells.findIndex(
    (g) =>
      c.oxygen_fraction >= g.oxygen_min &&
      c.oxygen_fraction <= g.oxygen_max &&
      c.pressure_mmhg >= g.pressure_min &&
      c.pressure_mmhg <= g.pressure_max,
  )
}

export default function GapMap({ fuels }: { fuels: string[] }) {
  const [fuel, setFuel] = useState(fuels.includes('Heptane') ? 'Heptane' : fuels[0])
  const [bins, setBins] = useState(6)
  const [data, setData] = useState<GapReply | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [filled, setFilled] = useState(0) // how many gaps have been filled so far (0 = just the raw gaps)
  const [active, setActive] = useState<number | null>(null)
  const timer = useRef<number | null>(null)

  const stop = () => {
    if (timer.current !== null) {
      window.clearInterval(timer.current)
      timer.current = null
    }
  }

  useEffect(() => {
    let live = true
    setLoading(true)
    setError('')
    setFilled(0)
    setActive(null)
    stop()
    const t = window.setTimeout(() => {
      getGaps(fuel, bins)
        .then((r) => live && setData(r))
        .catch((e: unknown) => live && setError(e instanceof Error ? e.message : 'Could not load the gap map.'))
        .finally(() => live && setLoading(false))
    }, 200)
    return () => {
      live = false
      window.clearTimeout(t)
      stop()
    }
  }, [fuel, bins])

  const cands = data?.next_experiment_candidates ?? []
  const cells = data?.coverage_map ?? []
  const cellRank = useMemo(() => {
    const m = new Map<number, number>()
    cands.forEach((c, k) => {
      const idx = cellOf(c, cells)
      if (idx >= 0) m.set(idx, k)
    })
    return m
  }, [cands, cells])
  const maxCount = Math.max(1, ...cells.map((c) => c.experiment_count))

  function fillGaps() {
    stop()
    setFilled(0)
    let n = 0
    timer.current = window.setInterval(() => {
      n += 1
      setFilled(n)
      if (n >= cands.length) stop()
    }, 600)
  }

  const showCell = active !== null ? cells[active] : null
  const showRank = active !== null ? cellRank.get(active) : undefined
  const showCand = showRank !== undefined ? cands[showRank] : null

  return (
    <div className="space-y-6">
      <div className="grid items-start gap-6 lg:grid-cols-[22rem_1fr]">
        <div className="glass space-y-5 p-5 lg:sticky lg:top-28">
          <h2 className={`${mono} text-[11px] text-flame`}>Gap map</h2>
          <div>
            <p className={`${mono} mb-2 text-[10px] text-muted`}>Fuel</p>
            <FuelPicker fuels={fuels} value={fuel} onChange={setFuel} />
          </div>
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <label htmlFor="gap-bins" className={`${mono} text-[10px] text-muted`}>
                Grid size
              </label>
              <span className="font-mono text-sm font-semibold">
                {bins} x {bins}
              </span>
            </div>
            <input
              id="gap-bins"
              type="range"
              min={3}
              max={12}
              step={1}
              value={bins}
              onChange={(e) => setBins(Number(e.target.value))}
              className="w-full cursor-pointer accent-flame"
            />
          </div>

          <button
            onClick={fillGaps}
            disabled={!data || cands.length === 0 || loading}
            className={`${mono} w-full cursor-pointer bg-flame px-5 py-3 text-[11px] font-bold text-space shadow-[0_0_28px_rgba(255,107,44,0.3)] disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {filled > 0 ? 'Fill the gaps again' : 'Fill the gaps'}
          </button>
          <p className="text-[11px] leading-snug text-muted">
            Orange squares are conditions NASA already tested. Dark dashed squares are gaps. Filling the gaps lights up
            the best next experiments, with a burn time estimated from the nearest real tests.
          </p>

          {data && (
            <div className="grid grid-cols-3 gap-3 border-t border-white/10 pt-4">
              <div>
                <div className={`${mono} mb-1 text-[9px] text-muted`}>Covered</div>
                <div className="text-lg font-semibold">{data.coverage_percentage}%</div>
              </div>
              <div>
                <div className={`${mono} mb-1 text-[9px] text-muted`}>Gaps</div>
                <div className="text-lg font-semibold">{data.gap_regions}</div>
              </div>
              <div>
                <div className={`${mono} mb-1 text-[9px] text-muted`}>Tests</div>
                <div className="text-lg font-semibold">{data.total_experiments}</div>
              </div>
            </div>
          )}
        </div>

        <div className="glass p-5">
          {error && (
            <p className="text-sm text-red-300" role="alert">
              {error}
            </p>
          )}
          {!data && !error && (
            <div className="flex h-64 items-center justify-center text-muted">
              <Loader2 className="animate-spin" />
            </div>
          )}
          {data && (
            <div className={`transition-opacity ${loading ? 'opacity-50' : 'opacity-100'}`}>
              <div className="flex gap-3">
                {/* oxygen axis (rows), high oxygen at the top */}
                <div className="flex flex-col justify-between py-1 text-right font-mono text-[10px] text-muted">
                  <span>{(cells[cells.length - 1].oxygen_max * 100).toFixed(0)}%</span>
                  <span className={`${mono} -rotate-90 whitespace-nowrap text-[9px]`}>Oxygen</span>
                  <span>{(cells[0].oxygen_min * 100).toFixed(0)}%</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${bins}, minmax(0, 1fr))` }}>
                    {Array.from({ length: bins * bins }, (_, k) => {
                      const row = Math.floor(k / bins)
                      const col = k % bins
                      const idx = (bins - 1 - row) * bins + col
                      const c = cells[idx]
                      if (!c) return null
                      const rank = cellRank.get(idx)
                      const lit = rank !== undefined && rank < filled
                      const covered = c.status === 'COVERED'
                      const strength = Math.log(c.experiment_count + 1) / Math.log(maxCount + 1)
                      const est = lit && rank !== undefined ? cands[rank].estimated_burn_time_s : null
                      return (
                        <motion.button
                          key={idx}
                          onMouseEnter={() => setActive(idx)}
                          onFocus={() => setActive(idx)}
                          onClick={() => setActive(idx)}
                          animate={lit ? { scale: [0.6, 1.08, 1] } : { scale: 1 }}
                          transition={{ duration: 0.45 }}
                          aria-label={`${covered ? c.experiment_count + ' tests' : 'gap'}, oxygen ${(c.oxygen_min * 100).toFixed(0)} to ${(c.oxygen_max * 100).toFixed(0)} percent, pressure ${c.pressure_min.toFixed(0)} to ${c.pressure_max.toFixed(0)} mmHg`}
                          className={`relative flex aspect-square cursor-pointer items-center justify-center rounded-md border text-[10px] outline-none focus-visible:ring-1 focus-visible:ring-flame ${
                            active === idx ? 'ring-1 ring-white/60' : ''
                          }`}
                          style={
                            covered
                              ? {
                                  background: `rgba(255,107,44,${0.18 + 0.7 * strength})`,
                                  borderColor: 'rgba(255,107,44,0.6)',
                                  color: '#fff',
                                }
                              : lit
                                ? {
                                    background: 'rgba(76,201,240,0.22)',
                                    borderColor: CYAN,
                                    boxShadow: `0 0 18px rgba(76,201,240,0.45)`,
                                    color: '#fff',
                                  }
                                : { borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.14)', color: '#8A94A8' }
                          }
                        >
                          {covered && bins <= 9 && <span className="font-mono font-semibold">{c.experiment_count}</span>}
                          {lit && rank !== undefined && (
                            <>
                              <span className="absolute top-0.5 left-1 font-mono text-[9px] font-bold" style={{ color: CYAN }}>
                                {rank + 1}
                              </span>
                              {est !== null && bins <= 9 && <span className="font-mono font-semibold">~{est}s</span>}
                            </>
                          )}
                        </motion.button>
                      )
                    })}
                  </div>
                  <div className="mt-2 flex justify-between font-mono text-[10px] text-muted">
                    <span>{cells[0].pressure_min.toFixed(0)}</span>
                    <span className={`${mono} text-[9px]`}>Pressure (mmHg)</span>
                    <span>{cells[cells.length - 1].pressure_max.toFixed(0)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted">
                <span className="flex items-center gap-1.5">
                  <i className="inline-block h-3 w-3 rounded-sm border border-flame/60 bg-flame/60" /> tested (number of tests)
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="inline-block h-3 w-3 rounded-sm border border-dashed border-white/30" /> gap
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="inline-block h-3 w-3 rounded-sm border" style={{ borderColor: CYAN, background: 'rgba(76,201,240,0.3)' }} />{' '}
                  suggested experiment (estimated burn time)
                </span>
              </div>

              <div className="mt-4 min-h-[3.5rem] rounded-lg border border-white/10 bg-white/[0.02] p-3 text-xs text-muted" aria-live="polite">
                {showCell ? (
                  <>
                    <span className="text-ink">
                      Oxygen {(showCell.oxygen_min * 100).toFixed(1)} to {(showCell.oxygen_max * 100).toFixed(1)}%, pressure{' '}
                      {showCell.pressure_min.toFixed(0)} to {showCell.pressure_max.toFixed(0)} mmHg:
                    </span>{' '}
                    {showCell.status === 'COVERED'
                      ? `${showCell.experiment_count} NASA tests here.`
                      : showCand && showRank !== undefined && showRank < filled
                        ? `a gap, now filled as suggestion #${showRank + 1}. Estimated burn time ${showCand.estimated_burn_time_s ?? 'n/a'} s (neighbours spread ${showCand.neighbor_IQR_s ?? 'n/a'} s).`
                        : 'a gap. No NASA test in this region.'}
                  </>
                ) : (
                  'Hover or tap a square to see what is inside it.'
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {data && cands.length > 0 && (
        <div className="glass p-5">
          <h2 className={`${mono} mb-4 text-[11px] text-flame`}>Best gaps to fill next</h2>
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full min-w-[34rem] border-collapse text-left text-xs">
              <thead>
                <tr className={`${mono} border-b border-white/10 text-[9px] text-muted`}>
                  <th className="px-3 py-2 font-normal">#</th>
                  <th className="px-3 py-2 font-normal">Oxygen</th>
                  <th className="px-3 py-2 font-normal">Pressure</th>
                  <th className="px-3 py-2 font-normal">Estimated burn</th>
                  <th className="px-3 py-2 font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {cands.map((c, k) => (
                  <tr
                    key={k}
                    onMouseEnter={() => {
                      const idx = cellOf(c, cells)
                      if (idx >= 0) setActive(idx)
                    }}
                    className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]"
                  >
                    <td className="px-3 py-2 font-mono" style={{ color: CYAN }}>
                      {k + 1}
                    </td>
                    <td className="px-3 py-2">{(c.oxygen_fraction * 100).toFixed(1)}%</td>
                    <td className="px-3 py-2">{c.pressure_mmhg.toFixed(0)} mmHg</td>
                    <td className="px-3 py-2">
                      {c.estimated_burn_time_s !== null ? `${c.estimated_burn_time_s} s (spread ${c.neighbor_IQR_s} s)` : 'n/a'}
                    </td>
                    <td className="px-3 py-2">
                      <Pill text={c.prediction_status} color="#FFB347" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted">{cands[0].selection_reason}.</p>
        </div>
      )}

      {data && (
        <div className="glass p-5">
          <Notes title="Limits of this map" lines={data.limitations} />
        </div>
      )}
    </div>
  )
}
'@
W 'src/components/lab/Investigation.tsx' @'
import { motion } from 'motion/react'
import type { CaseReply, DetectiveReply } from '../../lib/lab'
import { INPUT_LABEL } from '../../lib/lab'
import { Notes, Pill, Stat, mono } from './ui'

const VERDICT_COLOR: Record<string, string> = {
  COMPARABLE: '#34D399',
  CONFOUNDED: '#FFB347',
  INSUFFICIENT_EVIDENCE: '#F87171',
}

export function DetectiveView({ d }: { d: DetectiveReply }) {
  const color = VERDICT_COLOR[d.verdict] ?? '#8A94A8'
  return (
    <motion.div className="glass space-y-5 p-5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex flex-wrap items-center gap-3">
        <p className={`${mono} text-[11px] text-flame`}>Verdict</p>
        <Pill text={d.verdict} color={color} />
      </div>
      <p className="text-sm leading-relaxed">{d.reason}</p>
      {d.evidence && (
        <div className="grid grid-cols-3 gap-3 border-y border-white/10 py-4">
          <Stat label="Burn A" value={d.evidence.burn_time_a_s + ' s'} />
          <Stat label="Burn B" value={d.evidence.burn_time_b_s + ' s'} />
          <Stat label="Difference" value={d.evidence.difference_s + ' s'} />
        </div>
      )}
      <Notes title="Alerts" lines={d.warnings} />
      <Notes title="Evidence audit" lines={d.actual_evidence_audit?.alerts} />
      {d.scientific_conclusion && <p className="text-sm text-muted">{d.scientific_conclusion}</p>}
      {d.research_gap && <p className="text-sm text-muted">{d.research_gap}</p>}
    </motion.div>
  )
}

export function CaseView({ c }: { c: CaseReply }) {
  const n = c.next_experiment
  return (
    <div className="space-y-6">
      <motion.div className="glass space-y-3 p-6" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-wrap items-center gap-3">
          <p className={`${mono} text-[11px] text-flame`}>Case {c.case_id}</p>
          <Pill text={c.case_status} color="#FFB347" />
        </div>
        <h2 className="text-2xl font-bold">{c.case_title}</h2>
        <p className="text-sm text-muted">{c.case_question}</p>
        <p className="text-sm leading-relaxed">{c.final_message}</p>
      </motion.div>
      <DetectiveView d={c.investigation} />
      {n.status === 'PROPOSED' && (
        <div className="glass space-y-4 p-6">
          <p className={`${mono} text-[11px] text-flame`}>Proposed next experiment</p>
          <p className="text-sm font-semibold">{n.research_question}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className={`${mono} mb-2 text-[10px] text-muted`}>Change</p>
              <p className="text-sm">{INPUT_LABEL[n.variable_to_change ?? ''] ?? n.variable_to_change}</p>
            </div>
            <div>
              <p className={`${mono} mb-2 text-[10px] text-muted`}>Keep fixed</p>
              <p className="text-sm">{(n.variables_to_control ?? []).map((v) => INPUT_LABEL[v] ?? v).join(', ')}</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-ink/90">{n.suggested_design}</p>
          <Notes title="Measure" lines={n.measurements} />
          <p className="text-xs text-muted">{n.scientific_limitations}</p>
        </div>
      )}
    </div>
  )
}
'@
W 'src/components/lab/InvisibleFlamePanel.tsx' @'
import { useEffect, useRef, useState } from 'react'

const mono = 'font-mono uppercase tracking-[0.25em]'

type Gravity = 'micro' | 'earth'

const W = 900
const H = 540
const LOOP_SECONDS = 16

const STOPS: [number, number[]][] = [
  [300, [20, 30, 90]],
  [550, [70, 40, 150]],
  [700, [150, 50, 190]],
  [1000, [215, 50, 110]],
  [1300, [255, 130, 40]],
  [1800, [255, 245, 190]],
]

const TEXT = {
  en: {
    title: 'The invisible flame',
    controls: 'Controls',
    gravity: 'Gravity',
    timeline: 'Timeline',
    readout: 'Right now',
    lede: 'In microgravity, some flames burn at low temperature and are almost invisible. Switch the gravity, then reveal the hidden burning zones.',
    micro: 'Microgravity',
    earth: 'Earth gravity',
    reveal: 'Reveal hidden zones',
    hide: 'Hide hidden zones',
    play: 'Play',
    pause: 'Pause',
    replay: 'Replay',
    hottest: 'Hottest point',
    seen: 'Seen by eye or camera',
    eye: ['Bright', 'Fading', 'Barely a trace', 'Nothing'],
    ambient: 'Ambient',
    marks: ['Hot flame', 'Flame-out', 'Cool flame'],
    badgeNormal: 'What an eye or camera sees',
    badgeFalse: 'False color: a temperature map, not what you would see',
    hotLabel: 'hot flame, about 1,700 K',
    coolLabel: 'cool-flame shell, about 650 K',
    g0: 'about 0 g',
    g1: '1 g',
    story: {
      '0micro': 'The droplet burns with a hot blue sphere. With no buoyancy, hot gas doesn\u2019t rise, so the flame wraps evenly around the fuel.',
      '0earth': 'On Earth, hot gas rises and drags the flame into a yellow teardrop.',
      '1micro': 'The hot flame goes out as the droplet shrinks.',
      '1earth': 'The hot flame goes out as the droplet shrinks.',
      '2micro': 'The hot flame is gone, but low-temperature chemistry keeps a shell burning near 650 K. It is far too faint to see. Press \u201cReveal hidden zones\u201d.',
      '2earth': 'Rising gas carries heat away, and in ground tests the burn usually just ends here. Switch to microgravity to see what stays behind.',
    },
    note: 'This is an illustration, not footage or a combustion simulation. Sizes and temperatures are approximate, and the false colors mark where the heat is, not what you would see.',
  },
  ar: {
    title: '\u0646\u0645\u0637 \u0627\u0644\u0644\u0647\u0628 \u063a\u064a\u0631 \u0627\u0644\u0645\u0631\u0626\u064a',
    controls: '\u0627\u0644\u062a\u062d\u0643\u0645',
    gravity: '\u0627\u0644\u062c\u0627\u0630\u0628\u064a\u0629',
    timeline: '\u0627\u0644\u062c\u062f\u0648\u0644 \u0627\u0644\u0632\u0645\u0646\u064a',
    readout: '\u0627\u0644\u0622\u0646',
    lede: '\u0641\u064a \u0627\u0644\u062c\u0627\u0630\u0628\u064a\u0629 \u0627\u0644\u0635\u063a\u0631\u0649\u060c \u062a\u062d\u062a\u0631\u0642 \u0628\u0639\u0636 \u0623\u0644\u0633\u0646\u0629 \u0627\u0644\u0644\u0647\u0628 \u0639\u0646\u062f \u062f\u0631\u062c\u0627\u062a \u062d\u0631\u0627\u0631\u0629 \u0645\u0646\u062e\u0641\u0636\u0629 \u0648\u062a\u0643\u0627\u062f \u062a\u0643\u0648\u0646 \u063a\u064a\u0631 \u0645\u0631\u0626\u064a\u0629. \u0628\u062f\u0651\u0644 \u0627\u0644\u062c\u0627\u0630\u0628\u064a\u0629 \u062b\u0645 \u0627\u0643\u0634\u0641 \u0645\u0646\u0627\u0637\u0642 \u0627\u0644\u0627\u062d\u062a\u0631\u0627\u0642 \u0627\u0644\u062e\u0641\u064a\u0629.',
    micro: '\u062c\u0627\u0630\u0628\u064a\u0629 \u0635\u063a\u0631\u0649',
    earth: '\u062c\u0627\u0630\u0628\u064a\u0629 \u0627\u0644\u0623\u0631\u0636',
    reveal: '\u0627\u0643\u0634\u0641 \u0627\u0644\u0645\u0646\u0627\u0637\u0642 \u0627\u0644\u062e\u0641\u064a\u0629',
    hide: '\u0623\u062e\u0641\u0650 \u0627\u0644\u0645\u0646\u0627\u0637\u0642 \u0627\u0644\u062e\u0641\u064a\u0629',
    play: '\u062a\u0634\u063a\u064a\u0644',
    pause: '\u0625\u064a\u0642\u0627\u0641 \u0645\u0624\u0642\u062a',
    replay: '\u0625\u0639\u0627\u062f\u0629',
    hottest: '\u0623\u0639\u0644\u0649 \u062f\u0631\u062c\u0629 \u062d\u0631\u0627\u0631\u0629',
    seen: '\u0645\u0627 \u062a\u0631\u0627\u0647 \u0627\u0644\u0639\u064a\u0646 \u0623\u0648 \u0627\u0644\u0643\u0627\u0645\u064a\u0631\u0627',
    eye: ['\u0633\u0627\u0637\u0639', '\u064a\u062e\u0628\u0648', '\u0623\u062b\u0631 \u062e\u0627\u0641\u062a', '\u0644\u0627 \u0634\u064a\u0621'],
    ambient: '\u062d\u0631\u0627\u0631\u0629 \u0627\u0644\u0648\u0633\u0637',
    marks: ['\u0644\u0647\u0628 \u0633\u0627\u062e\u0646', '\u0627\u0646\u0637\u0641\u0627\u0621 \u0627\u0644\u0644\u0647\u0628', '\u0644\u0647\u0628 \u0628\u0627\u0631\u062f'],
    badgeNormal: '\u0645\u0627 \u062a\u0631\u0627\u0647 \u0627\u0644\u0639\u064a\u0646 \u0623\u0648 \u0627\u0644\u0643\u0627\u0645\u064a\u0631\u0627',
    badgeFalse: '\u0623\u0644\u0648\u0627\u0646 \u0632\u0627\u0626\u0641\u0629: \u062e\u0631\u064a\u0637\u0629 \u062d\u0631\u0627\u0631\u0629 \u0648\u0644\u064a\u0633\u062a \u0645\u0627 \u062a\u0631\u0627\u0647 \u0627\u0644\u0639\u064a\u0646',
    hotLabel: '\u0644\u0647\u0628 \u0633\u0627\u062e\u0646 \u2248 1,700 K',
    coolLabel: '\u063a\u0644\u0627\u0641 \u0627\u0644\u0644\u0647\u0628 \u0627\u0644\u0628\u0627\u0631\u062f \u2248 650 K',
    g0: '\u0642\u0631\u0627\u0628\u0629 0 g',
    g1: '1 g',
    story: {
      '0micro': '\u062a\u062d\u062a\u0631\u0642 \u0627\u0644\u0642\u0637\u0631\u0629 \u0628\u0644\u0647\u0628 \u0623\u0632\u0631\u0642 \u0643\u0631\u0648\u064a \u0633\u0627\u062e\u0646. \u0648\u0644\u0623\u0646\u0647 \u0644\u0627 \u0637\u0641\u0648 \u0641\u064a \u0627\u0644\u062c\u0627\u0630\u0628\u064a\u0629 \u0627\u0644\u0635\u063a\u0631\u0649\u060c \u0644\u0627 \u064a\u0635\u0639\u062f \u0627\u0644\u063a\u0627\u0632 \u0627\u0644\u0633\u0627\u062e\u0646\u060c \u0641\u064a\u0644\u062a\u0641 \u0627\u0644\u0644\u0647\u0628 \u0628\u0627\u0644\u062a\u0633\u0627\u0648\u064a \u062d\u0648\u0644 \u0627\u0644\u0648\u0642\u0648\u062f.',
      '0earth': '\u0639\u0644\u0649 \u0627\u0644\u0623\u0631\u0636 \u064a\u0635\u0639\u062f \u0627\u0644\u063a\u0627\u0632 \u0627\u0644\u0633\u0627\u062e\u0646 \u0648\u064a\u0633\u062d\u0628 \u0627\u0644\u0644\u0647\u0628 \u0625\u0644\u0649 \u0634\u0643\u0644 \u0642\u0637\u0631\u0629 \u0635\u0641\u0631\u0627\u0621.',
      '1micro': '\u064a\u0646\u0637\u0641\u0626 \u0627\u0644\u0644\u0647\u0628 \u0627\u0644\u0633\u0627\u062e\u0646 \u0628\u064a\u0646\u0645\u0627 \u062a\u062a\u0642\u0644\u0635 \u0627\u0644\u0642\u0637\u0631\u0629.',
      '1earth': '\u064a\u0646\u0637\u0641\u0626 \u0627\u0644\u0644\u0647\u0628 \u0627\u0644\u0633\u0627\u062e\u0646 \u0628\u064a\u0646\u0645\u0627 \u062a\u062a\u0642\u0644\u0635 \u0627\u0644\u0642\u0637\u0631\u0629.',
      '2micro': '\u0627\u062e\u062a\u0641\u0649 \u0627\u0644\u0644\u0647\u0628 \u0627\u0644\u0633\u0627\u062e\u0646\u060c \u0644\u0643\u0646 \u0643\u064a\u0645\u064a\u0627\u0621 \u0627\u0644\u062d\u0631\u0627\u0631\u0629 \u0627\u0644\u0645\u0646\u062e\u0641\u0636\u0629 \u062a\u064f\u0628\u0642\u064a \u063a\u0644\u0627\u0641\u064b\u0627 \u064a\u062d\u062a\u0631\u0642 \u0642\u0631\u0627\u0628\u0629 650 K. \u0625\u0646\u0647 \u062e\u0627\u0641\u062a \u062c\u062f\u064b\u0627 \u0641\u0644\u0627 \u064a\u064f\u0631\u0649. \u0627\u0636\u063a\u0637 \u00ab\u0627\u0643\u0634\u0641 \u0627\u0644\u0645\u0646\u0627\u0637\u0642 \u0627\u0644\u062e\u0641\u064a\u0629\u00bb.',
      '2earth': '\u064a\u062d\u0645\u0644 \u0627\u0644\u063a\u0627\u0632 \u0627\u0644\u0635\u0627\u0639\u062f \u0627\u0644\u062d\u0631\u0627\u0631\u0629 \u0628\u0639\u064a\u062f\u064b\u0627\u060c \u0648\u0641\u064a \u0627\u0644\u062a\u062c\u0627\u0631\u0628 \u0627\u0644\u0623\u0631\u0636\u064a\u0629 \u064a\u0646\u062a\u0647\u064a \u0627\u0644\u0627\u062d\u062a\u0631\u0627\u0642 \u0639\u0627\u062f\u0629\u064b \u0647\u0646\u0627. \u0628\u062f\u0651\u0644 \u0625\u0644\u0649 \u0627\u0644\u062c\u0627\u0630\u0628\u064a\u0629 \u0627\u0644\u0635\u063a\u0631\u0649 \u0644\u062a\u0631\u0649 \u0645\u0627 \u064a\u0628\u0642\u0649.',
    },
    note: '\u0647\u0630\u0627 \u0631\u0633\u0645 \u062a\u0648\u0636\u064a\u062d\u064a \u0648\u0644\u064a\u0633 \u062a\u0633\u062c\u064a\u0644\u064b\u0627 \u062d\u0642\u064a\u0642\u064a\u064b\u0627 \u0648\u0644\u0627 \u0645\u062d\u0627\u0643\u0627\u0629 \u0627\u062d\u062a\u0631\u0627\u0642 \u062f\u0642\u064a\u0642\u0629. \u0627\u0644\u0623\u062d\u062c\u0627\u0645 \u0648\u062f\u0631\u062c\u0627\u062a \u0627\u0644\u062d\u0631\u0627\u0631\u0629 \u062a\u0642\u0631\u064a\u0628\u064a\u0629\u060c \u0648\u0627\u0644\u0623\u0644\u0648\u0627\u0646 \u0627\u0644\u0632\u0627\u0626\u0641\u0629 \u062a\u0628\u064a\u0651\u0646 \u0645\u0648\u0636\u0639 \u0627\u0644\u062d\u0631\u0627\u0631\u0629 \u0648\u0644\u064a\u0633 \u0645\u0627 \u062a\u0631\u0627\u0647 \u0627\u0644\u0639\u064a\u0646.',
  },
}
type Strings = typeof TEXT.en

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x))
const smooth = (x: number) => {
  const v = clamp(x, 0, 1)
  return v * v * (3 - 2 * v)
}

function tempColor(T: number): number[] {
  for (let i = 1; i < STOPS.length; i++) {
    if (T <= STOPS[i][0] || i === STOPS.length - 1) {
      const [t0, c0] = STOPS[i - 1]
      const [t1, c1] = STOPS[i]
      const f = clamp((T - t0) / (t1 - t0), 0, 1)
      return c0.map((v, k) => v + (c1[k] - v) * f)
    }
  }
  return STOPS[0][1]
}

// Brightness of the hot flame (h) and the cool flame (c) at timeline position t.
function levels(t: number, gravity: Gravity) {
  const h = t < 0.4 ? 1 : t < 0.5 ? 1 - (t - 0.4) / 0.1 : 0
  const c =
    gravity === 'micro'
      ? t < 0.43 ? 0 : t < 0.56 ? (t - 0.43) / 0.13 : t < 0.9 ? 1 : 1 - ((t - 0.9) / 0.1) * 0.6
      : 0
  return { h: smooth(h), c: smooth(c) }
}


// Hot/cool flame illustration for the lab page. Frontend only: no backend needed.
export default function InvisibleFlamePanel() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isAr = typeof document !== 'undefined' && document.documentElement.dir === 'rtl'
  const s: Strings = isAr ? TEXT.ar : TEXT.en

  const reduced =
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const [gravity, setGravity] = useState<Gravity>('micro')
  const [reveal, setReveal] = useState(false)
  const [playing, setPlaying] = useState(!reduced)
  const [t, setT] = useState(reduced ? 0.7 : 0)

  // The animation loop reads these refs so it never restarts.
  const gRef = useRef(gravity)
  const rRef = useRef(reveal)
  const pRef = useRef(playing)
  const tRef = useRef(reduced ? 0.7 : 0)
  const sRef = useRef(s)
  gRef.current = gravity
  rRef.current = reveal
  pRef.current = playing
  sRef.current = s

  useEffect(() => {
    const cv = canvasRef.current
    const ctx = cv?.getContext('2d')
    if (!cv || !ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    cv.width = W * dpr
    cv.height = H * dpr
    let cy = 270
    let last = performance.now()
    let raf = 0
    const font = (px: number) => `${px}px Inter, Cairo, system-ui, sans-serif`

    const heat = (x: number, y: number, Rp: number, Tp: number, sp: number, rMax: number) => {
      if (Tp < 340) return
      const gr = ctx.createRadialGradient(x, y, 0, x, y, rMax)
      for (let k = 0; k <= 24; k++) {
        const r = (k / 24) * rMax
        const T = 300 + (Tp - 300) * Math.exp(-(((r - Rp) / sp) ** 2))
        const a = clamp((T - 310) / 70, 0, 1) * 0.92
        const [R, G, B] = tempColor(T)
        gr.addColorStop(k / 24, `rgba(${R | 0},${G | 0},${B | 0},${a})`)
      }
      ctx.fillStyle = gr
      ctx.fillRect(x - rMax, y - rMax, rMax * 2, rMax * 2)
    }

    const label = (x1: number, y1: number, x2: number, y2: number, text: string, alpha: number, rtl: boolean) => {
      ctx.globalAlpha = alpha
      ctx.strokeStyle = 'rgba(255,255,255,.7)'
      ctx.lineWidth = 1
      const dir = rtl ? -1 : 1
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.lineTo(x2 + 14 * dir, y2)
      ctx.stroke()
      ctx.fillStyle = '#fff'
      ctx.font = font(13)
      ctx.textAlign = rtl ? 'right' : 'left'
      ctx.fillText(text, x2 + 20 * dir, y2 + 4)
      ctx.globalAlpha = 1
    }

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      if (pRef.current) {
        tRef.current = Math.min(1, tRef.current + dt / LOOP_SECONDS)
        setT(tRef.current)
        if (tRef.current >= 1) setPlaying(false)
      }

      const tt = tRef.current
      const gravityNow = gRef.current
      const earth = gravityNow === 'earth'
      const str = sRef.current
      const rtl = str === TEXT.ar
      const { h, c } = levels(tt, gravityNow)
      const cx = W / 2
      const time = now / 1000
      cy += ((earth ? 370 : 270) - cy) * 0.12

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      const bg = ctx.createRadialGradient(cx, H / 2, 40, cx, H / 2, 520)
      bg.addColorStop(0, 'rgba(14,16,24,.9)')
      bg.addColorStop(1, 'rgba(0,0,0,.95)')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      // fiber holding the droplet
      ctx.strokeStyle = 'rgba(200,212,235,.35)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(cx, cy - 240)
      ctx.lineTo(cx, cy + 170)
      ctx.stroke()

      const r = 15 * (1 - 0.75 * clamp(tt / 0.95, 0, 1))

      // normal view
      ctx.globalCompositeOperation = 'lighter'
      if (h > 0.01) {
        if (!earth) {
          const R = 62 * (0.6 + 0.4 * h)
          const rg = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, R * 1.35)
          rg.addColorStop(0, 'rgba(76,201,240,0)')
          rg.addColorStop(0.5, `rgba(76,201,240,${0.8 * h})`)
          rg.addColorStop(1, 'rgba(60,110,255,0)')
          ctx.fillStyle = rg
          ctx.fillRect(cx - 100, cy - 100, 200, 200)
        } else {
          const Hh = 190 * Math.sqrt(h)
          const wd = 58 * (0.5 + 0.5 * h)
          const f = Math.sin(time * 9) * 5 + Math.sin(time * 17) * 2.5
          const top = cy - Hh
          const lg = ctx.createLinearGradient(0, top, 0, cy + 18)
          lg.addColorStop(0, 'rgba(255,107,44,0)')
          lg.addColorStop(0.35, `rgba(255,107,44,${0.75 * h})`)
          lg.addColorStop(0.8, `rgba(255,179,71,${0.85 * h})`)
          lg.addColorStop(1, `rgba(76,201,240,${0.6 * h})`)
          ctx.fillStyle = lg
          ctx.shadowColor = 'rgba(255,107,44,.6)'
          ctx.shadowBlur = 30
          ctx.beginPath()
          ctx.moveTo(cx, cy + 18)
          ctx.bezierCurveTo(cx - wd, cy - 10, cx - wd * 0.7, cy - Hh * 0.55, cx + f, top)
          ctx.bezierCurveTo(cx + wd * 0.7, cy - Hh * 0.55, cx + wd, cy - 10, cx, cy + 18)
          ctx.fill()
          ctx.shadowBlur = 0
        }
      }
      if (c > 0.01) {
        // the cool flame: present, but almost nothing to see
        const rc = ctx.createRadialGradient(cx, cy, 95, cx, cy, 150)
        rc.addColorStop(0, 'rgba(150,170,255,0)')
        rc.addColorStop(0.5, `rgba(150,170,255,${0.05 * c})`)
        rc.addColorStop(1, 'rgba(150,170,255,0)')
        ctx.fillStyle = rc
        ctx.fillRect(cx - 160, cy - 160, 320, 320)
      }
      ctx.globalCompositeOperation = 'source-over'

      // false-color temperature map
      if (rRef.current) {
        if (h > 0.01) {
          if (!earth) heat(cx, cy, 62 * (0.6 + 0.4 * h), 300 + 1400 * h, 20, 190)
          else {
            ctx.save()
            ctx.translate(cx, cy - 75)
            ctx.scale(0.62, 1.5)
            heat(0, 0, 60, 300 + 1400 * h, 22, 150)
            ctx.restore()
          }
        }
        if (c > 0.01) heat(cx, cy, 118, 300 + 350 * c, 16, 190)
        const d = rtl ? -1 : 1
        if (!earth && h > 0.5) label(cx + 44 * d, cy - 44, cx + 120 * d, cy - 100, str.hotLabel, h, rtl)
        if (earth && h > 0.5) label(cx + 34 * d, cy - 110, cx + 90 * d, cy - 160, str.hotLabel, h, rtl)
        if (c > 0.4) label(cx + 84 * d, cy + 84, cx + 130 * d, cy + 150, str.coolLabel, c, rtl)

        const lx = rtl ? W - 200 : 20
        const lg2 = ctx.createLinearGradient(lx, 0, lx + 180, 0)
        for (let k = 0; k <= 10; k++) {
          const [R, G, B] = tempColor(300 + (1500 * k) / 10)
          lg2.addColorStop(k / 10, `rgb(${R | 0},${G | 0},${B | 0})`)
        }
        ctx.fillStyle = lg2
        ctx.fillRect(lx, H - 34, 180, 10)
        ctx.fillStyle = 'rgba(255,255,255,.8)'
        ctx.font = font(12)
        ctx.textAlign = 'left'
        ctx.fillText('300 K', lx, H - 10)
        ctx.textAlign = 'right'
        ctx.fillText('1,800 K', lx + 180, H - 10)
      }

      // droplet
      const dg = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 1, cx, cy, r)
      dg.addColorStop(0, 'rgba(255,248,225,.95)')
      dg.addColorStop(1, 'rgba(210,190,130,.9)')
      ctx.fillStyle = dg
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill()

      // badges
      ctx.fillStyle = 'rgba(255,255,255,.75)'
      ctx.font = font(13)
      ctx.textAlign = rtl ? 'right' : 'left'
      ctx.fillText(rRef.current ? str.badgeFalse : str.badgeNormal, rtl ? W - 20 : 20, 30)
      ctx.textAlign = rtl ? 'left' : 'right'
      ctx.fillText(earth ? str.g1 : str.g0, rtl ? 20 : W - 20, 30)

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  const { h, c } = levels(t, gravity)
  const peak = Math.max(300 + 1400 * h, 300 + 350 * c)
  const eyeIdx = h > 0.6 ? 0 : h > 0.02 ? 1 : c > 0.1 ? 2 : 3
  const stage = t < 0.4 ? 0 : t < 0.52 ? 1 : 2
  const story = s.story[`${stage}${gravity}` as keyof Strings['story']]
  const noHeat = h < 0.01 && c < 0.01
  const earth = gravity === 'earth'

  const onPlay = () => {
    if (t >= 1) {
      tRef.current = 0
      setT(0)
      setPlaying(true)
    } else setPlaying(!playing)
  }

  const switchCls = (on: boolean) =>
    `relative h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors ${
      on ? 'border-flame bg-flame/30' : 'border-white/20 bg-white/10'
    }`
  const knobCls = (on: boolean) =>
    `absolute top-[3px] left-[3px] h-4 w-4 rounded-full transition-transform ${
      on ? 'translate-x-[20px] bg-flame' : 'bg-ink'
    }`

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[22rem_1fr]">
      <div className="glass space-y-6 p-5 lg:sticky lg:top-28">
        <h2 className={`${mono} text-[11px] text-flame`}>{s.controls}</h2>

        <div>
          <p className={`${mono} mb-3 text-[10px] text-muted`}>{s.gravity}</p>
          <div className="flex items-center gap-3 text-sm">
            <button
              type="button"
              onClick={() => setGravity('micro')}
              className={`cursor-pointer ${!earth ? 'font-semibold text-ink' : 'text-muted hover:text-ink'}`}
            >
              {s.micro}
            </button>
            <button
              type="button"
              role="switch"
              aria-checked={earth}
              aria-label={s.earth}
              onClick={() => setGravity((g) => (g === 'earth' ? 'micro' : 'earth'))}
              className={switchCls(earth)}
            >
              <span className={knobCls(earth)} />
            </button>
            <button
              type="button"
              onClick={() => setGravity('earth')}
              className={`cursor-pointer ${earth ? 'font-semibold text-ink' : 'text-muted hover:text-ink'}`}
            >
              {s.earth}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-ink">{reveal ? s.hide : s.reveal}</span>
          <button
            type="button"
            role="switch"
            aria-checked={reveal}
            aria-label={s.reveal}
            onClick={() => setReveal(!reveal)}
            className={switchCls(reveal)}
          >
            <span className={knobCls(reveal)} />
          </button>
        </div>

        <button
          type="button"
          onClick={onPlay}
          className={`${mono} w-full cursor-pointer bg-flame px-5 py-3 text-[11px] font-bold text-space shadow-[0_0_28px_rgba(255,107,44,0.3)]`}
        >
          {playing ? s.pause : t >= 1 ? s.replay : s.play}
        </button>

        <div>
          <label htmlFor="invisible-flame-time" className={`${mono} mb-2 block text-[10px] text-muted`}>
            {s.timeline}
          </label>
          <input
            id="invisible-flame-time"
            type="range"
            min={0}
            max={1000}
            value={Math.round(t * 1000)}
            onChange={(e) => {
              const v = Number(e.target.value) / 1000
              tRef.current = v
              setT(v)
              setPlaying(false)
            }}
            aria-label={s.marks.join(' / ')}
            className="w-full cursor-pointer accent-flame"
          />
          <div className="mt-1 flex justify-between text-[10px] text-muted/80">
            {s.marks.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
          <div>
            <div className={`${mono} mb-1 text-[9px] text-muted`}>{s.hottest}</div>
            <div className="font-mono text-lg font-semibold text-flame">
              {noHeat ? s.ambient : `${(Math.round(peak / 10) * 10).toLocaleString('en-US')} K`}
            </div>
          </div>
          <div>
            <div className={`${mono} mb-1 text-[9px] text-muted`}>{s.seen}</div>
            <div className="text-lg font-semibold text-blueflame">{s.eye[eyeIdx]}</div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="glass overflow-hidden">
          <canvas
            ref={canvasRef}
            className="block h-auto w-full"
            width={W}
            height={H}
            role="img"
            aria-label={s.title}
          />
        </div>
        <div className="glass p-5">
          <p className="min-h-[3.5em] text-sm leading-relaxed" aria-live="polite">
            {story}
          </p>
          <p className="mt-4 border-t border-white/10 pt-4 text-[11px] leading-snug text-muted">{s.note}</p>
        </div>
      </div>
    </div>
  )
}
'@
W 'src/components/lab/Research.tsx' @'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { getConditions, getDiscoveries } from '../../lib/lab'
import type { ConditionsReply, DiscoveryReply } from '../../lib/lab'
import { FuelPicker, Notes, Pill, mono } from './ui'

const READY: Record<string, string> = { PRELIMINARY: '#34D399', LIMITED: '#FFB347', INSUFFICIENT: '#F87171' }

export default function Research({ fuels }: { fuels: string[] }) {
  const [fuel, setFuel] = useState(fuels.includes('Heptane') ? 'Heptane' : fuels[0])
  const [disc, setDisc] = useState<DiscoveryReply | null>(null)
  const [cond, setCond] = useState<ConditionsReply | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    setError('')
    setDisc(null)
    setCond(null)
    Promise.all([getDiscoveries(fuel), getConditions(fuel)])
      .then(([d, c]) => {
        if (!live) return
        setDisc(d)
        setCond(c)
      })
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : 'Could not load the research tools.'))
    return () => {
      live = false
    }
  }, [fuel])

  return (
    <div className="space-y-6">
      <div className="glass max-w-sm p-5">
        <p className={`${mono} mb-2 text-[10px] text-muted`}>Fuel</p>
        <FuelPicker fuels={fuels} value={fuel} onChange={setFuel} />
      </div>
      {error && (
        <p className="text-sm text-red-300" role="alert">
          {error}
        </p>
      )}
      {!error && (!disc || !cond) && (
        <div className="flex h-32 items-center justify-center text-muted">
          <Loader2 className="animate-spin" />
        </div>
      )}

      {disc && (
        <div className="glass space-y-4 p-5">
          <h2 className={`${mono} text-[11px] text-flame`}>Unusual pairs of tests</h2>
          <p className="text-sm text-muted">
            Pairs of NASA tests that ran under almost the same recorded conditions but burned for very different times.
            {` ${disc.condition_matched_pairs} matched pairs were screened, ${disc.total_candidates} stand out.`}
          </p>
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full min-w-[34rem] border-collapse text-left text-xs">
              <thead>
                <tr className={`${mono} border-b border-white/10 text-[9px] text-muted`}>
                  <th className="px-3 py-2 font-normal">Fuel</th>
                  <th className="px-3 py-2 font-normal">Test A</th>
                  <th className="px-3 py-2 font-normal">Test B</th>
                  <th className="px-3 py-2 font-normal">Burn A / B</th>
                  <th className="px-3 py-2 font-normal">Difference</th>
                </tr>
              </thead>
              <tbody>
                {disc.candidates.map((p) => (
                  <tr key={p.test_a + p.test_b} className="border-b border-white/5 last:border-0">
                    <td className="px-3 py-2">{p.fuel}</td>
                    <td className="px-3 py-2 font-mono text-flame">{p.test_a}</td>
                    <td className="px-3 py-2 font-mono text-flame">{p.test_b}</td>
                    <td className="px-3 py-2">
                      {p.burn_time_a_s} s / {p.burn_time_b_s} s
                    </td>
                    <td className="px-3 py-2">
                      {p.burn_time_difference_s} s ({p.burn_time_ratio}x)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Notes title="Limits" lines={disc.scientific_limitations} />
        </div>
      )}

      {cond && (
        <div className="glass space-y-4 p-5">
          <h2 className={`${mono} text-[11px] text-flame`}>Conditions with the shortest observed burns</h2>
          {cond.recommendations.length === 0 ? (
            <p className="text-sm text-muted">Not enough repeated tests for this fuel.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full min-w-[34rem] border-collapse text-left text-xs">
                <thead>
                  <tr className={`${mono} border-b border-white/10 text-[9px] text-muted`}>
                    <th className="px-3 py-2 font-normal">Oxygen</th>
                    <th className="px-3 py-2 font-normal">mmHg</th>
                    <th className="px-3 py-2 font-normal">Droplet mm</th>
                    <th className="px-3 py-2 font-normal">Tests</th>
                    <th className="px-3 py-2 font-normal">Median burn</th>
                    <th className="px-3 py-2 font-normal">Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {cond.recommendations.map((r, i) => (
                    <tr key={i} className="border-b border-white/5 last:border-0">
                      <td className="px-3 py-2">{(r.oxygen_fraction * 100).toFixed(0)}%</td>
                      <td className="px-3 py-2">{r.pressure_mmhg.toFixed(0)}</td>
                      <td className="px-3 py-2">{r.droplet_diameter_mm}</td>
                      <td className="px-3 py-2">{r.matched_experiments}</td>
                      <td className="px-3 py-2">{r.median_burn_time_s} s</td>
                      <td className="px-3 py-2">
                        <Pill text={r.evidence_readiness} color={READY[r.evidence_readiness] ?? '#8A94A8'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-[11px] text-muted">
            A shorter burn in the lab does not mean lower fire risk. This is a ranking of recorded tests only.
          </p>
          <Notes title="Limits" lines={cond.limitations} />
        </div>
      )}
    </div>
  )
}
'@
W 'src/components/lab/ResultCard.tsx' @'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import type { Risk, ScenarioBlock, Support } from '../../lib/lab'
import { INPUT_LABEL } from '../../lib/lab'
import FlameStage from './FlameStage'
import Explain from './Explain'

const mono = 'font-mono uppercase tracking-[0.25em]'

const SUPPORT: Record<Support, { text: string; color: string }> = {
  CLOSE_MATCH: { text: 'Close match', color: '#34D399' },
  APPROXIMATE_MATCH: { text: 'Approximate match', color: '#FFB347' },
  WEAK_MATCH: { text: 'Weak match', color: '#F87171' },
}

// cool to hot: a longer flame is not "bad", it is just a longer-lasting flame
const LEVEL_COLOR = { LOW: '#4CC9F0', MEDIUM: '#FFB347', HIGH: '#FF6B2C' }

function RiskMeter({ risk }: { risk: Risk }) {
  if (risk.level === 'NOT_ASSESSED') {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-muted">
        <span className={`${mono} mb-1 block text-[10px] text-ink`}>Not classified</span>
        {risk.reason ?? 'Not enough evidence to classify this scenario.'}
      </div>
    )
  }
  const levels = ['LOW', 'MEDIUM', 'HIGH'] as const
  const b = risk.basis
  return (
    <div>
      <div className="mb-2 grid grid-cols-3 gap-1.5">
        {levels.map((l) => (
          <div
            key={l}
            className={`${mono} rounded-md border py-2 text-center text-[10px] transition-colors`}
            style={
              risk.level === l
                ? { color: '#0B0F1A', background: LEVEL_COLOR[l], borderColor: LEVEL_COLOR[l], fontWeight: 700 }
                : { color: '#8A94A8', borderColor: 'rgba(255,255,255,0.1)' }
            }
          >
            {l}
          </div>
        ))}
      </div>
      {b && (
        <p className="text-xs leading-relaxed text-muted">
          Median burn time {b.matched_median_burn_time_s} s. Low is up to {b.fuel_low_threshold_s} s and high is from{' '}
          {b.fuel_high_threshold_s} s, compared with the other NASA tests for this fuel.
        </p>
      )}
    </div>
  )
}

function Factors({ risk }: { risk: Risk }) {
  const list = risk.influencing_factors ?? []
  if (list.length === 0) return null
  return (
    <div className="space-y-3">
      {list.map((f) => (
        <div key={f.variable}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-ink">{INPUT_LABEL[f.variable] ?? f.variable}</span>
            <span className="font-mono text-muted">r = {f.spearman_r}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-flame"
              initial={{ width: 0 }}
              animate={{ width: Math.abs(f.spearman_r) * 100 + '%' }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <p className="mt-1 text-[11px] leading-snug text-muted">{f.description}</p>
        </div>
      ))}
    </div>
  )
}

function Heading({ children }: { children: string }) {
  return <p className={`${mono} mt-6 mb-3 text-[10px] text-muted`}>{children}</p>
}

export default function ResultCard({ title, block }: { title: string; block: ScenarioBlock }) {
  const { result: r, risk_indicator: risk, flame_data: flame } = block

  if (r.status !== 'OK' || !r.summary) {
    return (
      <div className="glass p-5" role="alert">
        <h2 className={`${mono} mb-3 text-[11px] text-flame`}>{title}</h2>
        <p className="text-sm text-ink">These inputs are outside what the NASA tests cover.</p>
        <ul className="mt-2 list-disc pl-5 text-sm text-muted">
          {(r.errors ?? []).map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </div>
    )
  }

  const s = r.summary
  const sup = r.support_level ? SUPPORT[r.support_level] : null

  return (
    <div className="glass p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className={`${mono} text-[11px] text-flame`}>{title}</h2>
        {sup && (
          <span
            className={`${mono} rounded-full border px-2.5 py-1 text-[9px]`}
            style={{ color: sup.color, borderColor: sup.color + '66', background: sup.color + '1A' }}
          >
            {sup.text}
          </span>
        )}
      </div>

      {flame && <FlameStage data={flame} fuel={block.inputs.fuel} />}

      <div className="mt-5 grid grid-cols-3 gap-3">
        <div>
          <div className={`${mono} mb-1 text-[9px] text-muted`}>Burn time</div>
          <div className="text-2xl font-extrabold text-flame">{s.burn_time_s.median} s</div>
        </div>
        <div>
          <div className={`${mono} mb-1 text-[9px] text-muted`}>Range</div>
          <div className="text-sm font-semibold">
            {s.burn_time_s.min} to {s.burn_time_s.max} s
          </div>
        </div>
        <div>
          <div className={`${mono} mb-1 text-[9px] text-muted`}>NASA tests used</div>
          <div className="text-sm font-semibold">{s.tests_used}</div>
        </div>
      </div>

      <Heading>Relative flame persistence</Heading>
      <RiskMeter risk={risk} />
      <p className="mt-2 text-[11px] text-muted/80">Not a fire-risk probability. No fire-risk score is calculated.</p>

      {risk.influencing_factors && risk.influencing_factors.length > 0 && (
        <>
          <Heading>What goes with longer burn times</Heading>
          <Factors risk={risk} />
        </>
      )}

      <Heading>Closest NASA tests</Heading>
      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full min-w-[26rem] border-collapse text-left text-xs">
          <thead>
            <tr className={`${mono} border-b border-white/10 text-[9px] text-muted`}>
              <th className="px-3 py-2 font-normal">Test</th>
              <th className="px-3 py-2 font-normal">O2</th>
              <th className="px-3 py-2 font-normal">mmHg</th>
              <th className="px-3 py-2 font-normal">mm</th>
              <th className="px-3 py-2 font-normal">Burn</th>
            </tr>
          </thead>
          <tbody>
            {(r.matched_tests ?? []).map((m) => (
              <tr key={m.test_id} className="border-b border-white/5 last:border-0">
                <td className="px-3 py-2">
                  <Link to={'/dashboard?exp=' + encodeURIComponent(m.test_id)} className="font-mono text-flame hover:underline">
                    {m.test_id}
                  </Link>
                </td>
                <td className="px-3 py-2">{(m.o2_fraction * 100).toFixed(0)}%</td>
                <td className="px-3 py-2">{m.pressure_mmhg.toFixed(0)}</td>
                <td className="px-3 py-2">{m.droplet_diameter_mm}</td>
                <td className="px-3 py-2">{m.burn_time_s} s</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Heading>In plain words</Heading>
      <ul className="space-y-2 text-sm leading-relaxed text-ink/90">
        {block.explanation.explanation.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>

      {r.warnings && r.warnings.length > 0 && (
        <ul className="mt-4 space-y-1 text-[11px] text-ember">
          {r.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      <Explain scenario={block.inputs} />
    </div>
  )
}
'@
W 'src/components/lab/ScenarioControls.tsx' @'
import type { InputKey, LabConfig, Scenario } from '../../lib/lab'

const mono = 'font-mono uppercase tracking-[0.25em]'

interface SliderSpec {
  key: InputKey
  label: string
  step: number
  show: (v: number) => string
}

const SLIDERS: SliderSpec[] = [
  { key: 'o2_fraction', label: 'Oxygen', step: 0.005, show: (v) => (v * 100).toFixed(1) + ' %' },
  { key: 'pressure_mmhg', label: 'Pressure', step: 1, show: (v) => v.toFixed(0) + ' mmHg' },
  { key: 'droplet_diameter_mm', label: 'Droplet diameter', step: 0.01, show: (v) => v.toFixed(2) + ' mm' },
]

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

interface Props {
  title: string
  value: Scenario
  config: LabConfig
  onChange: (s: Scenario) => void
}

export default function ScenarioControls({ title, value, config, onChange }: Props) {
  const preset = () =>
    onChange({
      ...value,
      o2_fraction: clamp(0.21, config.ranges.o2_fraction.min, config.ranges.o2_fraction.max),
      pressure_mmhg: clamp(760, config.ranges.pressure_mmhg.min, config.ranges.pressure_mmhg.max),
    })

  return (
    <div className="glass p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className={`${mono} text-[11px] text-flame`}>{title}</h2>
        <button
          onClick={preset}
          className={`${mono} cursor-pointer border border-white/20 px-3 py-1.5 text-[9px] text-muted transition-colors hover:border-flame hover:text-flame`}
        >
          Normal air
        </button>
      </div>

      <p className={`${mono} mb-2 text-[10px] text-muted`}>Fuel</p>
      <div className="mb-5 flex gap-2" role="radiogroup" aria-label="Fuel">
        {config.fuels.map((f) => (
          <button
            key={f}
            role="radio"
            aria-checked={value.fuel === f}
            onClick={() => onChange({ ...value, fuel: f })}
            className={`flex-1 cursor-pointer rounded-lg border px-3 py-2.5 text-sm transition-colors ${
              value.fuel === f
                ? 'border-flame bg-flame/15 font-semibold text-ink'
                : 'border-white/10 text-muted hover:border-white/30 hover:text-ink'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-5">
        {SLIDERS.map((s) => {
          const r = config.ranges[s.key]
          const id = title + s.key
          return (
            <div key={s.key}>
              <div className="mb-2 flex items-baseline justify-between">
                <label htmlFor={id} className={`${mono} text-[10px] text-muted`}>
                  {s.label}
                </label>
                <span className="font-mono text-sm font-semibold text-ink">{s.show(value[s.key])}</span>
              </div>
              <input
                id={id}
                type="range"
                min={r.min}
                max={r.max}
                step={s.step}
                value={value[s.key]}
                onChange={(e) => onChange({ ...value, [s.key]: Number(e.target.value) })}
                className="w-full cursor-pointer accent-flame"
              />
              <div className="mt-1 flex justify-between text-[10px] text-muted/70">
                <span>{s.show(r.min)}</span>
                <span>{s.show(r.max)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
'@
W 'src/components/lab/ui.tsx' @'
export const mono = 'font-mono uppercase tracking-[0.25em]'

export function Pill({ text, color }: { text: string; color: string }) {
  return (
    <span
      className={`${mono} rounded-full border px-2.5 py-1 text-[9px]`}
      style={{ color, borderColor: color + '66', background: color + '1A' }}
    >
      {text.replace(/_/g, ' ')}
    </span>
  )
}

export function Notes({ title, lines }: { title: string; lines?: string[] }) {
  if (!lines || lines.length === 0) return null
  return (
    <div>
      <p className={`${mono} mb-2 text-[10px] text-muted`}>{title}</p>
      <ul className="space-y-1.5 text-sm leading-relaxed text-ink/90">
        {lines.map((l, i) => (
          <li key={i} className="border-l border-white/10 pl-3">
            {l}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className={`${mono} mb-1 text-[9px] text-muted`}>{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  )
}

export function FuelPicker({ fuels, value, onChange }: { fuels: string[]; value: string; onChange: (f: string) => void }) {
  return (
    <div className="flex gap-2" role="radiogroup" aria-label="Fuel">
      {fuels.map((f) => (
        <button
          key={f}
          role="radio"
          aria-checked={value === f}
          onClick={() => onChange(f)}
          className={`flex-1 cursor-pointer rounded-lg border px-3 py-2.5 text-sm transition-colors ${
            value === f
              ? 'border-flame bg-flame/15 font-semibold text-ink'
              : 'border-white/10 text-muted hover:border-white/30 hover:text-ink'
          }`}
        >
          {f}
        </button>
      ))}
    </div>
  )
}
'@
W 'src/lib/lab.ts' @'
// Virtual Lab + FlameGuard X research tools: talks to the backend routes under /api

const BASE: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export type InputKey = 'o2_fraction' | 'pressure_mmhg' | 'droplet_diameter_mm'

export interface Scenario {
  o2_fraction: number
  pressure_mmhg: number
  droplet_diameter_mm: number
  fuel: string
}

export interface LabConfig {
  ranges: Record<InputKey, { min: number; max: number }>
  fuels: string[]
  tests: number
}

export type Support = 'CLOSE_MATCH' | 'APPROXIMATE_MATCH' | 'WEAK_MATCH'

export interface MatchedTest {
  test_id: string
  distance: number
  o2_fraction: number
  pressure_mmhg: number
  droplet_diameter_mm: number
  burn_time_s: number
}

export interface RunResult {
  status: 'OK' | 'REJECTED'
  errors?: string[]
  support_level?: Support
  summary?: {
    tests_used: number
    burn_time_s: { median: number; min: number; max: number }
    extinction_diameter_mm_median: number | null
  }
  matched_tests?: MatchedTest[]
  warnings?: string[]
}

export interface Factor {
  variable: string
  spearman_r: number
  description: string
}

export interface Risk {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'NOT_ASSESSED'
  reason?: string
  basis?: { matched_median_burn_time_s: number; fuel_low_threshold_s: number; fuel_high_threshold_s: number }
  influencing_factors?: Factor[]
  warnings?: string[]
}

export interface FlameData {
  flame_duration_s: number
  initial_droplet_diameter_mm: number
  extinction_diameter_mm: number | null
  note: string
}

export interface ScenarioBlock {
  inputs: Scenario
  result: RunResult
  risk_indicator: Risk
  explanation: { explanation: string[] }
  flame_data: FlameData | null
}

export interface Comparison {
  inputs_that_differ: string[]
  burn_time_median_a: number
  burn_time_median_b: number
  difference_b_minus_a: number
  warnings: string[]
}

export interface LabResponse {
  status: 'OK' | 'BAD_REQUEST'
  mode: 'single' | 'compare'
  scenario_a: ScenarioBlock
  scenario_b?: ScenarioBlock
  comparison?: Comparison
  comparison_explanation?: { explanation: string[] }
  limitations: string[]
}

export interface DetectiveReply {
  status: string
  verdict: string
  reason: string
  changed_variables?: string[]
  warnings?: string[]
  research_gap?: string
  scientific_conclusion?: string
  evidence?: { scenario_a_test_ids: string[]; scenario_b_test_ids: string[]; burn_time_a_s: number; burn_time_b_s: number; difference_s: number }
  actual_evidence_audit?: { alerts: string[]; note: string }
}

export interface CaseReply {
  status: string
  case_id: string
  case_title: string
  case_question: string
  case_status: string
  final_message: string
  scenario_a: Scenario
  scenario_b: Scenario
  investigation: DetectiveReply
  next_experiment: {
    status: string
    research_question?: string
    variable_to_change?: string
    variables_to_control?: string[]
    suggested_design?: string
    measurements?: string[]
    scientific_limitations?: string
    reason?: string
  }
}

export interface CombustionExplanation {
  fuel: string
  oxygen_percentage: number
  pressure_mmhg: number
  oxygen_partial_pressure_mmhg: number
  droplet_diameter_mm: number
  scientific_explanation: {
    fuel_role: string
    oxygen_pressure_interaction: string
    pressure_role: string
    droplet_role: string
    microgravity_role: string
  }
  why_review_before_repeating: string
  evidence_level: string
  limitations: string[]
}

export interface GapCell {
  oxygen_min: number
  oxygen_max: number
  pressure_min: number
  pressure_max: number
  experiment_count: number
  status: 'GAP' | 'COVERED'
}

export interface GapCandidate {
  oxygen_fraction: number
  pressure_mmhg: number
  status: string
  selection_reason: string
  estimated_burn_time_s: number | null
  neighbor_IQR_s: number | null
  prediction_status: string
}

export interface GapReply {
  fuel: string
  total_experiments: number
  total_regions: number
  covered_regions: number
  gap_regions: number
  coverage_percentage: number
  coverage_map: GapCell[]
  next_experiment_candidates: GapCandidate[]
  limitations: string[]
}

export interface DiscoveryPair {
  fuel: string
  test_a: string
  test_b: string
  burn_time_a_s: number
  burn_time_b_s: number
  burn_time_difference_s: number
  burn_time_ratio: number
  missing_extinction_measurements: number
}

export interface DiscoveryReply {
  status: string
  evaluated_pairs: number
  condition_matched_pairs: number
  total_candidates: number
  candidates: DiscoveryPair[]
  scientific_limitations: string[]
}

export interface ConditionGroup {
  oxygen_fraction: number
  pressure_mmhg: number
  droplet_diameter_mm: number
  matched_experiments: number
  median_burn_time_s: number
  burn_time_range_s: number
  evidence_readiness: string
  interpretation: string
}

export interface ConditionsReply {
  status: string
  fuel: string
  total_candidate_groups?: number
  recommendations: ConditionGroup[]
  limitations?: string[]
}

function messageFrom(data: unknown, status: number): string {
  const d = data as { errors?: string[]; detail?: unknown } | null
  if (d?.errors?.length) return d.errors.join('; ')
  if (typeof d?.detail === 'string') return d.detail
  if (Array.isArray(d?.detail)) {
    return (d.detail as { msg?: string }[]).map((x) => x.msg ?? 'invalid input').join('; ')
  }
  return 'Server error ' + status
}

async function call<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(BASE + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  })
  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    /* keep the generic message */
  }
  if (!res.ok) throw new Error(messageFrom(data, res.status))
  return data as T
}

export const getLabConfig = () => call<LabConfig>('/api/lab/options')

export const runLab = (mode: 'single' | 'compare', a: Scenario, b: Scenario | null, signal?: AbortSignal) =>
  call<LabResponse>('/api/lab', { mode, scenario_a: a, ...(mode === 'compare' && b ? { scenario_b: b } : {}) }, signal)

export const runDetective = (a: Scenario, b: Scenario) => call<DetectiveReply>('/api/detective', { scenario_a: a, scenario_b: b })
export const getCase = () => call<CaseReply>('/api/crime-scene/oxygen-paradox')
export const getExplanation = (s: Scenario) =>
  call<CombustionExplanation>(
    '/api/combustion-explanation?' +
      new URLSearchParams({
        fuel: s.fuel,
        o2_fraction: String(s.o2_fraction),
        pressure_mmhg: String(s.pressure_mmhg),
        droplet_diameter_mm: String(s.droplet_diameter_mm),
      }).toString(),
  )
export const getGaps = (fuel: string, bins: number) =>
  call<GapReply>('/api/experimental-gaps?' + new URLSearchParams({ fuel, bins: String(bins) }).toString())
export const getDiscoveries = (fuel: string) =>
  call<DiscoveryReply>('/api/discoveries?' + new URLSearchParams({ fuel, max_results: '10' }).toString())
export const getConditions = (fuel: string) =>
  call<ConditionsReply>('/api/conditions-recommendations?' + new URLSearchParams({ fuel, top_n: '6' }).toString())

export const INPUT_LABEL: Record<string, string> = {
  o2_fraction: 'Oxygen',
  pressure_mmhg: 'Pressure',
  droplet_diameter_mm: 'Droplet diameter',
  fuel: 'Fuel',
}
'@
W 'src/pages/Lab.tsx' @'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { Loader2 } from 'lucide-react'
import { getCase, getLabConfig, runDetective, runLab } from '../lib/lab'
import type { CaseReply, DetectiveReply, LabConfig, LabResponse, Scenario } from '../lib/lab'
import ScenarioControls from '../components/lab/ScenarioControls'
import ResultCard from '../components/lab/ResultCard'
import CompareSummary from '../components/lab/CompareSummary'
import GapMap from '../components/lab/GapMap'
import Research from '../components/lab/Research'
import InvisibleFlamePanel from '../components/lab/InvisibleFlamePanel'
import { CaseView, DetectiveView } from '../components/lab/Investigation'

const mono = 'font-mono uppercase tracking-[0.25em]'

type Mode = 'single' | 'compare'
type Tab = 'lab' | 'detective' | 'case' | 'gaps' | 'research' | 'invisible'

const TABS: { id: Tab; label: string; title: string; blurb: string }[] = [
  {
    id: 'lab',
    label: 'Virtual lab',
    title: 'Set up a fuel droplet flame',
    blurb:
      'Choose oxygen, pressure, droplet size and fuel. The lab finds the closest real NASA droplet tests and shows what they measured. It does not simulate or predict anything.',
  },
  {
    id: 'detective',
    label: 'Detective',
    title: 'Is this comparison fair?',
    blurb: 'Pick two scenarios. The detective checks whether the NASA evidence is strong enough to compare them.',
  },
  {
    id: 'case',
    label: 'Case file',
    title: 'The oxygen paradox',
    blurb: 'A ready-made investigation: did raising oxygen cause the change in burn time?',
  },
  {
    id: 'gaps',
    label: 'Gap map',
    title: 'Find the gaps in the NASA data',
    blurb:
      'See which conditions have been tested and which are still empty, then fill the gaps with the most useful next experiments.',
  },
  {
    id: 'research',
    label: 'Research tools',
    title: 'Unusual results and best conditions',
    blurb: 'Pairs of tests that disagree, and the conditions with the shortest observed burns.',
  },
  {
    id: 'invisible',
    label: 'Invisible flame',
    title: 'The invisible flame',
    blurb:
      'In microgravity, some flames burn at low temperature and are almost invisible. Switch the gravity, then reveal the hidden burning zones.',
  },
]

function startScenarios(c: LabConfig): [Scenario, Scenario] {
  const mid = (k: 'pressure_mmhg' | 'droplet_diameter_mm', want: number) =>
    Math.min(c.ranges[k].max, Math.max(c.ranges[k].min, want))
  const o2 = (want: number) => Math.min(c.ranges.o2_fraction.max, Math.max(c.ranges.o2_fraction.min, want))
  const fuel = c.fuels.includes('Methanol') ? 'Methanol' : c.fuels[0]
  const a: Scenario = { o2_fraction: o2(0.21), pressure_mmhg: mid('pressure_mmhg', 760), droplet_diameter_mm: mid('droplet_diameter_mm', 1.8), fuel }
  return [a, { ...a, o2_fraction: o2(0.3) }]
}

export default function Lab() {
  const [config, setConfig] = useState<LabConfig | null>(null)
  const [params] = useSearchParams()
  const [tab, setTab] = useState<Tab>(() => TABS.find((t) => t.id === params.get('tab'))?.id ?? 'lab')
  const [mode, setMode] = useState<Mode>('single')
  const [a, setA] = useState<Scenario | null>(null)
  const [b, setB] = useState<Scenario | null>(null)
  const [resp, setResp] = useState<LabResponse | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [det, setDet] = useState<DetectiveReply | null>(null)
  const [detBusy, setDetBusy] = useState(false)
  const [caseReply, setCaseReply] = useState<CaseReply | null>(null)
  const [tabError, setTabError] = useState('')
  const seq = useRef(0)

  useEffect(() => {
    let live = true
    getLabConfig()
      .then((c) => {
        if (!live) return
        const [sa, sb] = startScenarios(c)
        setConfig(c)
        setA(sa)
        setB(sb)
        setError('')
      })
      .catch(() => live && setError('Cannot reach the backend. Start it (uvicorn app.main:app --port 8000) and try again.'))
    return () => {
      live = false
    }
  }, [attempt])

  // re-run the lab shortly after any slider moves; an older answer never overwrites a newer one
  useEffect(() => {
    if (!a || !b || tab !== 'lab') return
    const id = ++seq.current
    const ctrl = new AbortController()
    setBusy(true)
    const t = window.setTimeout(() => {
      runLab(mode, a, b, ctrl.signal)
        .then((r) => {
          if (id !== seq.current) return
          setResp(r)
          setError('')
        })
        .catch((e: unknown) => {
          if (ctrl.signal.aborted || id !== seq.current) return
          setError(e instanceof Error ? e.message : 'The lab could not run.')
        })
        .finally(() => id === seq.current && setBusy(false))
    }, 250)
    return () => {
      window.clearTimeout(t)
      ctrl.abort()
    }
  }, [mode, a, b, tab])

  // the case file opens by itself the first time you visit it
  useEffect(() => {
    if (tab !== 'case' || caseReply) return
    let live = true
    setTabError('')
    getCase()
      .then((c) => live && setCaseReply(c))
      .catch((e: unknown) => live && setTabError(e instanceof Error ? e.message : 'Could not open the case file.'))
    return () => {
      live = false
    }
  }, [tab, caseReply])

  async function investigate() {
    if (!a || !b) return
    setDetBusy(true)
    setTabError('')
    try {
      setDet(await runDetective(a, b))
    } catch (e) {
      setTabError(e instanceof Error ? e.message : 'The detective could not run.')
    } finally {
      setDetBusy(false)
    }
  }

  const compare = mode === 'compare'
  const cur = TABS.find((t) => t.id === tab) ?? TABS[0]

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-6 pt-28 pb-24">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className={`${mono} mb-2 text-[10px] text-flame`}>FlameGuard X &middot; NASA PSI-69</p>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{cur.title}</h1>
            <p className="mt-3 max-w-xl text-sm text-muted">{cur.blurb}</p>
          </div>
          {tab === 'lab' && (
            <div className="flex rounded-full border border-white/10 bg-white/[0.03] p-1" role="tablist">
              {(['single', 'compare'] as const).map((m) => (
                <button
                  key={m}
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => setMode(m)}
                  className={`${mono} cursor-pointer rounded-full px-5 py-2 text-[10px] transition-colors ${
                    mode === m ? 'bg-flame text-space' : 'text-muted hover:text-ink'
                  }`}
                >
                  {m === 'single' ? 'One scenario' : 'Compare two'}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mb-8 flex max-w-full flex-wrap gap-1 rounded-3xl border border-white/10 bg-white/[0.03] p-1 sm:w-fit sm:rounded-full" role="navigation" aria-label="Lab sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id)
                setTabError('')
              }}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`${mono} cursor-pointer rounded-full px-5 py-2.5 text-[10px] transition-colors ${
                tab === t.id ? 'bg-flame text-space' : 'text-muted hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && !resp && tab !== 'invisible' && (
          <div className="glass mx-auto max-w-lg p-8 text-center" role="alert">
            <p className="mb-5 text-sm text-ink">{error}</p>
            <button
              onClick={() => setAttempt((n) => n + 1)}
              className={`${mono} cursor-pointer bg-flame px-6 py-3 text-[11px] font-bold text-space`}
            >
              Retry
            </button>
          </div>
        )}

        {tab === 'invisible' && (
          <motion.div key="invisible" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
            <InvisibleFlamePanel />
          </motion.div>
        )}

        {tab !== 'invisible' && config && a && b && (
          <motion.div key={tab} className="space-y-6" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
            {tabError && (
              <p className="text-sm text-ember" role="alert">
                {tabError}
              </p>
            )}

            {tab === 'lab' && (
              <>
                {error && resp && (
                  <p className="text-sm text-ember" role="alert">
                    {error}
                  </p>
                )}

                {compare ? (
                  <div className="grid gap-6 md:grid-cols-2">
                    <ScenarioControls title="Scenario A" value={a} config={config} onChange={setA} />
                    <ScenarioControls title="Scenario B" value={b} config={config} onChange={setB} />
                  </div>
                ) : null}

                <div className={compare ? '' : 'grid items-start gap-6 lg:grid-cols-[22rem_1fr]'}>
                  {!compare && (
                    <div className="lg:sticky lg:top-28">
                      <ScenarioControls title="Scenario" value={a} config={config} onChange={setA} />
                    </div>
                  )}

                  <div className={`transition-opacity ${busy ? 'opacity-60' : 'opacity-100'}`}>
                    {!resp ? (
                      <div className="glass h-64 animate-pulse" aria-busy="true" />
                    ) : compare && resp.scenario_b ? (
                      <div className="space-y-6">
                        {resp.comparison && (
                          <CompareSummary c={resp.comparison} lines={resp.comparison_explanation?.explanation ?? []} />
                        )}
                        <div className="grid items-start gap-6 md:grid-cols-2">
                          <ResultCard title="Scenario A" block={resp.scenario_a} />
                          <ResultCard title="Scenario B" block={resp.scenario_b} />
                        </div>
                      </div>
                    ) : (
                      <ResultCard title="Result" block={resp.scenario_a} />
                    )}
                  </div>
                </div>

                {resp && (
                  <div className="glass p-5">
                    <p className={`${mono} mb-3 text-[10px] text-muted`}>Limits of this lab</p>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
                      {resp.limitations.map((l) => (
                        <li key={l}>{l}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            {tab === 'detective' && (
              <>
                <div className="grid gap-6 md:grid-cols-2">
                  <ScenarioControls title="Scenario A" value={a} config={config} onChange={setA} />
                  <ScenarioControls title="Scenario B" value={b} config={config} onChange={setB} />
                </div>
                <button
                  onClick={investigate}
                  disabled={detBusy}
                  className={`${mono} flex cursor-pointer items-center gap-2 bg-flame px-7 py-3.5 text-[11px] font-bold text-space shadow-[0_0_28px_rgba(255,107,44,0.35)] disabled:cursor-wait disabled:opacity-70`}
                >
                  {detBusy && <Loader2 size={15} className="animate-spin" />}
                  Investigate
                </button>
                {det && (
                  <div className="max-w-3xl">
                    {det.status === 'OK' ? (
                      <DetectiveView d={det} />
                    ) : (
                      <div className="glass p-5 text-sm" role="alert">
                        <p className="mb-1 font-semibold">{det.verdict}</p>
                        <p className="text-muted">{det.reason}</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {tab === 'case' &&
              (caseReply ? (
                <div className="max-w-3xl">
                  <CaseView c={caseReply} />
                </div>
              ) : (
                !tabError && (
                  <div className="flex h-32 items-center justify-center text-muted">
                    <Loader2 className="animate-spin" />
                  </div>
                )
              ))}

            {tab === 'gaps' && <GapMap fuels={config.fuels} />}
            {tab === 'research' && <Research fuels={config.fuels} />}
          </motion.div>
        )}
      </div>
    </div>
  )
}
'@

# ---- make /invisible-flame open the lab tab (and drop the floating button) ----
$routesPath = Join-Path $root 'src/AppRoutes.tsx'
if (Test-Path $routesPath) {
  $orig = [System.IO.File]::ReadAllText($routesPath)
  $t = $orig -replace "`r`n", "`n"
  if ($t.Contains('tab=invisible')) {
    Write-Host 'AppRoutes: already sends /invisible-flame to the lab'
  } elseif ($t.Contains('InvisibleFlame')) {
    $t = $t.Replace("import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'", "import { Navigate, Route, Routes, useLocation } from 'react-router-dom'")
    $t = $t.Replace("import InvisibleFlame from './pages/InvisibleFlame'`n", '')
    $t = $t.Replace('<Route path="/invisible-flame" element={<InvisibleFlame />} />', '<Route path="/invisible-flame" element={<Navigate to="/lab?tab=invisible" replace />} />')
    $t = [regex]::Replace($t, '(?s)// Floating shortcut.*?\n\}\n\n', '')
    $t = [regex]::Replace($t, "(?m)^[ ]*\{location\.pathname !== '/invisible-flame' && <FlameLink />\}\n\n", '')
    if (($t -match 'tab=invisible') -and ($t -notmatch 'FlameLink') -and ($t -cnotmatch 'InvisibleFlame')) {
      Copy-Item $routesPath (Join-Path $root 'src/AppRoutes.backup.tsx') -Force
      [System.IO.File]::WriteAllText($routesPath, ($t -replace "`n", "`r`n"), $utf8)
      Write-Host 'AppRoutes: /invisible-flame now opens the lab tab (backup: src/AppRoutes.backup.tsx)'
    } else {
      Write-Host 'NOTE: src/AppRoutes.tsx was left as it is. The lab still has the tab: open http://localhost:5173/lab?tab=invisible' -ForegroundColor Yellow
    }
  } else {
    Write-Host 'AppRoutes: no invisible-flame route found, nothing to change'
  }
  if (-not ([System.IO.File]::ReadAllText($routesPath)).Contains('pages/Lab')) {
    Write-Host "WARNING: src/AppRoutes.tsx has no Lab route. Add: import Lab from './pages/Lab'  and  <Route path=""/lab"" element={<Lab />} />" -ForegroundColor Yellow
  }
}
Write-Host ''
Write-Host 'DONE. The dev server reloads by itself. Open http://localhost:5173/lab (Ctrl+F5).' -ForegroundColor Green
Write-Host 'Backend must be the FlameGuard X one (check http://localhost:8000/api/lab/options and /api/experimental-gaps).'
