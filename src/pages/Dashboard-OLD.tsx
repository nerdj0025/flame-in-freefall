import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useSearchParams } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { IS_SAMPLE_DATA, UNITS, getExperiments } from '../lib/api'
import type { Experiment } from '../lib/api'
import { average, numOf, numericKeys, uniqueValues } from '../lib/dashboard'
import AnimatedNumber from '../components/dashboard/AnimatedNumber'
import { BarChartCard, LineChartCard, ScatterChartCard } from '../components/dashboard/Charts'
import ComparePanel from '../components/dashboard/ComparePanel'
import Drawer from '../components/dashboard/Drawer'
import ExperimentCard from '../components/dashboard/ExperimentCard'
import FilterBar from '../components/dashboard/FilterBar'
import type { Filters } from '../components/dashboard/FilterBar'
import DashboardSkeleton from '../components/dashboard/Skeletons'

const mono = 'font-mono uppercase tracking-[0.25em]'
const MAX_COMPARE = 4

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

export default function Dashboard() {
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState<Experiment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [updated, setUpdated] = useState<Date | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [compareOpen, setCompareOpen] = useState(false)

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

  // ---- filters live in the URL so they can be shared ----
  const filters: Filters = {
    fuel: params.get('fuel') ?? '',
    gravity: params.get('gravity') ?? '',
    type: params.get('type') ?? '',
    q: params.get('q') ?? '',
    sort: params.get('sort') ?? '',
  }
  const expId = params.get('exp') ?? ''

  const setParam = useCallback(
    (key: string, value: string) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (value) next.set(key, value)
          else next.delete(key)
          return next
        },
        { replace: true },
      ),
    [setParams],
  )

  const resetFilters = () =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const k of ['fuel', 'gravity', 'type', 'q', 'sort']) next.delete(k)
        return next
      },
      { replace: true },
    )

  const closeDrawer = useCallback(() => setParam('exp', ''), [setParam])

  // ---- everything below is derived from the data ----
  const fuels = useMemo(() => uniqueValues(data, 'fuel'), [data])
  const gravities = useMemo(() => uniqueValues(data, 'gravityLevel'), [data])
  const types = useMemo(() => uniqueValues(data, 'flameType'), [data])
  const sortKeys = useMemo(() => numericKeys(data), [data])

  const filtered = useMemo(() => {
    const needle = filters.q.trim().toLowerCase()
    let list = data.filter(
      (e) =>
        (!filters.fuel || e.fuel === filters.fuel) &&
        (!filters.gravity || e.gravityLevel === filters.gravity) &&
        (!filters.type || e.flameType === filters.type) &&
        (!needle || [e.id, e.title, e.fuel].some((s) => (s ?? '').toLowerCase().includes(needle))),
    )
    if (filters.sort) {
      const key = filters.sort
      list = [...list].sort((a, b) => {
        const av = numOf(a, key)
        const bv = numOf(b, key)
        if (av === undefined && bv === undefined) return 0
        if (av === undefined) return 1
        if (bv === undefined) return -1
        return bv - av
      })
    }
    return list
  }, [data, filters.fuel, filters.gravity, filters.type, filters.q, filters.sort])

  const kpis = useMemo(() => {
    return {
      count: filtered.length,
            oxygen: average(filtered.map((e) => numOf(e, 'oxygenPercent'))),
      burn: average(filtered.map((e) => numOf(e, 'burnTimeS'))),
      flagged: filtered.length
        ? (filtered.filter((e) => (numOf(e, 'qualityIssues') ?? 0) > 0).length / filtered.length) * 100
        : undefined,
    }
  }, [filtered])

  const gridKey = [filters.fuel, filters.gravity, filters.type, filters.q, filters.sort].join('|')
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
              <KpiCard label="Tests with data flags" index={3}>
                <Kpi value={kpis.flagged} decimals={0} unit="%" />
              </KpiCard>
            </div>

            {/* FILTERS */}
            <FilterBar
              filters={filters}
              fuels={fuels}
              gravities={gravities}
              types={types}
              sortKeys={sortKeys}
              shown={filtered.length}
              total={data.length}
              onChange={(k, v) => setParam(k, v)}
              onReset={resetFilters}
            />

            {data.length === 0 ? (
              <div className="glass p-10 text-center">
                <h2 className="mb-2 text-xl font-bold">No experiments yet</h2>
                <p className="text-sm text-muted">Data will appear here as soon as the source returns experiments.</p>
              </div>
            ) : filtered.length === 0 ? (
              <motion.div
                className="glass p-10 text-center"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h2 className="mb-2 text-xl font-bold">No experiments match</h2>
                <p className="mb-6 text-sm text-muted">Try removing a filter or searching for something else.</p>
                <button
                  onClick={resetFilters}
                  className={`${mono} cursor-pointer bg-flame px-6 py-3 text-[11px] font-bold text-space`}
                >
                  Reset filters
                </button>
              </motion.div>
            ) : (
              <>
                {/* CHARTS */}
                <div className="grid gap-6 lg:grid-cols-2">
                  <LineChartCard experiments={filtered} />
                  <BarChartCard experiments={filtered} />
                  <ScatterChartCard experiments={filtered} onOpen={(id) => setParam('exp', id)} className="lg:col-span-2" />
                </div>

                {/* GRID */}
                <div>
                  <p className={`${mono} mb-4 text-[10px] text-flame`}>Experiments</p>
                  <div key={gridKey} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((e, i) => (
                      <ExperimentCard
                        key={e.id}
                        experiment={e}
                        index={i}
                        selected={selected.includes(e.id)}
                        selectDisabled={!selected.includes(e.id) && selected.length >= MAX_COMPARE}
                        onOpen={(id) => setParam('exp', id)}
                        onToggle={toggle}
                      />
                    ))}
                  </div>
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
        {showCompare && <ComparePanel key="compare" experiments={selectedExperiments} onClose={() => setCompareOpen(false)} />}
      </AnimatePresence>
    </div>
  )
}