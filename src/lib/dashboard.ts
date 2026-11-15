import type { Experiment } from './api'
import { UNITS } from './api'

// Theme palette. Unknown fuels / gravity levels get a stable colour from it automatically.
export const PALETTE = ['#FF6B2C', '#4CC9F0', '#FFB347', '#C084FC', '#34D399', '#F472B6', '#FACC15', '#60A5FA']
export const COMPARE_COLORS = ['#FF6B2C', '#4CC9F0', '#FFB347', '#C084FC']

const KNOWN: Record<string, string> = {
  microgravity: '#4CC9F0',
  lunar: '#FFB347',
  mars: '#FF6B2C',
  earth: '#34D399',
}

export function colorOf(value: string): string {
  const key = value.toLowerCase()
  if (KNOWN[key]) return KNOWN[key]
  let h = 0
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return PALETTE[h % PALETTE.length]
}

const LABELS: Record<string, string> = {
  id: 'ID',
  title: 'Title',
  fuel: 'Fuel',
  gravityLevel: 'Gravity level',
  flameType: 'Flame type',
  extinguished: 'Extinguished',
  pressure: 'Pressure',
  oxygenPercent: 'Oxygen',
  spreadRate: 'Spread rate',
  peakTemperature: 'Peak temperature',
  maxFlameSize: 'Max flame size',
  time: 'Time',
  flameSize: 'Flame size',
  temperature: 'Temperature',
}

export function prettify(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())
}
export const labelOf = (key: string) => LABELS[key] ?? prettify(key)
export const unitOf = (key: string) => UNITS[key] ?? ''
export function labelWithUnit(key: string): string {
  const unit = unitOf(key)
  return unit ? labelOf(key) + ' (' + unit + ')' : labelOf(key)
}

export function valueOf(e: Experiment, key: string): unknown {
  return (e as unknown as Record<string, unknown>)[key]
}
export function numOf(e: Experiment, key: string): number | undefined {
  const v = valueOf(e, key)
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined
}

export function fmt(v: number | undefined, digits = 1): string {
  return v === undefined ? 'n/a' : v.toLocaleString('en-US', { maximumFractionDigits: digits })
}

export function formatValue(value: unknown, key: string, digits = 2): string {
  if (value === undefined || value === null) return 'n/a'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') {
    const unit = unitOf(key)
    const text = fmt(value, digits)
    if (unit === '%') return text + '%'
    return unit ? text + ' ' + unit : text
  }
  return String(value)
}

export function uniqueValues(list: Experiment[], key: string): string[] {
  const set = new Set<string>()
  for (const e of list) {
    const v = valueOf(e, key)
    if (typeof v === 'string' && v) set.add(v)
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}

const PREFERRED = ['spreadRate', 'peakTemperature', 'maxFlameSize', 'oxygenPercent', 'pressure']

// Every numeric field found in the data (except the series), main ones first.
export function numericKeys(list: Experiment[]): string[] {
  const set = new Set<string>()
  for (const e of list) {
    for (const [k, v] of Object.entries(e)) {
      if (k !== 'series' && typeof v === 'number' && Number.isFinite(v)) set.add(k)
    }
  }
  const rest = [...set].filter((k) => !PREFERRED.includes(k)).sort()
  return [...PREFERRED.filter((k) => set.has(k)), ...rest]
}

export function average(values: (number | undefined)[]): number | undefined {
  const nums = values.filter((v): v is number => v !== undefined)
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : undefined
}