import type { InputKey, LabConfig, Scenario } from '../../lib/lab'

const mono = 'font-mono uppercase tracking-[0.25em]'

interface SliderSpec {
  key: InputKey
  label: string
  step: number
  show: (v: number) => string
}

const SLIDERS: SliderSpec[] = [
  { key: 'o2_fraction', label: 'Oxygen', step: 0.005, show: (v) => (v * 100).toFixed(1) + ' %' },
  { key: 'pressure_mmhg', label: 'Pressure', step: 1, show: (v) => v.toFixed(0) + ' mmHg' },
  { key: 'droplet_diameter_mm', label: 'Droplet diameter', step: 0.01, show: (v) => v.toFixed(2) + ' mm' },
]

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

interface Props {
  title: string
  value: Scenario
  config: LabConfig
  onChange: (s: Scenario) => void
}

export default function ScenarioControls({ title, value, config, onChange }: Props) {
  const preset = () =>
    onChange({
      ...value,
      o2_fraction: clamp(0.21, config.ranges.o2_fraction.min, config.ranges.o2_fraction.max),
      pressure_mmhg: clamp(760, config.ranges.pressure_mmhg.min, config.ranges.pressure_mmhg.max),
    })

  return (
    <div className="glass p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className={`${mono} text-[11px] text-flame`}>{title}</h2>
        <button
          onClick={preset}
          className={`${mono} cursor-pointer border border-white/20 px-3 py-1.5 text-[9px] text-muted transition-colors hover:border-flame hover:text-flame`}
        >
          Normal air
        </button>
      </div>

      <p className={`${mono} mb-2 text-[10px] text-muted`}>Fuel</p>
      <div className="mb-5 flex gap-2" role="radiogroup" aria-label="Fuel">
        {config.fuels.map((f) => (
          <button
            key={f}
            role="radio"
            aria-checked={value.fuel === f}
            onClick={() => onChange({ ...value, fuel: f })}
            className={`flex-1 cursor-pointer rounded-lg border px-3 py-2.5 text-sm transition-colors ${
              value.fuel === f
                ? 'border-flame bg-flame/15 font-semibold text-ink'
                : 'border-white/10 text-muted hover:border-white/30 hover:text-ink'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-5">
        {SLIDERS.map((s) => {
          const r = config.ranges[s.key]
          const id = title + s.key
          return (
            <div key={s.key}>
              <div className="mb-2 flex items-baseline justify-between">
                <label htmlFor={id} className={`${mono} text-[10px] text-muted`}>
                  {s.label}
                </label>
                <span className="font-mono text-sm font-semibold text-ink">{s.show(value[s.key])}</span>
              </div>
              <input
                id={id}
                type="range"
                min={r.min}
                max={r.max}
                step={s.step}
                value={value[s.key]}
                onChange={(e) => onChange({ ...value, [s.key]: Number(e.target.value) })}
                className="w-full cursor-pointer accent-flame"
              />
              <div className="mt-1 flex justify-between text-[10px] text-muted/70">
                <span>{s.show(r.min)}</span>
                <span>{s.show(r.max)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}