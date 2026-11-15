export const mono = 'font-mono uppercase tracking-[0.25em]'

export function Pill({ text, color }: { text: string; color: string }) {
  return (
    <span
      className={`${mono} rounded-full border px-2.5 py-1 text-[9px]`}
      style={{ color, borderColor: color + '66', background: color + '1A' }}
    >
      {text.replace(/_/g, ' ')}
    </span>
  )
}

export function Notes({ title, lines }: { title: string; lines?: string[] }) {
  if (!lines || lines.length === 0) return null
  return (
    <div>
      <p className={`${mono} mb-2 text-[10px] text-muted`}>{title}</p>
      <ul className="space-y-1.5 text-sm leading-relaxed text-ink/90">
        {lines.map((l, i) => (
          <li key={i} className="border-l border-white/10 pl-3">
            {l}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className={`${mono} mb-1 text-[9px] text-muted`}>{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  )
}

export function FuelPicker({ fuels, value, onChange }: { fuels: string[]; value: string; onChange: (f: string) => void }) {
  return (
    <div className="flex gap-2" role="radiogroup" aria-label="Fuel">
      {fuels.map((f) => (
        <button
          key={f}
          role="radio"
          aria-checked={value === f}
          onClick={() => onChange(f)}
          className={`flex-1 cursor-pointer rounded-lg border px-3 py-2.5 text-sm transition-colors ${
            value === f
              ? 'border-flame bg-flame/15 font-semibold text-ink'
              : 'border-white/10 text-muted hover:border-white/30 hover:text-ink'
          }`}
        >
          {f}
        </button>
      ))}
    </div>
  )
}