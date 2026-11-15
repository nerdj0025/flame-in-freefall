import { useId } from 'react'

export interface Option {
  value: string
  label: string
}

interface Props {
  label: string
  value: string
  onChange: (v: string) => void
  options: Option[]
  allLabel?: string // adds a first option with an empty value, e.g. "All fuels"
  className?: string
}

export default function Select({ label, value, onChange, options, allLabel, className = '' }: Props) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block font-mono text-[10px] tracking-[0.25em] text-muted uppercase">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full cursor-pointer rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-ink transition-colors outline-none [color-scheme:dark] focus:border-flame"
      >
        {allLabel !== undefined && (
          <option value="" className="bg-panel">
            {allLabel}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-panel">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}