# Flame in Freefall - connect the front end to the real backend.
# Run from INSIDE the front-end project folder (the one with package.json).
$ErrorActionPreference = 'Stop'
$root = (Get-Location).Path
if (-not (Test-Path (Join-Path $root 'package.json'))) {
  Write-Host 'ERROR: package.json not found. cd into the flame-in-freefall folder first.' -ForegroundColor Red
  exit 1
}
$utf8 = New-Object System.Text.UTF8Encoding($false)
function W($rel, $content) {
  $path = Join-Path $root $rel
  $dir = Split-Path $path -Parent
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force $dir | Out-Null }
  [System.IO.File]::WriteAllText($path, ($content -replace "`r?`n", "`r`n"), $utf8)
  Write-Host ("wrote " + $rel)
}
function Patch($rel, $old, $new) {
  $path = Join-Path $root $rel
  if (-not (Test-Path $path)) { Write-Host ("skip (missing) " + $rel) -ForegroundColor Yellow; return }
  $text = [System.IO.File]::ReadAllText($path) -replace "`r`n", "`n"
  $old = $old -replace "`r`n", "`n"
  if (-not $text.Contains($old)) {
    Write-Host ("  not found in " + $rel + ": " + $old.Split("`n")[0].Trim()) -ForegroundColor Yellow
    return
  }
  $text = $text.Replace($old, $new -replace "`r`n", "`n")
  [System.IO.File]::WriteAllText($path, ($text -replace "`n", "`r`n"), $utf8)
  Write-Host ("patched " + $rel)
}

# ---- settings (VITE_USE_MOCK=true brings the fake data back) ----
W '.env.development' @'
VITE_API_URL=http://localhost:8000
VITE_USE_MOCK=false
'@

# ---- src/lib/api.ts ----
$old1 = "const API_URL = 'http://localhost:8000/chat'"
$new1 = @'
const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
export const USE_MOCK: boolean = import.meta.env.VITE_USE_MOCK === 'true'
'@
Patch 'src/lib/api.ts' $old1 $new1

$old2 = @'
  // ---- REAL BACKEND: uncomment these lines and delete the mock below ----
  // const res = await fetch(API_URL, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ message, history }),
  // })
  // if (!res.ok) throw new Error('Server error ' + res.status)
  // return (await res.json()) as AssistantReply

  // ---- MOCK (fake data) ----
  void API_URL
  void history
  await delay(1000)
'@
$new2 = @'
  if (!USE_MOCK) {
    const res = await fetch(API_URL + '/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
    })
    if (!res.ok) throw new Error('Server error ' + res.status)
    return (await res.json()) as AssistantReply
  }

  // ---- MOCK (fake data) ----
  await delay(1000)
'@
Patch 'src/lib/api.ts' $old2 $new2

$old3 = 'export const IS_SAMPLE_DATA = true'
$new3 = 'export const IS_SAMPLE_DATA = USE_MOCK'
Patch 'src/lib/api.ts' $old3 $new3

$old4 = @'
  // ---- REAL BACKEND: uncomment these lines and delete the sample data below ----
  // const res = await fetch('http://localhost:8000/experiments')
  // if (!res.ok) throw new Error('Server error ' + res.status)
  // return (await res.json()) as Experiment[]

  // ---- SAMPLE DATA (fake) ----
'@
$new4 = @'
  if (!USE_MOCK) {
    const res = await fetch(API_URL + '/experiments')
    if (!res.ok) throw new Error('Server error ' + res.status)
    const list = (await res.json()) as Experiment[]
    try {
      // the backend reports the unit of every numeric field it sends
      const meta = await fetch(API_URL + '/meta')
      if (meta.ok) Object.assign(UNITS, ((await meta.json()) as { units: Record<string, string> }).units)
    } catch {
      /* units are optional */
    }
    return list
  }

  // ---- SAMPLE DATA (fake) ----
'@
Patch 'src/lib/api.ts' $old4 $new4

# ---- src/lib/auth.ts: real login/signup against the backend ----
W 'src/lib/auth.ts' @'
// Real auth: talks to the backend (POST /auth/signup, POST /auth/login).
// The logged-in user is kept in localStorage so the navbar can show the name.

const BASE: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export const SESSION_KEY = 'ff_session'
export const TOKEN_KEY = 'ff_token'

export interface User {
  name: string
  email: string
}

interface AuthReply {
  token: string
  user: User
}

function notify() {
  window.dispatchEvent(new Event('ff-auth'))
}

async function post(path: string, body: unknown): Promise<AuthReply> {
  let res: Response
  try {
    res = await fetch(BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error('Cannot reach the server. Is the backend running?')
  }
  const data = (await res.json().catch(() => ({}))) as { detail?: unknown }
  if (!res.ok) {
    throw new Error(typeof data.detail === 'string' ? data.detail : 'Something went wrong. Please try again.')
  }
  return data as unknown as AuthReply
}

function save(reply: AuthReply): User {
  localStorage.setItem(TOKEN_KEY, reply.token)
  localStorage.setItem(SESSION_KEY, JSON.stringify(reply.user))
  notify()
  return reply.user
}

export function getUser(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export async function signup(name: string, email: string, password: string): Promise<User> {
  return save(await post('/auth/signup', { name, email, password }))
}

export async function login(email: string, password: string): Promise<User> {
  return save(await post('/auth/login', { email, password }))
}

export function logout() {
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(TOKEN_KEY)
  notify()
}
'@

Write-Host ''
Write-Host 'DONE. Start the backend, then run npm run dev.' -ForegroundColor Green
Write-Host 'Yellow lines above (if any) mean a patch did not match - send me the line and I will fix it.' -ForegroundColor Green
