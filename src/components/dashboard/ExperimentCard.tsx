import type { KeyboardEvent } from 'react'
import { motion } from 'motion/react'
import type { Experiment } from '../../lib/api'
import { colorOf, formatValue, labelOf, numOf } from '../../lib/dashboard'

const mono = 'font-mono uppercase tracking-[0.2em]'
const STATS = ['spreadRate', 'peakTemperature', 'maxFlameSize']

export function Badge({ text, color }: { text: string; color?: string }) {
  const style = color ? { color, borderColor: color + '66', background: color + '1A' } : undefined
  return (
    <span
      className={`${mono} rounded-full border px-2.5 py-1 text-[9px] ${color ? '' : 'border-white/15 text-muted'}`}
      style={style}
    >
      {text}
    </span>
  )
}

interface Props {
  experiment: Experiment
  index: number
  selected: boolean
  selectDisabled: boolean
  onOpen: (id: string) => void
  onToggle: (id: string) => void
}

export default function ExperimentCard({ experiment: e, index, selected, selectDisabled, onOpen, onToggle }: Props) {
  const onKey = (ev: KeyboardEvent<HTMLDivElement>) => {
    if (ev.target !== ev.currentTarget) return
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault()
      onOpen(e.id)
    }
  }

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(e.id)}
      onKeyDown={onKey}
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

      <h3 className="mb-3 text-base leading-snug font-semibold">{e.title}</h3>

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge text={e.gravityLevel} color={colorOf(e.gravityLevel)} />
        <Badge text={e.fuel} />
        <Badge text={e.flameType} />
        {e.extinguished && <Badge text="Extinguished" color="#F87171" />}
      </div>

      <div className="mt-auto grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
        {STATS.map((k) => (
          <div key={k}>
            <div className={`${mono} mb-1 text-[8px] text-muted`}>{labelOf(k)}</div>
            <div className={`text-sm font-semibold ${numOf(e, k) === undefined ? 'text-muted/60' : ''}`}>
              {formatValue(numOf(e, k), k, 1)}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}