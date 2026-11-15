import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { login, logout, signup } from '../lib/auth'
import { useUser } from '../lib/useUser'

type Mode = 'login' | 'signup'
interface Values {
  name: string
  email: string
  password: string
  confirm: string
}
type Errors = Partial<Record<keyof Values, string>>

const mono = 'font-mono uppercase tracking-[0.25em]'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(mode: Mode, v: Values): Errors {
  const e: Errors = {}
  if (mode === 'signup' && v.name.trim().length < 2) {
    e.name = 'Please enter your name (at least 2 characters).'
  }
  if (!v.email.trim()) e.email = 'Email is required.'
  else if (!EMAIL_RE.test(v.email.trim())) e.email = 'Enter a valid email like name@example.com.'
  if (!v.password) e.password = 'Password is required.'
  else if (v.password.length < 8) e.password = 'Password must be at least 8 characters.'
  if (mode === 'signup') {
    if (!v.confirm) e.confirm = 'Please confirm your password.'
    else if (v.confirm !== v.password) e.confirm = 'Passwords do not match.'
  }
  return e
}

function Collapse({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="-mx-1 overflow-hidden px-1"
    >
      {children}
    </motion.div>
  )
}

interface FieldProps {
  label: string
  type?: 'text' | 'email' | 'password'
  value: string
  onChange: (v: string) => void
  onBlur: () => void
  error?: string
  autoComplete?: string
  placeholder?: string
}

function Field({ label, type = 'text', value, onChange, onBlur, error, autoComplete, placeholder }: FieldProps) {
  const [show, setShow] = useState(false)
  const id = useId()
  const isPassword = type === 'password'

  return (
    <div className="pb-4">
      <label htmlFor={id} className={`${mono} mb-2 block text-[10px] text-muted`}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && show ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={!!error}
          className={`w-full rounded-lg border bg-white/[0.04] px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-flame ${
            error ? 'border-red-400/70' : 'border-white/10'
          } ${isPassword ? 'pr-12' : ''}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 flex w-12 cursor-pointer items-center justify-center text-muted hover:text-flame"
          >
            {show ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            key="err"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden pt-1.5 text-xs text-red-400"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

function SuccessView({ name }: { name: string }) {
  return (
    <motion.div
      key="success"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center py-8 text-center"
    >
      <svg viewBox="0 0 52 52" className="h-20 w-20">
        <motion.circle
          cx="26"
          cy="26"
          r="24"
          fill="none"
          stroke="#FF6B2C"
          strokeWidth="2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5 }}
        />
        <motion.path
          d="M15 27 l8 8 l15 -16"
          fill="none"
          stroke="#FFB347"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.4, duration: 0.35 }}
        />
      </svg>
      <motion.h2
        className="mt-5 text-xl font-bold"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        Welcome, {name}
      </motion.h2>
      <motion.p
        className="mt-1 text-sm text-muted"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        Taking you to the dashboard…
      </motion.p>
    </motion.div>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const user = useUser()
  const [mode, setMode] = useState<Mode>('login')
  const [values, setValues] = useState<Values>({ name: '', email: '', password: '', confirm: '' })
  const [touched, setTouched] = useState<Record<keyof Values, boolean>>({
    name: false,
    email: false,
    password: false,
    confirm: false,
  })
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [successName, setSuccessName] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const errors = validate(mode, values)
  const set = (k: keyof Values) => (v: string) => setValues((s) => ({ ...s, [k]: v }))
  const blur = (k: keyof Values) => () => setTouched((t) => ({ ...t, [k]: true }))
  const shown = (k: keyof Values) => (touched[k] ? errors[k] : undefined)

  const switchMode = (m: Mode) => {
    if (m === mode) return
    setMode(m)
    setFormError('')
    setTouched({ name: false, email: false, password: false, confirm: false })
    setValues((s) => ({ ...s, password: '', confirm: '' }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setTouched({ name: true, email: true, password: true, confirm: true })
    setFormError('')
    if (Object.keys(validate(mode, values)).length > 0) return
    setLoading(true)
    try {
      await new Promise((r) => setTimeout(r, 700)) // so the spinner is visible
      const u =
        mode === 'signup'
          ? await signup(values.name, values.email, values.password)
          : await login(values.email, values.password)
      setSuccessName(u.name)
      timer.current = window.setTimeout(() => navigate('/dashboard'), 1400)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const signedInView = user && !loading && !successName

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 pt-28 pb-16">
      
      

      <motion.div
        className="glass relative z-10 w-full max-w-md p-8"
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {successName ? (
            <SuccessView key="success" name={successName} />
          ) : signedInView ? (
            <motion.div
              key="signedin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-4 text-center"
            >
              <p className={`${mono} mb-3 text-[10px] text-flame`}>Signed in</p>
              <h2 className="text-xl font-bold">{user.name}</h2>
              <p className="mt-1 text-sm text-muted">{user.email}</p>
              <div className="mt-6 flex flex-col gap-3">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate('/dashboard')}
                  className={`${mono} cursor-pointer bg-flame py-3.5 text-[11px] font-bold text-space`}
                >
                  Go to dashboard
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={logout}
                  className={`${mono} cursor-pointer border border-white/20 py-3.5 text-[11px] text-ink hover:border-flame`}
                >
                  Log out
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Sliding pill toggle */}
              <div className="relative mb-7 grid grid-cols-2 rounded-full border border-white/10 bg-white/[0.03] p-1">
                {(['login', 'signup'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => switchMode(m)}
                    className={`${mono} relative z-10 cursor-pointer py-2.5 text-[10px] transition-colors ${
                      mode === m ? 'text-space' : 'text-muted hover:text-ink'
                    }`}
                  >
                    {mode === m && (
                      <motion.span
                        layoutId="auth-pill"
                        className="absolute inset-0 -z-10 rounded-full bg-flame"
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      />
                    )}
                    {m === 'login' ? 'Log in' : 'Sign up'}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="mb-6"
                >
                  <h1 className="text-xl font-bold">
                    {mode === 'login' ? 'Welcome back' : 'Create your account'}
                  </h1>
                  <p className="mt-1 text-sm text-muted">
                    {mode === 'login'
                      ? 'Log in to explore the flame experiments.'
                      : 'Join to save comparisons and ask the AI.'}
                  </p>
                </motion.div>
              </AnimatePresence>

              <form onSubmit={onSubmit} noValidate>
                <AnimatePresence initial={false}>
                  {mode === 'signup' && (
                    <Collapse key="name">
                      <Field
                        label="Name"
                        value={values.name}
                        onChange={set('name')}
                        onBlur={blur('name')}
                        error={shown('name')}
                        autoComplete="name"
                        placeholder="Your name"
                      />
                    </Collapse>
                  )}
                </AnimatePresence>

                <Field
                  label="Email"
                  type="email"
                  value={values.email}
                  onChange={set('email')}
                  onBlur={blur('email')}
                  error={shown('email')}
                  autoComplete="email"
                  placeholder="name@example.com"
                />
                <Field
                  label="Password"
                  type="password"
                  value={values.password}
                  onChange={set('password')}
                  onBlur={blur('password')}
                  error={shown('password')}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder="At least 8 characters"
                />

                <AnimatePresence initial={false}>
                  {mode === 'signup' && (
                    <Collapse key="confirm">
                      <Field
                        label="Confirm password"
                        type="password"
                        value={values.confirm}
                        onChange={set('confirm')}
                        onBlur={blur('confirm')}
                        error={shown('confirm')}
                        autoComplete="new-password"
                        placeholder="Repeat your password"
                      />
                    </Collapse>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {formError && (
                    <motion.div
                      key={formError}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, x: [0, -8, 8, -6, 6, 0] }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      role="alert"
                      className="mb-4 rounded-lg border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-300"
                    >
                      {formError}
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.97 }}
                  className={`${mono} flex w-full cursor-pointer items-center justify-center gap-2 bg-flame py-3.5 text-[11px] font-bold text-space shadow-[0_0_28px_rgba(255,107,44,0.35)] disabled:cursor-wait disabled:opacity-80`}
                >
                  {loading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      {mode === 'login' ? 'Logging in' : 'Creating account'}
                    </>
                  ) : mode === 'login' ? (
                    'Log in'
                  ) : (
                    'Create account'
                  )}
                </motion.button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </section>
  )
}