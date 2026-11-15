import { Search } from 'lucide-react'
import { labelOf } from '../../lib/dashboard'
import Select from './Select'

const mono = 'font-mono uppercase tracking-[0.25em]'

export interface Filters {
  fuel: string
  gravity: string
  type: string
  q: string
  sort: string
}

interface Props {
  filters: Filters
  fuels: string[]
  gravities: string[]
  types: string[]
  sortKeys: string[]
  shown: number
  total: number
  onChange: (key: keyof Filters, value: string) => void
  onReset: () => void
}

const toOptions = (list: string[]) => list.map((v) => ({ value: v, label: v }))

export default function FilterBar({ filters, fuels, gravities, types, sortKeys, shown, total, onChange, onReset }: Props) {
  const active = Object.values(filters).some(Boolean)
  return (
    <div className="glass p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="sm:col-span-2">
          <label htmlFor="dash-search" className={`${mono} mb-1.5 block text-[10px] text-muted`}>
            Search
          </label>
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <input
              id="dash-search"
              type="search"
              value={filters.q}
              onChange={(e) => onChange('q', e.target.value)}
              placeholder="Title, fuel or ID"
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2.5 pr-3 pl-9 text-sm text-ink outline-none placeholder:text-muted/60 focus:border-flame"
            />
          </div>
        </div>
        <Select label="Fuel" value={filters.fuel} onChange={(v) => onChange('fuel', v)} options={toOptions(fuels)} allLabel="All fuels" />
        <Select label="Gravity level" value={filters.gravity} onChange={(v) => onChange('gravity', v)} options={toOptions(gravities)} allLabel="All levels" />
        <Select label="Flame type" value={filters.type} onChange={(v) => onChange('type', v)} options={toOptions(types)} allLabel="All types" />
        <Select
          label="Sort (highest first)"
          value={filters.sort}
          onChange={(v) => onChange('sort', v)}
          options={sortKeys.map((k) => ({ value: k, label: labelOf(k) }))}
          allLabel="Default order"
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className={`${mono} text-[10px] text-muted`}>
          Showing <span className="text-ink">{shown}</span> of {total}
        </p>
        <button
          onClick={onReset}
          disabled={!active}
          className={`${mono} cursor-pointer border border-white/20 px-4 py-2 text-[10px] text-ink transition-colors hover:border-flame hover:text-flame disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/20 disabled:hover:text-ink`}
        >
          Reset filters
        </button>
      </div>
    </div>
  )
}