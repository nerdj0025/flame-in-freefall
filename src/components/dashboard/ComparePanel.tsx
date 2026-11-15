import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { X } from 'lucide-react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Experiment } from '../../lib/api'
import { UNITS } from '../../lib/api'
import { COMPARE_COLORS, formatValue, labelOf, labelWithUnit, valueOf } from '../../lib/dashboard'
import { AXIS, GRID, TICK, TOOLTIP, axisLabel } from './chartTheme'
import { EmptyNote } from './ChartCard'

const mono = 'font-mono uppercase tracking-[0.25em]'
const ORDER = ['gravityLevel', 'fuel', 'flameType', 'pressure', 'oxygenPercent', 'spreadRate', 'peakTemperature', 'maxFlameSize', 'extinguished']
const SKIP = ['id', 'title', 'series']

type Metric = 'flameSize' | 'temperature'

export default function ComparePanel({ experiments, onClose }: { experiments: Experiment[]; onClose: () => void }) {
  const [metric, setMetric] = useState<Metric>('flameSize')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  // one row per point index, one column per experiment
  const rows = useMemo(() => {
    const len = Math.max(0, ...experiments.map((e) => e.series?.length ?? 0))
    return Array.from({ length: len }, (_, i) => {
      const row: Record<string, number | undefined> = {}
      for (const e of experiments) {
        const p = e.series?.[i]
        if (p) {
          row[e.id] = p[metric]
          if (row.time === undefined) row.time = p.time
        }
      }
      return row
    })
  }, [experiments, metric])

  const keys = useMemo(() => {
    const set = new Set<string>()
    for (const e of experiments) for (const k of Object.keys(e)) if (!SKIP.includes(k)) set.add(k)
    const rest = [...set].filter((k) => !ORDER.includes(k)).sort()
    return [...ORDER.filter((k) => set.has(k)), ...rest]
  }, [experiments])

  return (
    <motion.div
      className="fixed inset-0 z-[60] overflow-y-auto bg-black/80 p-4 sm:p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-label="Compare experiments"
        className="glass mx-auto w-full max-w-6xl bg-space p-6"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className={`${mono} mb-1 text-[10px] text-flame`}>Compare mode</p>
            <h2 className="text-2xl font-bold">{experiments.length} experiments side by side</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="cursor-pointer text-muted hover:text-flame">
            <X size={22} />
          </button>
        </div>

        {/* overlaid curves */}
        <div className="mb-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className={`${mono} text-[10px] text-muted`}>{labelWithUnit(metric)} over time</p>
            <div className="flex rounded-full border border-white/10 bg-white/[0.03] p-1">
              {(['flameSize', 'temperature'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={`${mono} cursor-pointer rounded-full px-4 py-1.5 text-[10px] transition-colors ${
                    metric === m ? 'bg-flame text-space' : 'text-muted hover:text-ink'
                  }`}
                >
                  {labelOf(m)}
                </button>
              ))}
            </div>
          </div>
          <div className="h-80">
            {rows.length === 0 ? (
              <EmptyNote text="None of these experiments has time-series data." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 22, left: 4 }}>
                  <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
                  <XAxis dataKey="time" tick={TICK} stroke={AXIS} label={axisLabel(labelWithUnit('time'), 'bottom')} />
                  <YAxis tick={TICK} stroke={AXIS} width={56} label={axisLabel(labelWithUnit(metric), 'left')} />
                  <Tooltip
                    contentStyle={TOOLTIP}
                    labelFormatter={(v) => 't = ' + v + ' ' + UNITS.time}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                  {experiments.map((e, i) => (
                    <Line
                      key={e.id}
                      type="monotone"
                      dataKey={e.id}
                      name={e.id}
                      stroke={COMPARE_COLORS[i % COMPARE_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* differences table */}
        <p className={`${mono} mb-3 text-[10px] text-muted`}>Differences</p>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className={`${mono} sticky left-0 bg-space px-4 py-3 text-[10px] font-normal text-muted`}>Field</th>
                {experiments.map((e, i) => (
                  <th key={e.id} className="px-4 py-3 align-top font-normal">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: COMPARE_COLORS[i % COMPARE_COLORS.length] }}
                      />
                      <span className={`${mono} text-[10px] text-flame`}>{e.id}</span>
                    </div>
                    <div className="mt-1 text-xs font-semibold">{e.title}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => {
                const values = experiments.map((e) => valueOf(e, k))
                const differs = new Set(values.map((v) => JSON.stringify(v ?? null))).size > 1
                const nums = values.filter((v): v is number => typeof v === 'number')
                const max = differs && nums.length >= 2 ? Math.max(...nums) : undefined
                return (
                  <tr key={k} className={`border-b border-white/5 ${differs ? 'bg-flame/[0.07]' : ''}`}>
                    <td className={`${mono} sticky left-0 bg-space px-4 py-3 text-[10px] text-muted`}>
                      {labelOf(k)}
                    </td>
                    {values.map((v, i) => {
                      const top = max !== undefined && v === max
                      return (
                        <td key={experiments[i].id} className={`px-4 py-3 ${top ? 'font-bold text-flame' : ''}`}>
                          {formatValue(v, k)}
                          {top && <span className="ml-1.5 text-[10px]">{'\u25B2'} highest</span>}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">Highlighted rows differ between the selected experiments.</p>
      </motion.div>
    </motion.div>
  )
}