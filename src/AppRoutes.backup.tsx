import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import Navbar from './components/Navbar'
import StarField from './components/StarField'
import Embers from './components/Embers'
import ErrorBoundary from './components/ErrorBoundary'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Lab from './pages/Lab'
import InvisibleFlame from './pages/InvisibleFlame'
import Assistant from './pages/Assistant'
import About from './pages/About'
import Login from './pages/Login'

const EASE = [0.22, 1, 0.36, 1] as const

// Page slides up and fades in; the old page lifts away.
const pageVariants = {
  initial: { opacity: 0, y: 48, scale: 0.985 },
  enter: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: EASE } },
  exit: { opacity: 0, y: -32, scale: 1.01, transition: { duration: 0.3, ease: 'easeIn' as const } },
}

// A band of flame light that sweeps across the screen on every page change.
function Sweep() {
  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-[80] bg-gradient-to-r from-transparent via-flame/30 to-transparent"
      initial={{ x: '-100%' }}
      animate={{ x: '100%' }}
      transition={{ duration: 1, ease: [0.65, 0, 0.35, 1] }}
    />
  )
}

// Floating shortcut to the invisible-flame page, so no Navbar change is needed.
function FlameLink() {
  const isAr = document.documentElement.dir === 'rtl'
  return (
    <Link
      to="/invisible-flame"
      className="glass glass-hover fixed bottom-5 end-5 z-[70] flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-ember"
    >
      <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-blueflame shadow-[0_0_12px_var(--color-blueflame)]" />
      {isAr ? 'نمط اللهب غير المرئي' : 'Invisible flame'}
    </Link>
  )
}

export default function AppRoutes() {
  const location = useLocation()
  const prevPath = useRef(location.pathname)
  const [sweep, setSweep] = useState(0)

  useEffect(() => {
    if (prevPath.current !== location.pathname) {
      prevPath.current = location.pathname
      setSweep((n) => n + 1)
    }
  }, [location.pathname])

  return (
    <div className="relative min-h-screen">
      {/* One background for every page: stars and floating embers */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-black" aria-hidden="true">
        <StarField count={70} />
        <Embers count={30} />
      </div>

      <Navbar />

      <AnimatePresence mode="wait" onExitComplete={() => window.scrollTo({ top: 0, behavior: 'instant' })}>
        <motion.main
          key={location.pathname}
          variants={pageVariants}
          initial="initial"
          animate="enter"
          exit="exit"
        >
          <ErrorBoundary key={location.pathname}>
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/lab" element={<Lab />} />
              <Route path="/invisible-flame" element={<InvisibleFlame />} />
              <Route path="/assistant" element={<Assistant />} />
              <Route path="/about" element={<About />} />
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundary>
        </motion.main>
      </AnimatePresence>

      {location.pathname !== '/invisible-flame' && <FlameLink />}

      {sweep > 0 && <Sweep key={sweep} />}
    </div>
  )
}