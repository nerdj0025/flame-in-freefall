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