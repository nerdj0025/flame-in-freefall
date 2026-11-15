// Virtual Lab: talks to the backend routes /lab/config and /lab/run

const BASE: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export type InputKey = 'o2_fraction' | 'pressure_mmhg' | 'droplet_diameter_mm'

export interface Scenario {
  o2_fraction: number
  pressure_mmhg: number
  droplet_diameter_mm: number
  fuel: string
}

export interface LabConfig {
  ranges: Record<InputKey, { min: number; max: number }>
  fuels: string[]
  tests: number
}

export type Support = 'CLOSE_MATCH' | 'APPROXIMATE_MATCH' | 'WEAK_MATCH'

export interface MatchedTest {
  test_id: string
  distance: number
  o2_fraction: number
  pressure_mmhg: number
  droplet_diameter_mm: number
  burn_time_s: number
}

export interface RunResult {
  status: 'OK' | 'REJECTED'
  errors?: string[]
  support_level?: Support
  summary?: {
    tests_used: number
    burn_time_s: { median: number; min: number; max: number }
    extinction_diameter_mm_median: number | null
  }
  matched_tests?: MatchedTest[]
  warnings?: string[]
}

export interface Factor {
  variable: string
  spearman_r: number
  description: string
}

export interface Risk {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'NOT_ASSESSED'
  reason?: string
  basis?: { matched_median_burn_time_s: number; fuel_low_threshold_s: number; fuel_high_threshold_s: number }
  influencing_factors?: Factor[]
  warnings?: string[]
}

export interface FlameData {
  flame_duration_s: number
  initial_droplet_diameter_mm: number
  extinction_diameter_mm: number | null
  note: string
}

export interface ScenarioBlock {
  inputs: Scenario
  result: RunResult
  risk_indicator: Risk
  explanation: { explanation: string[] }
  flame_data: FlameData | null
}

export interface Comparison {
  inputs_that_differ: string[]
  burn_time_median_a: number
  burn_time_median_b: number
  difference_b_minus_a: number
  warnings: string[]
}

export interface LabResponse {
  status: 'OK' | 'BAD_REQUEST'
  mode: 'single' | 'compare'
  scenario_a: ScenarioBlock
  scenario_b?: ScenarioBlock
  comparison?: Comparison
  comparison_explanation?: { explanation: string[] }
  limitations: string[]
}

export async function getLabConfig(): Promise<LabConfig> {
  const res = await fetch(BASE + '/lab/config')
  if (!res.ok) throw new Error('Server error ' + res.status)
  return (await res.json()) as LabConfig
}

export async function runLab(
  mode: 'single' | 'compare',
  a: Scenario,
  b: Scenario | null,
  signal?: AbortSignal,
): Promise<LabResponse> {
  const res = await fetch(BASE + '/lab/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, scenario_a: a, ...(mode === 'compare' && b ? { scenario_b: b } : {}) }),
    signal,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(((data as { errors?: string[] }).errors ?? ['Server error ' + res.status]).join('; '))
  return data as LabResponse
}

export const INPUT_LABEL: Record<string, string> = {
  o2_fraction: 'Oxygen',
  pressure_mmhg: 'Pressure',
  droplet_diameter_mm: 'Droplet diameter',
  fuel: 'Fuel',
}
