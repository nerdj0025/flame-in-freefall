import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import type { Risk, ScenarioBlock, Support } from '../../lib/lab'
import { INPUT_LABEL } from '../../lib/lab'
import FlameStage from './FlameStage'

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
    </div>
  )
}
