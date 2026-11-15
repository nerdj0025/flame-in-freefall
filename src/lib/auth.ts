// Demo-only auth: everything lives in localStorage until the real backend exists.
// To go real, replace the bodies of signup/login/logout with fetch() calls.

export const SESSION_KEY = 'ff_session'
const USERS_KEY = 'ff_users'

export interface User {
  name: string
  email: string
}

interface StoredUser extends User {
  hash: string
}

async function hash(text: string): Promise<string> {
  // crypto.subtle only exists on https or localhost; fall back to plain text for the demo
  if (!globalThis.crypto?.subtle) return 'plain:' + text
  const data = new TextEncoder().encode(text)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function readUsers(): StoredUser[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? '[]') as StoredUser[]
  } catch {
    return []
  }
}

function notify() {
  window.dispatchEvent(new Event('ff-auth'))
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
  const users = readUsers()
  const e = email.trim().toLowerCase()
  if (users.some((u) => u.email === e)) {
    throw new Error('An account with this email already exists. Try logging in.')
  }
  const user: User = { name: name.trim(), email: e }
  users.push({ ...user, hash: await hash(password) })
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
  localStorage.setItem(SESSION_KEY, JSON.stringify(user))
  notify()
  return user
}

export async function login(email: string, password: string): Promise<User> {
  const e = email.trim().toLowerCase()
  const found = readUsers().find((u) => u.email === e)
  if (!found || found.hash !== (await hash(password))) {
    throw new Error('Incorrect email or password.')
  }
  const user: User = { name: found.name, email: found.email }
  localStorage.setItem(SESSION_KEY, JSON.stringify(user))
  notify()
  return user
}

export function logout() {
  localStorage.removeItem(SESSION_KEY)
  notify()
}