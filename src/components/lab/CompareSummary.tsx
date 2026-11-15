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