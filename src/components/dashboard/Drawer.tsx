import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import type { Experiment } from '../../lib/api'
import { colorOf, formatValue, labelOf } from '../../lib/dashboard'
import { SeriesChart } from './Charts'
import { Badge } from './ExperimentCard'

const mono = 'font-mono uppercase tracking-[0.25em]'
const HIDDEN = ['id', 'title', 'series']

export default function Drawer({ experiment, onClose }: { experiment: Experiment | null; onClose: () => void }) {
  const open = experiment !== null

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {experiment && (
        <>
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-[60] bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            key="panel"
            role="dialog"
            aria-label={experiment.title}
            className="fixed inset-y-0 right-0 z-[60] w-full overflow-y-auto border-l border-white/10 bg-space p-6 sm:w-[30rem]"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <span className={`${mono} text-[10px] text-flame`}>{experiment.id}</span>
              <button
                onClick={onClose}
                aria-label="Close"
                className="cursor-pointer text-muted transition-colors hover:text-flame"
              >
                <X size={20} />
              </button>
            </div>

            <h2 className="mb-4 text-2xl leading-tight font-bold">{experiment.title}</h2>
            <div className="mb-6 flex flex-wrap gap-2">
              <Badge text={experiment.gravityLevel} color={colorOf(experiment.gravityLevel)} />
              <Badge text={experiment.fuel} />
              <Badge text={experiment.flameType} />
              {experiment.extinguished && <Badge text="Extinguished" color="#F87171" />}
            </div>

            <div className="glass mb-6 p-5">
              <p className={`${mono} mb-3 text-[10px] text-muted`}>Details</p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                {Object.keys(experiment)
                  .filter((k) => !HIDDEN.includes(k))
                  .map((k) => (
                    <div key={k}>
                      <dt className={`${mono} text-[9px] text-muted`}>{labelOf(k)}</dt>
                      <dd className="font-semibold">
                        {formatValue((experiment as unknown as Record<string, unknown>)[k], k)}
                      </dd>
                    </div>
                  ))}
              </dl>
            </div>

            <div className="glass mb-6 p-5">
              <p className={`${mono} mb-3 text-[10px] text-muted`}>Flame over time</p>
              <div className="h-64">
                <SeriesChart series={experiment.series} />
              </div>
            </div>

            <Link
              to="/assistant"
              className={`${mono} block bg-flame py-3.5 text-center text-[11px] font-bold text-space shadow-[0_0_28px_rgba(255,107,44,0.35)]`}
            >
              Ask the AI about this
            </Link>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}