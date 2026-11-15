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