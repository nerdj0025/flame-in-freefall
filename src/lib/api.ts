import sampleData from '../data/experiments.json'

// ALL data access lives here (assistant + dashboard).
// Nothing in the UI needs to change as long as the returned shapes stay the same.

export interface Source {
  id: number // matches the [1] [2] markers inside the answer
  title: string
  snippet: string
  url?: string // external page, opens in a new tab
  experimentId?: string // NASA experiment record, links to /dashboard?exp=<id>
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AssistantReply {
  answer: string
  sources: Source[]
  followUps?: string[]
}

const API_URL = 'http://localhost:8000/chat'
const EXPERIMENTS_URL = 'http://localhost:8000/experiments'

// Flip these to true to work without the backend (fake data).
const USE_MOCK_ASSISTANT = false
const USE_SAMPLE_DATA = false

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/*
  Expected request  (POST http://localhost:8000/chat)
  {
    "message": "Why is a flame round in microgravity?",
    "history": [
      { "role": "user", "content": "..." },
      { "role": "assistant", "content": "..." }
    ]
  }

  Expected response (200, JSON)
  {
    "answer": "Without buoyancy the flame becomes a sphere [1]. It also burns cooler [2].",
    "sources": [
      { "id": 1, "title": "...", "snippet": "...", "experimentId": "FLEX-03" },
      { "id": 2, "title": "...", "snippet": "...", "url": "https://..." }
    ],
    "followUps": ["Why does it burn cooler?", "Which fuels were tested?"]
  }

  Rules: "id" in sources must match the [n] markers in "answer". "followUps" is optional.
*/
export async function askAssistant(message: string, history: ChatMessage[]): Promise<AssistantReply> {
  if (USE_MOCK_ASSISTANT) {
    await delay(1000)
    const lower = message.toLowerCase()
    const hit = MOCKS.find((m) => m.keys.some((k) => lower.includes(k)))
    return hit ? hit.reply : FALLBACK
  }

  let res: Response
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
    })
  } catch {
    throw new Error('Could not reach the server at ' + API_URL)
  }
  if (!res.ok) throw new Error('Server error ' + res.status)
  return (await res.json()) as AssistantReply
}

interface Mock {
  keys: string[]
  reply: AssistantReply
}

const MOCKS: Mock[] = [
  {
    keys: ['round', 'sphere', 'shape', 'teardrop'],
    reply: {
      answer:
        'On Earth, hot gas rises and pulls fresh air in from below, which stretches a flame into a teardrop [1]. In microgravity there is no buoyancy, so oxygen reaches the flame only by slow diffusion and the flame settles into a sphere [2]. Round flames also lose more heat by radiation, so they burn cooler and dimmer [3].',
      sources: [
        { id: 1, title: 'Candle flame baseline on Earth', snippet: 'Reference run at 1 g showing the buoyancy-driven teardrop shape and fast air intake.', experimentId: 'FLEX-01' },
        { id: 2, title: 'Spherical droplet flame in freefall', snippet: 'Droplet burned in a drop tower; the flame became almost perfectly spherical within a second.', experimentId: 'FLEX-03' },
        { id: 3, title: 'Microgravity combustion overview', snippet: 'Summary of why radiation losses matter more when there is no convection.', url: 'https://www.nasa.gov/' },
      ],
      followUps: ['Why does it burn cooler?', 'What is a blue flame?', 'Which fuels burn longest in freefall?'],
    },
  },
  {
    keys: ['oxygen', 'spread'],
    reply: {
      answer:
        'Higher oxygen concentration makes flames spread faster almost everywhere, but the effect is stronger in microgravity [1]. At low oxygen levels, a flame can fail to spread at all in freefall, even though it would survive on Earth [2]. This is why space habitats keep a close eye on oxygen levels [3].',
      sources: [
        { id: 1, title: 'Flame spread vs oxygen level', snippet: 'Spread rate measured at 21%, 25% and 30% oxygen across several gravity levels.', experimentId: 'FLEX-05' },
        { id: 2, title: 'Quenching limit in microgravity', snippet: 'Below a threshold oxygen level the flame extinguished before reaching the end of the sample.', experimentId: 'FLEX-07' },
        { id: 3, title: 'Spacecraft fire safety basics', snippet: 'Overview of how atmosphere composition shapes fire risk on a spacecraft.', url: 'https://www.nasa.gov/' },
      ],
      followUps: ['Why do flames die out in low oxygen?', 'How does gravity level change spread rate?'],
    },
  },
  {
    keys: ['fuel', 'longest', 'burn'],
    reply: {
      answer:
        'Among the tested fuels, thick solid samples and slow-burning plastics kept a flame alive the longest in freefall [1]. Small liquid droplets burned out quickly, but their flames were the most stable and symmetrical [2].',
      sources: [
        { id: 1, title: 'Solid fuel burn duration', snippet: 'Cellulose and plastic samples compared by total burn time under reduced gravity.', experimentId: 'FLEX-02' },
        { id: 2, title: 'Droplet burning study', snippet: 'Heptane droplets burned for a few seconds with near-perfect spherical symmetry.', experimentId: 'FLEX-03' },
      ],
      followUps: ['Why is a flame round in microgravity?', 'How do these experiments make spacecraft safer?'],
    },
  },
  {
    keys: ['blue', 'soot', 'colour', 'color'],
    reply: {
      answer:
        'A blue flame means fuel and oxygen are mixing efficiently, so very little soot forms [1]. In microgravity, slow burning and low temperatures often produce flames with a blue edge and a faint glow [2].',
      sources: [
        { id: 1, title: 'Soot formation and flame colour', snippet: 'Why yellow flames contain glowing soot and blue flames do not.', url: 'https://www.nasa.gov/' },
        { id: 2, title: 'Cool flame observations', snippet: 'Dim, blue-edged flames recorded at low temperature in a drop tower run.', experimentId: 'FLEX-04' },
      ],
      followUps: ['Why does it burn cooler?', 'Which fuels burn longest in freefall?'],
    },
  },
  {
    keys: ['safe', 'astronaut', 'spacecraft', 'habitat'],
    reply: {
      answer:
        'Knowing how a flame starts, spreads and goes out in microgravity lets engineers choose safer materials and place smoke detectors in the right spots [1]. Some flames in these experiments were weak enough to be missed by detectors designed for Earth [2], so the data directly shapes spacecraft design [3].',
      sources: [
        { id: 1, title: 'Material flammability testing', snippet: 'Results used to rank materials for use inside crewed spacecraft.', experimentId: 'FLEX-06' },
        { id: 2, title: 'Detecting low-intensity flames', snippet: 'Dim flames in freefall produced less smoke than standard detectors expect.', experimentId: 'FLEX-07' },
        { id: 3, title: 'Fire safety in crewed missions', snippet: 'How combustion research feeds into habitat and vehicle design.', url: 'https://www.nasa.gov/' },
      ],
      followUps: ['How does oxygen change flame spread?', 'What is a blue flame?'],
    },
  },
]

const FALLBACK: AssistantReply = {
  answer:
    'Based on the experiments in the database, flames behave very differently without gravity: they are rounder, cooler and often slower to spread [1]. Tell me which fuel, gravity level or condition you care about and I can narrow it down [2].',
  sources: [
    { id: 1, title: 'Microgravity combustion overview', snippet: 'General summary of how flames change when buoyancy disappears.', url: 'https://www.nasa.gov/' },
    { id: 2, title: 'Experiment catalogue', snippet: 'Browse every experiment by fuel, gravity level and result.', experimentId: 'FLEX-01' },
  ],
  followUps: ['Why is a flame round in microgravity?', 'How does oxygen change flame spread?', 'How do these experiments make spacecraft safer?'],
}

// ---------------------------------------------------------------------------
// DASHBOARD DATA
// ---------------------------------------------------------------------------

export interface SeriesPoint {
  time: number
  flameSize: number
  temperature: number
}

export interface Experiment {
  id: string
  title: string
  fuel: string
  gravityLevel: string // any text: "microgravity", "lunar", "mars", "earth", ...
  flameType: string
  extinguished?: boolean
  pressure?: number
  oxygenPercent?: number
  spreadRate?: number
  peakTemperature?: number
  maxFlameSize?: number
  series?: SeriesPoint[]
}

// Units for every numeric field. Used for ALL labels in the dashboard.
// Unknown numeric fields simply show without a unit.
export const UNITS: Record<string, string> = {
  pressure: 'kPa',
  oxygenPercent: '%',
  spreadRate: 'mm/s',
  peakTemperature: '\u00B0C',
  maxFlameSize: 'mm',
  time: 's',
  flameSize: 'mm',
  temperature: '\u00B0C',
}

// Shows the "Sample data" badge on the dashboard.
export const IS_SAMPLE_DATA = USE_SAMPLE_DATA

/*
  Expected response of GET http://localhost:8000/experiments  (JSON array)
  [
    {
      "id": "FLEX-03",
      "title": "Spherical droplet flame in freefall",
      "fuel": "n-heptane",
      "gravityLevel": "microgravity",
      "flameType": "spherical",
      "pressure": 101,            // kPa            (optional)
      "oxygenPercent": 21,        // %              (optional)
      "spreadRate": 1.2,          // mm/s           (optional)
      "peakTemperature": 1046,    // deg C          (optional)
      "maxFlameSize": 11.1,       // mm             (optional)
      "extinguished": false,      //                (optional)
      "series": [                 // (optional)
        { "time": 0, "flameSize": 0, "temperature": 300 }
      ]
    }
  ]
  snake_case keys (gravity_level) are converted to camelCase automatically.
*/

// snake_case keys (gravity_level) become camelCase (gravityLevel), also inside "series".
const toCamel = (k: string) => k.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase())

function camelKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(camelKeys)
  if (v && typeof v === 'object') {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>).map(([k, val]) => [toCamel(k), camelKeys(val)]),
    )
  }
  return v
}

// Accepts a plain array or { experiments: [...] } and fills in the text fields the dashboard needs.
function normalizeExperiments(raw: unknown): Experiment[] {
  const data = camelKeys(raw)
  const list: unknown = Array.isArray(data) ? data : (data as { experiments?: unknown } | null)?.experiments
  if (!Array.isArray(list)) throw new Error('The server did not return a list of experiments.')
  return list
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .map(
      (e, i) =>
        ({
          ...e,
          id: String(e.id ?? 'EXP-' + (i + 1)),
          title: String(e.title ?? e.name ?? 'Untitled experiment'),
          fuel: String(e.fuel ?? 'unknown'),
          gravityLevel: String(e.gravityLevel ?? e.gravity ?? 'unknown'),
          flameType: String(e.flameType ?? 'unknown'),
        }) as Experiment,
    )
}

export async function getExperiments(): Promise<Experiment[]> {
  if (USE_SAMPLE_DATA) {
    await new Promise<void>((resolve) => setTimeout(resolve, 600))
    return sampleData as unknown as Experiment[]
  }

  let res: Response
  try {
    res = await fetch(EXPERIMENTS_URL)
  } catch {
    throw new Error('Could not reach the server at ' + EXPERIMENTS_URL + '. Is it running, and does it allow CORS?')
  }
  if (!res.ok) throw new Error('Server error ' + res.status)
  return normalizeExperiments(await res.json())
}