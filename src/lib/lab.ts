// Virtual Lab + FlameGuard X research tools: talks to the backend routes under /api

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

export interface DetectiveReply {
  status: string
  verdict: string
  reason: string
  changed_variables?: string[]
  warnings?: string[]
  research_gap?: string
  scientific_conclusion?: string
  evidence?: { scenario_a_test_ids: string[]; scenario_b_test_ids: string[]; burn_time_a_s: number; burn_time_b_s: number; difference_s: number }
  actual_evidence_audit?: { alerts: string[]; note: string }
}

export interface CaseReply {
  status: string
  case_id: string
  case_title: string
  case_question: string
  case_status: string
  final_message: string
  scenario_a: Scenario
  scenario_b: Scenario
  investigation: DetectiveReply
  next_experiment: {
    status: string
    research_question?: string
    variable_to_change?: string
    variables_to_control?: string[]
    suggested_design?: string
    measurements?: string[]
    scientific_limitations?: string
    reason?: string
  }
}

export interface CombustionExplanation {
  fuel: string
  oxygen_percentage: number
  pressure_mmhg: number
  oxygen_partial_pressure_mmhg: number
  droplet_diameter_mm: number
  scientific_explanation: {
    fuel_role: string
    oxygen_pressure_interaction: string
    pressure_role: string
    droplet_role: string
    microgravity_role: string
  }
  why_review_before_repeating: string
  evidence_level: string
  limitations: string[]
}

export interface GapCell {
  oxygen_min: number
  oxygen_max: number
  pressure_min: number
  pressure_max: number
  experiment_count: number
  status: 'GAP' | 'COVERED'
}

export interface GapCandidate {
  oxygen_fraction: number
  pressure_mmhg: number
  status: string
  selection_reason: string
  estimated_burn_time_s: number | null
  neighbor_IQR_s: number | null
  prediction_status: string
}

export interface GapReply {
  fuel: string
  total_experiments: number
  total_regions: number
  covered_regions: number
  gap_regions: number
  coverage_percentage: number
  coverage_map: GapCell[]
  next_experiment_candidates: GapCandidate[]
  limitations: string[]
}

export interface DiscoveryPair {
  fuel: string
  test_a: string
  test_b: string
  burn_time_a_s: number
  burn_time_b_s: number
  burn_time_difference_s: number
  burn_time_ratio: number
  missing_extinction_measurements: number
}

export interface DiscoveryReply {
  status: string
  evaluated_pairs: number
  condition_matched_pairs: number
  total_candidates: number
  candidates: DiscoveryPair[]
  scientific_limitations: string[]
}

export interface ConditionGroup {
  oxygen_fraction: number
  pressure_mmhg: number
  droplet_diameter_mm: number
  matched_experiments: number
  median_burn_time_s: number
  burn_time_range_s: number
  evidence_readiness: string
  interpretation: string
}

export interface ConditionsReply {
  status: string
  fuel: string
  total_candidate_groups?: number
  recommendations: ConditionGroup[]
  limitations?: string[]
}

function messageFrom(data: unknown, status: number): string {
  const d = data as { errors?: string[]; detail?: unknown } | null
  if (d?.errors?.length) return d.errors.join('; ')
  if (typeof d?.detail === 'string') return d.detail
  if (Array.isArray(d?.detail)) {
    return (d.detail as { msg?: string }[]).map((x) => x.msg ?? 'invalid input').join('; ')
  }
  return 'Server error ' + status
}

async function call<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(BASE + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  })
  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    /* keep the generic message */
  }
  if (!res.ok) throw new Error(messageFrom(data, res.status))
  return data as T
}

export const getLabConfig = () => call<LabConfig>('/api/lab/options')

export const runLab = (mode: 'single' | 'compare', a: Scenario, b: Scenario | null, signal?: AbortSignal) =>
  call<LabResponse>('/api/lab', { mode, scenario_a: a, ...(mode === 'compare' && b ? { scenario_b: b } : {}) }, signal)

export const runDetective = (a: Scenario, b: Scenario) => call<DetectiveReply>('/api/detective', { scenario_a: a, scenario_b: b })
export const getCase = () => call<CaseReply>('/api/crime-scene/oxygen-paradox')
export const getExplanation = (s: Scenario) =>
  call<CombustionExplanation>(
    '/api/combustion-explanation?' +
      new URLSearchParams({
        fuel: s.fuel,
        o2_fraction: String(s.o2_fraction),
        pressure_mmhg: String(s.pressure_mmhg),
        droplet_diameter_mm: String(s.droplet_diameter_mm),
      }).toString(),
  )
export const getGaps = (fuel: string, bins: number) =>
  call<GapReply>('/api/experimental-gaps?' + new URLSearchParams({ fuel, bins: String(bins) }).toString())
export const getDiscoveries = (fuel: string) =>
  call<DiscoveryReply>('/api/discoveries?' + new URLSearchParams({ fuel, max_results: '10' }).toString())
export const getConditions = (fuel: string) =>
  call<ConditionsReply>('/api/conditions-recommendations?' + new URLSearchParams({ fuel, top_n: '6' }).toString())

export const INPUT_LABEL: Record<string, string> = {
  o2_fraction: 'Oxygen',
  pressure_mmhg: 'Pressure',
  droplet_diameter_mm: 'Droplet diameter',
  fuel: 'Fuel',
}