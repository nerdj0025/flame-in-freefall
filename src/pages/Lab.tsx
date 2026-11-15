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