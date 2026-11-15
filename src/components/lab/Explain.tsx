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