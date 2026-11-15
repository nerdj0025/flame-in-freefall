import { motion } from 'motion/react'
import type { CaseReply, DetectiveReply } from '../../lib/lab'
import { INPUT_LABEL } from '../../lib/lab'
import { Notes, Pill, Stat, mono } from './ui'

const VERDICT_COLOR: Record<string, string> = {
  COMPARABLE: '#34D399',
  CONFOUNDED: '#FFB347',
  INSUFFICIENT_EVIDENCE: '#F87171',
}

export function DetectiveView({ d }: { d: DetectiveReply }) {
  const color = VERDICT_COLOR[d.verdict] ?? '#8A94A8'
  return (
    <motion.div className="glass space-y-5 p-5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex flex-wrap items-center gap-3">
        <p className={`${mono} text-[11px] text-flame`}>Verdict</p>
        <Pill text={d.verdict} color={color} />
      </div>
      <p className="text-sm leading-relaxed">{d.reason}</p>
      {d.evidence && (
        <div className="grid grid-cols-3 gap-3 border-y border-white/10 py-4">
          <Stat label="Burn A" value={d.evidence.burn_time_a_s + ' s'} />
          <Stat label="Burn B" value={d.evidence.burn_time_b_s + ' s'} />
          <Stat label="Difference" value={d.evidence.difference_s + ' s'} />
        </div>
      )}
      <Notes title="Alerts" lines={d.warnings} />
      <Notes title="Evidence audit" lines={d.actual_evidence_audit?.alerts} />
      {d.scientific_conclusion && <p className="text-sm text-muted">{d.scientific_conclusion}</p>}
      {d.research_gap && <p className="text-sm text-muted">{d.research_gap}</p>}
    </motion.div>
  )
}

export function CaseView({ c }: { c: CaseReply }) {
  const n = c.next_experiment
  return (
    <div className="space-y-6">
      <motion.div className="glass space-y-3 p-6" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-wrap items-center gap-3">
          <p className={`${mono} text-[11px] text-flame`}>Case {c.case_id}</p>
          <Pill text={c.case_status} color="#FFB347" />
        </div>
        <h2 className="text-2xl font-bold">{c.case_title}</h2>
        <p className="text-sm text-muted">{c.case_question}</p>
        <p className="text-sm leading-relaxed">{c.final_message}</p>
      </motion.div>
      <DetectiveView d={c.investigation} />
      {n.status === 'PROPOSED' && (
        <div className="glass space-y-4 p-6">
          <p className={`${mono} text-[11px] text-flame`}>Proposed next experiment</p>
          <p className="text-sm font-semibold">{n.research_question}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className={`${mono} mb-2 text-[10px] text-muted`}>Change</p>
              <p className="text-sm">{INPUT_LABEL[n.variable_to_change ?? ''] ?? n.variable_to_change}</p>
            </div>
            <div>
              <p className={`${mono} mb-2 text-[10px] text-muted`}>Keep fixed</p>
              <p className="text-sm">{(n.variables_to_control ?? []).map((v) => INPUT_LABEL[v] ?? v).join(', ')}</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-ink/90">{n.suggested_design}</p>
          <Notes title="Measure" lines={n.measurements} />
          <p className="text-xs text-muted">{n.scientific_limitations}</p>
        </div>
      )}
    </div>
  )
}