import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useScroll, useSpring } from 'motion/react'
import { Menu, X } from 'lucide-react'
import { logout } from '../lib/auth'
import { useUser } from '../lib/useUser'

const links = [
  { to: '/', label: 'Home' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/assistant', label: 'Assistant' },
  { to: '/lab', label: 'Lab' },
  { to: '/about', label: 'About' },
]

const mono = 'font-mono text-[11px] uppercase tracking-[0.25em]'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 25 })
  const user = useUser()
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleLogout = () => {
    logout()
    setOpen(false)
    navigate('/')
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled || open ? 'glass-bar' : 'border-b border-transparent bg-transparent'
      }`}
    >
      <nav className="mx-auto grid h-20 max-w-7xl grid-cols-[1fr_auto] items-center px-6 md:grid-cols-[1fr_auto_1fr]">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 text-base font-extrabold tracking-tight">
          <motion.span
            animate={{ scale: [1, 1.35, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="h-2.5 w-2.5 rounded-full bg-flame shadow-[0_0_12px_#FF6B2C]"
          />
          Flame in Freefall
        </Link>

        {/* Desktop links */}
        <ul className="hidden items-center gap-10 md:flex">
          {links.map((l) => (
            <li key={l.to}>
              <NavLink
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) =>
                  `${mono} relative block py-2 transition-colors ${
                    isActive ? 'text-ink' : 'text-muted hover:text-flame'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {l.label}
                    {isActive && (
                      <motion.span
                        layoutId="nav-underline"
                        className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-flame"
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Desktop: login button, or user name + log out */}
        <div className="hidden justify-self-end md:block">
          {user ? (
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2.5 text-sm text-ink">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-flame/50 bg-flame/10 font-mono text-[11px] text-flame">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="max-w-[9rem] truncate">{user.name}</span>
              </span>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className={`${mono} cursor-pointer border border-white/25 px-5 py-3 text-ink transition-colors hover:border-flame hover:text-flame`}
              >
                Log out
              </motion.button>
            </div>
          ) : (
            <motion.div whileTap={{ scale: 0.95 }}>
              <Link
                to="/login"
                className={`${mono} group relative block overflow-hidden border border-white/25 px-7 py-3.5 text-ink transition-colors hover:border-flame`}
              >
                <span className="absolute inset-0 -translate-x-full bg-flame transition-transform duration-300 group-hover:translate-x-0" />
                <span className="relative transition-colors duration-300 group-hover:text-space">Login</span>
              </Link>
            </motion.div>
          )}
        </div>

        {/* Mobile hamburger */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          className="justify-self-end md:hidden"
          aria-label="Toggle menu"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X /> : <Menu />}
        </motion.button>
      </nav>

      {/* Scroll progress line */}
      <motion.div className="h-px origin-left bg-flame" style={{ scaleX: progress }} />

      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden md:hidden"
          >
            {links.map((l) => (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  end={l.to === '/'}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `${mono} block px-6 py-4 ${isActive ? 'text-flame' : 'text-ink'}`
                  }
                >
                  {l.label}
                </NavLink>
              </li>
            ))}
            <li>
              {user ? (
                <button onClick={handleLogout} className={`${mono} block w-full px-6 py-4 text-left text-ink`}>
                  Log out ({user.name})
                </button>
              ) : (
                <NavLink to="/login" onClick={() => setOpen(false)} className={`${mono} block px-6 py-4 text-ink`}>
                  Login
                </NavLink>
              )}
            </li>
          </motion.ul>
        )}
      </AnimatePresence>
    </header>
  )
}