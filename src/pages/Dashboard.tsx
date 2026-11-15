import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useSearchParams } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
  Cell,
} from 'recharts'
import { IS_SAMPLE_DATA, getExperiments } from '../lib/api'
import type { Experiment } from '../lib/api'
import {
  average,
  colorOf,
  fmt,
  formatValue,
  labelOf,
  numOf,
  numericKeys,
  unitOf,
  uniqueValues,
  valueOf,
} from '../lib/dashboard'
import AnimatedNumber from '../components/dashboard/AnimatedNumber'
import ChartCard, { EmptyNote } from '../components/dashboard/ChartCard'
import ComparePanel from '../components/dashboard/ComparePanel'
import Drawer from '../components/dashboard/Drawer'
import Select from '../components/dashboard/Select'
import DashboardSkeleton from '../components/dashboard/Skeletons'
import { AXIS, BLUE, FLAME, GRID, TICK, TOOLTIP, axisLabel } from '../components/dashboard/chartTheme'

const mono = 'font-mono uppercase tracking-[0.25em]'
const MAX_COMPARE = 4
const PAGE = 24

// ---------- readable names for the real NASA fields ----------
const NICE: Record<string, string> = {
  oxygenPercent: 'Oxygen',
  burnTimeS: 'Burn time',
  qualityIssues: 'Data-quality issues',
  pressure: 'Pressure',
  coFinalPpm: 'CO final',
  coInitialPpm: 'CO initial',
  o2FinalPctVol: 'O2 final',
  airFlowCmS: 'Air flow',
  weightLossRateMgMin: 'Weight loss rate',
  burningRateMm2PerS: 'Burning rate',
  flameExtinctionDiameterMm: 'Flame extinction diameter',
}
const nice = (key: string) => NICE[key] ?? labelOf(key)
const niceUnit = (key: string) => {
  const u = unitOf(key)
  return u ? nice(key) + ' (' + u + ')' : nice(key)
}
const expOf = (e: Experiment) => String(valueOf(e, 'experimentId') ?? 'unknown')

// ---------- KPI tiles ----------
function KpiCard({ label, index, children }: { label: string; index: number; children: ReactNode }) {
  return (
    <motion.div
      className="glass glass-hover p-5"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
    >
      <div className={`${mono} mb-3 text-[10px] text-muted`}>{label}</div>
      <div className="text-3xl font-extrabold text-flame">{children}</div>
    </motion.div>
  )
}

function Kpi({ value, decimals, unit }: { value: number | undefined; decimals: number; unit?: string }) {
  if (value === undefined) return <span className="text-muted">n/a</span>
  return (
    <>
      <AnimatedNumber value={value} decimals={decimals} />
      {unit && <span className="ml-1.5 text-sm font-semibold text-muted">{unit}</span>}
    </>
  )
}

// ---------- chart 1: any measurement vs any other, coloured by experiment ----------
interface Point {
  x: number
  y: number
  id: string
  material: string
  exp: string
}

function ScatterTip({
  active,
  payload,
  xKey,
  yKey,
}: {
  active?: boolean
  payload?: { payload: Point }[]
  xKey: string
  yKey: string
}) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div style={TOOLTIP} className="px-3 py-2">
      <div className="font-mono text-[11px] text-flame">{p.id}</div>
      <div>{p.material}</div>
      <div className="mt-1 text-muted">
        {nice(xKey)}: {fmt(p.x, 2)} {unitOf(xKey)}
      </div>
      <div className="text-muted">
        {nice(yKey)}: {fmt(p.y, 2)} {unitOf(yKey)}
      </div>
    </div>
  )
}

function pointId(p: unknown): string | undefined {
  const o = p as { id?: string; payload?: { id?: string } }
  return o.id ?? o.payload?.id
}

// Measurements that tell a story, used to pick the default chart.
const MEANINGFUL = [
  'oxygenPercent', 'o2Percent', 'o2FinalPctVol', 'burnTimeS', 'burningRateMm2PerS',
  'weightLossRateMgMin', 'coFinalPpm', 'co2FinalPctVol', 'flameExtinctionDiameterMm', 'ignitionTimeS',
]

// The pair of measurements that the most tests have in common.
function bestPair(list: Experiment[]): [string, string] {
  const all = numericKeys(list).filter((k) => k !== 'qualityIssues')
  const keys = all.filter((k) => MEANINGFUL.includes(k))
  const pool = keys.length >= 2 ? keys : all
  const has = new Map<string, Set<string>>(
    pool.map((k) => [k, new Set(list.filter((e) => numOf(e, k) !== undefined).map((e) => e.id))]),
  )
  let best: [string, string] = [pool[0] ?? '', pool[1] ?? pool[0] ?? '']
  let top = 0
  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      const a = has.get(pool[i])!
      const b = has.get(pool[j])!
      let n = 0
      for (const id of a) if (b.has(id)) n++
      if (n > top) {
        top = n
        best = [pool[i], pool[j]]
      }
    }
  }
  return best
}

function ScatterCard({
  data,
  onOpen,
  className = '',
}: {
  data: Experiment[]
  onOpen: (id: string) => void
  className?: string
}) {
  const keys = numericKeys(data).filter((k) => k !== 'qualityIssues')
  const [xState, setX] = useState('')
  const [yState, setY] = useState('')
  const best = useMemo(() => bestPair(data), [data])
  const xKey = keys.includes(xState) ? xState : best[0]
  const yKey = keys.includes(yState) ? yState : best[1]

  const points: Point[] = []
  if (xKey && yKey) {
    for (const e of data) {
      const x = numOf(e, xKey)
      const y = numOf(e, yKey)
      if (x !== undefined && y !== undefined) points.push({ x, y, id: e.id, material: e.fuel, exp: expOf(e) })
    }
  }
  const groups = [...new Set(points.map((p) => p.exp))].sort()
  const options = keys.map((k) => ({
    value: k,
    label: nice(k) + ' (' + data.filter((e) => numOf(e, k) !== undefined).length + ' tests)',
  }))

  return (
    <ChartCard
      className={className}
      title={'Compare two measurements (' + points.length + ' tests have both)'}
      controls={
        <>
          <Select label="X axis" value={xKey ?? ''} onChange={setX} options={options} className="w-44" />
          <Select label="Y axis" value={yKey ?? ''} onChange={setY} options={options} className="w-44" />
        </>
      }
    >
      {points.length === 0 ? (
        <EmptyNote text="No tests have both of these measurements. Try another pair." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 16, bottom: 22, left: 4 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              name={nice(xKey)}
              domain={['auto', 'auto']}
              tick={TICK}
              stroke={AXIS}
              label={axisLabel(niceUnit(xKey), 'bottom')}
            />
            <YAxis
              type="number"
              dataKey="y"
              name={nice(yKey)}
              domain={['auto', 'auto']}
              tick={TICK}
              stroke={AXIS}
              width={56}
              label={axisLabel(niceUnit(yKey), 'left')}
            />
            <ZAxis range={[70, 70]} />
            <Tooltip content={<ScatterTip xKey={xKey} yKey={yKey} />} cursor={{ strokeDasharray: '3 3' }} />
            <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: 11 }} />
            {groups.map((g) => (
              <Scatter
                key={g}
                name={g}
                data={points.filter((p) => p.exp === g)}
                fill={colorOf(g)}
                onClick={(p: unknown) => {
                  const id = pointId(p)
                  if (id) onOpen(id)
                }}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}

// ---------- chart 2: average of a measurement, per experiment or material ----------
function AverageCard({ data }: { data: Experiment[] }) {
  const metrics = numericKeys(data).filter((k) => k !== 'qualityIssues')
  const [metricState, setMetric] = useState('burnTimeS')
  const [group, setGroup] = useState('experimentId')
  const metric = metrics.includes(metricState) ? metricState : metrics[0]

  const rows = metric
    ? uniqueValues(data, group)
        .map((g) => {
          const members = data.filter((e) => String(valueOf(e, group)) === g)
          const values = members.map((e) => numOf(e, metric))
          return { group: g, value: average(values), n: values.filter((v) => v !== undefined).length }
        })
        .filter((d): d is { group: string; value: number; n: number } => d.value !== undefined)
        .sort((a, b) => b.value - a.value)
        .slice(0, 12)
    : []

  return (
    <ChartCard
      title="Average by group (top 12)"
      controls={
        <>
          <Select
            label="Measurement"
            value={metric ?? ''}
            onChange={setMetric}
            options={metrics.map((k) => ({ value: k, label: nice(k) }))}
            className="w-44"
          />
          <Select
            label="Group by"
            value={group}
            onChange={setGroup}
            options={[
              { value: 'experimentId', label: 'Experiment' },
              { value: 'fuel', label: 'Material' },
            ]}
            className="w-36"
          />
        </>
      }
    >
      {rows.length === 0 ? (
        <EmptyNote text="No data for this measurement in the current selection." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 22, left: 4 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="group"
              tick={TICK}
              stroke={AXIS}
              interval={0}
              tickFormatter={(v: string) => (v.length > 10 ? v.slice(0, 9) + '…' : v)}
              label={axisLabel(group === 'fuel' ? 'Material' : 'Experiment', 'bottom')}
            />
            <YAxis tick={TICK} stroke={AXIS} width={56} label={axisLabel(niceUnit(metric), 'left')} />
            <Tooltip
                            contentStyle={TOOLTIP}
              itemStyle={{ color: '#E8ECF4' }}
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              formatter={(v, _name, item) => [
                fmt(Number(v), 2) + ' ' + unitOf(metric) + ' (' + (item.payload as { n: number }).n + ' tests)',
                'Average',
              ]}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {rows.map((d) => (
                <Cell key={d.group} fill={colorOf(d.group)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}

// ---------- chart 3: data-quality notes per experiment ----------
function QualityCard({ data }: { data: Experiment[] }) {
  const rows = [...new Set(data.map(expOf))].sort().map((g) => {
    const members = data.filter((e) => expOf(e) === g)
    return {
      group: g,
      issues: members.reduce((s, e) => s + (numOf(e, 'qualityIssues') ?? 0), 0),
      flagged: members.filter((e) => (numOf(e, 'qualityIssues') ?? 0) > 0).length,
    }
  })

  return (
    <ChartCard title="Data-quality notes per experiment">
      {rows.every((r) => r.issues === 0) ? (
        <EmptyNote text="No data-quality notes for the current selection." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 22, left: 4 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="group" tick={TICK} stroke={AXIS} label={axisLabel('Experiment', 'bottom')} />
            <YAxis tick={TICK} stroke={AXIS} width={44} allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
            <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="issues" name="Issues logged" fill={FLAME} radius={[4, 4, 0, 0]} />
            <Bar dataKey="flagged" name="Tests affected" fill={BLUE} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}

// ---------- test card ----------
function TestCard({
  e,
  index,
  selected,
  selectDisabled,
  onOpen,
  onToggle,
}: {
  e: Experiment
  index: number
  selected: boolean
  selectDisabled: boolean
  onOpen: (id: string) => void
  onToggle: (id: string) => void
}) {
  const exp = expOf(e)
  const issues = numOf(e, 'qualityIssues') ?? 0
  const stats = ['oxygenPercent', 'burnTimeS', 'qualityIssues']
  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(e.id)}
      onKeyDown={(ev) => {
        if (ev.target === ev.currentTarget && (ev.key === 'Enter' || ev.key === ' ')) {
          ev.preventDefault()
          onOpen(e.id)
        }
      }}
      className="glass glass-hover relative flex h-full cursor-pointer flex-col p-5 outline-none focus-visible:border-flame"
      style={selected ? { borderColor: 'rgba(255,107,44,0.7)' } : undefined}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: Math.min(index, 12) * 0.03, duration: 0.3 }}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className={`${mono} text-[10px] text-flame`}>{e.id}</span>
        <label
          onClick={(ev) => ev.stopPropagation()}
          title={selectDisabled ? 'Max 4' : 'Add to compare'}
          className={`${mono} flex items-center gap-2 text-[9px] text-muted ${
            selectDisabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:text-ink'
          }`}
        >
          <input
            type="checkbox"
            checked={selected}
            disabled={selectDisabled}
            onChange={() => onToggle(e.id)}
            className="h-3.5 w-3.5 cursor-pointer accent-flame disabled:cursor-not-allowed"
          />
          Compare
        </label>
      </div>
      <h3 className="mb-3 text-base leading-snug font-semibold">{e.fuel}</h3>
      <div className="mb-4 flex flex-wrap gap-2">
        <span
          className={`${mono} rounded-full border px-2.5 py-1 text-[9px]`}
          style={{ color: colorOf(exp), borderColor: colorOf(exp) + '66', background: colorOf(exp) + '1A' }}
        >
          {exp}
        </span>
        {issues > 0 && (
          <span className={`${mono} rounded-full border border-ember/50 bg-ember/10 px-2.5 py-1 text-[9px] text-ember`}>
            {issues} data note{issues > 1 ? 's' : ''}
          </span>
        )}
      </div>
      <div className="mt-auto grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
        {stats.map((k) => (
          <div key={k}>
            <div className={`${mono} mb-1 text-[8px] text-muted`}>{nice(k)}</div>
            <div className={`text-sm font-semibold ${numOf(e, k) === undefined ? 'text-muted/60' : ''}`}>
              {formatValue(numOf(e, k), k, 1)}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ---------- page ----------
const FILTER_KEYS = ['q', 'exp_filter', 'fuel', 'sort']

export default function Dashboard() {
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState<Experiment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [updated, setUpdated] = useState<Date | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [compareOpen, setCompareOpen] = useState(false)
  const [visible, setVisible] = useState(PAGE)

  const load = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true)
    try {
      const list = await getExperiments()
      setData(list)
      setUpdated(new Date())
      setError('')
      setSelected((s) => s.filter((id) => list.some((e) => e.id === id)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the experiments.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load(false)
  }, [load])

  // filters live in the URL so they can be shared
  const q = params.get('q') ?? ''
  const expFilter = params.get('exp_filter') ?? ''
  const fuel = params.get('fuel') ?? ''
  const sort = params.get('sort') ?? ''
  const expId = params.get('exp') ?? ''

  const setParam = useCallback(
    (key: string, value: string) => {
      setVisible(PAGE)
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (value) next.set(key, value)
          else next.delete(key)
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const resetFilters = () => {
    setVisible(PAGE)
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const k of FILTER_KEYS) next.delete(k)
        return next
      },
      { replace: true },
    )
  }

  const closeDrawer = useCallback(() => setParam('exp', ''), [setParam])

  const experimentsList = useMemo(() => [...new Set(data.map(expOf))].sort(), [data])
  const fuels = useMemo(() => uniqueValues(data, 'fuel'), [data])
  const sortKeys = useMemo(() => numericKeys(data), [data])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    let list = data.filter(
      (e) =>
        (!expFilter || expOf(e) === expFilter) &&
        (!fuel || e.fuel === fuel) &&
        (!needle || [e.id, e.fuel, expOf(e)].some((s) => (s ?? '').toLowerCase().includes(needle))),
    )
    if (sort) {
      list = [...list].sort((a, b) => {
        const av = numOf(a, sort)
        const bv = numOf(b, sort)
        if (av === undefined && bv === undefined) return 0
        if (av === undefined) return 1
        if (bv === undefined) return -1
        return bv - av
      })
    }
    return list
  }, [data, q, expFilter, fuel, sort])

  const kpis = useMemo(
    () => ({
      count: filtered.length,
      oxygen: average(filtered.map((e) => numOf(e, 'oxygenPercent'))),
      burn: average(filtered.map((e) => numOf(e, 'burnTimeS'))),
      flagged: filtered.length
        ? (filtered.filter((e) => (numOf(e, 'qualityIssues') ?? 0) > 0).length / filtered.length) * 100
        : undefined,
    }),
    [filtered],
  )

  const active = Boolean(q || expFilter || fuel || sort)
  const gridKey = [q, expFilter, fuel, sort].join('|')
  const openExperiment = !loading ? (data.find((e) => e.id === expId) ?? null) : null
  const selectedExperiments = selected
    .map((id) => data.find((e) => e.id === id))
    .filter((e): e is Experiment => e !== undefined)
  const showCompare = compareOpen && selectedExperiments.length >= 2

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < MAX_COMPARE ? [...s, id] : s))

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-6 pt-28 pb-36">
        {/* HEADER */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className={`${mono} mb-2 text-[10px] text-flame`}>NASA combustion &middot; analytics</p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Experiment dashboard</h1>
              {IS_SAMPLE_DATA && !loading && !error && (
                <span className={`${mono} rounded-full border border-ember/50 bg-ember/10 px-3 py-1 text-[9px] text-ember`}>
                  Sample data
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {updated && (
              <span className={`${mono} hidden text-[10px] text-muted sm:block`}>
                Updated {updated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
            <button
              onClick={() => load(true)}
              disabled={refreshing || loading}
              className={`${mono} flex cursor-pointer items-center gap-2 border border-white/25 px-4 py-2.5 text-[10px] text-ink transition-colors hover:border-flame hover:text-flame disabled:cursor-wait disabled:opacity-60`}
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <DashboardSkeleton />
        ) : error ? (
          <div className="glass mx-auto max-w-lg p-8 text-center" role="alert">
            <h2 className="mb-2 text-xl font-bold">Could not load the experiments</h2>
            <p className="mb-6 text-sm text-muted">{error}</p>
            <button
              onClick={() => {
                setLoading(true)
                load(false)
              }}
              className={`${mono} cursor-pointer bg-flame px-6 py-3 text-[11px] font-bold text-space`}
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* KPIs */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="Tests" index={0}>
                <Kpi value={kpis.count} decimals={0} />
              </KpiCard>
              <KpiCard label="Avg oxygen" index={1}>
                <Kpi value={kpis.oxygen} decimals={1} unit="%" />
              </KpiCard>
              <KpiCard label="Avg burn time" index={2}>
                <Kpi value={kpis.burn} decimals={1} unit="s" />
              </KpiCard>
              <KpiCard label="Tests with data notes" index={3}>
                <Kpi value={kpis.flagged} decimals={0} unit="%" />
              </KpiCard>
            </div>

            {/* FILTERS */}
            <div className="glass p-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label htmlFor="dash-search" className={`${mono} mb-1.5 block text-[10px] text-muted`}>
                    Search
                  </label>
                  <input
                    id="dash-search"
                    type="search"
                    value={q}
                    onChange={(e) => setParam('q', e.target.value)}
                    placeholder="Test ID or material"
                    className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted/60 focus:border-flame"
                  />
                </div>
                <Select
                  label="Experiment"
                  value={expFilter}
                  onChange={(v) => setParam('exp_filter', v)}
                  options={experimentsList.map((v) => ({ value: v, label: v }))}
                  allLabel="All experiments"
                />
                <Select
                  label="Material"
                  value={fuel}
                  onChange={(v) => setParam('fuel', v)}
                  options={fuels.map((v) => ({ value: v, label: v }))}
                  allLabel="All materials"
                />
                <Select
                  label="Sort (highest first)"
                  value={sort}
                  onChange={(v) => setParam('sort', v)}
                  options={sortKeys.map((k) => ({ value: k, label: nice(k) }))}
                  allLabel="Default order"
                />
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className={`${mono} text-[10px] text-muted`}>
                  Showing <span className="text-ink">{filtered.length}</span> of {data.length}
                </p>
                <button
                  onClick={resetFilters}
                  disabled={!active}
                  className={`${mono} cursor-pointer border border-white/20 px-4 py-2 text-[10px] text-ink transition-colors hover:border-flame hover:text-flame disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/20 disabled:hover:text-ink`}
                >
                  Reset filters
                </button>
              </div>
            </div>

            {data.length === 0 ? (
              <div className="glass p-10 text-center">
                <h2 className="mb-2 text-xl font-bold">No tests yet</h2>
                <p className="text-sm text-muted">Data will appear here as soon as the backend returns tests.</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="glass p-10 text-center">
                <h2 className="mb-2 text-xl font-bold">No tests match</h2>
                <p className="mb-6 text-sm text-muted">Try removing a filter or searching for something else.</p>
                <button
                  onClick={resetFilters}
                  className={`${mono} cursor-pointer bg-flame px-6 py-3 text-[11px] font-bold text-space`}
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <>
                {/* CHARTS */}
                <div className="grid gap-6 lg:grid-cols-2">
                  <ScatterCard data={filtered} onOpen={(id) => setParam('exp', id)} className="lg:col-span-2" />
                  <AverageCard data={filtered} />
                  <QualityCard data={filtered} />
                </div>

                {/* TEST GRID */}
                <div>
                  <p className={`${mono} mb-4 text-[10px] text-flame`}>Tests</p>
                  <div key={gridKey} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.slice(0, visible).map((e, i) => (
                      <TestCard
                        key={e.id}
                        e={e}
                        index={i}
                        selected={selected.includes(e.id)}
                        selectDisabled={!selected.includes(e.id) && selected.length >= MAX_COMPARE}
                        onOpen={(id) => setParam('exp', id)}
                        onToggle={toggle}
                      />
                    ))}
                  </div>
                  {visible < filtered.length && (
                    <div className="mt-8 text-center">
                      <button
                        onClick={() => setVisible((v) => v + PAGE)}
                        className={`${mono} cursor-pointer border border-white/25 px-6 py-3 text-[10px] text-ink transition-colors hover:border-flame hover:text-flame`}
                      >
                        Show more ({filtered.length - visible} left)
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* COMPARE BAR */}
      <AnimatePresence>
        {selected.length > 0 && (
          <motion.div
            key="bar"
            className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
          >
            <div className="glass flex items-center gap-4 bg-space/90 px-5 py-3 shadow-[0_0_40px_rgba(0,0,0,0.6)]">
              <span className={`${mono} text-[10px] text-ink`}>{selected.length} selected</span>
              <button
                onClick={() => setCompareOpen(true)}
                disabled={selected.length < 2}
                title={selected.length < 2 ? 'Select at least 2' : undefined}
                className={`${mono} cursor-pointer bg-flame px-5 py-2.5 text-[10px] font-bold text-space disabled:cursor-not-allowed disabled:opacity-40`}
              >
                Compare
              </button>
              <button
                onClick={() => {
                  setSelected([])
                  setCompareOpen(false)
                }}
                className={`${mono} cursor-pointer text-[10px] text-muted hover:text-flame`}
              >
                Clear
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Drawer experiment={openExperiment} onClose={closeDrawer} />

      <AnimatePresence>
        {showCompare && (
          <ComparePanel key="compare" experiments={selectedExperiments} onClose={() => setCompareOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}
