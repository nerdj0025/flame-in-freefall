import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { getLabConfig, runLab } from '../lib/lab'
import type { LabConfig, LabResponse, Scenario } from '../lib/lab'
import ScenarioControls from '../components/lab/ScenarioControls'
import ResultCard from '../components/lab/ResultCard'
import CompareSummary from '../components/lab/CompareSummary'

const mono = 'font-mono uppercase tracking-[0.25em]'

type Mode = 'single' | 'compare'

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
  const [mode, setMode] = useState<Mode>('single')
  const [a, setA] = useState<Scenario | null>(null)
  const [b, setB] = useState<Scenario | null>(null)
  const [resp, setResp] = useState<LabResponse | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [attempt, setAttempt] = useState(0)
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
    if (!a || !b) return
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
  }, [mode, a, b])

  const compare = mode === 'compare'

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-6 pt-28 pb-24">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className={`${mono} mb-2 text-[10px] text-flame`}>Virtual lab</p>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Set up a fuel droplet flame</h1>
            <p className="mt-3 max-w-xl text-sm text-muted">
              Choose oxygen, pressure, droplet size and fuel. The lab finds the closest real NASA droplet tests and shows
              what they measured. It does not simulate or predict anything.
            </p>
          </div>
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
        </div>

        {error && !resp && (
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

        {config && a && b && (
          <motion.div className="space-y-6" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
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
          </motion.div>
        )}
      </div>
    </div>
  )
}
