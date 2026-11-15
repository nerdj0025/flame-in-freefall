import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowRight, ChevronDown } from 'lucide-react'
import CountUp from '../components/CountUp'
import FlameOrb from '../components/FlameOrb'

const title = 'Flame in Freefall'
const mono = 'font-mono uppercase tracking-[0.25em]'

// Update these numbers when the real data arrives
const EXPERIMENT_COUNT = 5
const AI_CAPABILITIES = 5

const reasons = [
  {
    title: 'Fire behaves differently in space',
    text: 'Without gravity there is no buoyancy. Flames turn round, burn cooler and spread in surprising ways.',
  },
  {
    title: 'Safety for astronauts',
    text: 'Understanding how flames start, spread and go out helps design safer spacecraft and habitats.',
  },
  {
    title: 'Too much data to read by hand',
    text: 'Our AI analyses, compares and summarises NASA combustion experiments so patterns are easy to see.',
  },
]

const stats = [
  { value: EXPERIMENT_COUNT, suffix: '', label: 'NASA experiments analysed' },
  { value: AI_CAPABILITIES, suffix: '', label: 'AI capabilities' },
]

export default function Home() {
  const scrollToWhy = () =>
    document.getElementById('why')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div>
      {/* HERO */}
      <section className="relative flex min-h-screen flex-col overflow-hidden">
        
        

        {/* Orb: centred on desktop, in the flow on mobile */}
        <FlameOrb className="relative z-10 mx-auto mt-28 mb-10 h-60 w-60 sm:h-72 sm:w-72 md:absolute md:top-[44%] md:left-1/2 md:mt-0 md:mb-0 md:h-[26rem] md:w-[26rem] md:-translate-x-1/2 md:-translate-y-1/2" />

        {/* Bottom row: headline left, actions right */}
        <div className="relative z-20 mx-auto mt-auto grid w-full max-w-7xl gap-8 px-6 pb-20 md:grid-cols-2 md:items-end">
          <div>
            <motion.p
              className={`${mono} mb-3 text-[10px] text-flame`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              NASA combustion · AI analysis
            </motion.p>
            <h1 className="text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-5xl">
              {title.split(' ').map((word, w) => (
                <span key={w} className="mr-3 inline-block whitespace-nowrap">
                  {word.split('').map((ch, i) => (
                    <motion.span
                      key={i}
                      className="inline-block bg-gradient-to-b from-white to-ember bg-clip-text text-transparent"
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 + (w * 6 + i) * 0.025, duration: 0.35 }}
                    >
                      {ch}
                    </motion.span>
                  ))}
                </span>
              ))}
            </h1>
            <motion.p
              className="mt-4 max-w-md text-base leading-relaxed text-muted"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              AI that understands how fire behaves in space. Explore, compare and ask questions about
              NASA flame experiments.
            </motion.p>
          </div>

          <motion.div
            className="md:justify-self-end"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
          >
            <p className="mb-3 text-sm text-muted md:text-right">Built on real NASA microgravity combustion data.</p>
            <div className="flex flex-wrap items-stretch gap-3 md:justify-end">
              <div className={`${mono} flex items-center border border-white/15 bg-white/[0.03] px-4 py-3.5 text-[10px] text-ink`}>
                {EXPERIMENT_COUNT} experiments · AI-powered
              </div>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Link
                  to="/dashboard"
                  className={`${mono} flex h-full items-center gap-3 bg-flame px-6 py-3.5 text-[10px] font-bold text-space shadow-[0_0_30px_rgba(255,107,44,0.45)]`}
                >
                  Explore dashboard <ArrowRight size={13} />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Link
                  to="/assistant"
                  className={`${mono} flex h-full items-center border border-flame/60 px-6 py-3.5 text-[10px] text-ink hover:bg-flame/10`}
                >
                  Ask the AI
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Scroll cue: now a real button */}
        <motion.button
          type="button"
          onClick={scrollToWhy}
          className={`${mono} absolute bottom-4 left-1/2 z-20 hidden -translate-x-1/2 cursor-pointer flex-col items-center text-[10px] text-muted hover:text-flame md:flex`}
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          whileTap={{ scale: 0.95 }}
        >
          Learn more
          <ChevronDown size={14} />
        </motion.button>
      </section>

      {/* WHY IT MATTERS */}
      <section id="why" className="mx-auto max-w-7xl scroll-mt-16 px-6 py-24">
        <motion.p
          className={`${mono} mb-3 text-[10px] text-flame`}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          01 / Why it matters
        </motion.p>
        <motion.h2
          className="mb-10 max-w-2xl text-2xl font-bold sm:text-3xl"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          Fire is simple on Earth. <span className="text-flame">In space, nothing is.</span>
        </motion.h2>
        <div className="grid gap-6 md:grid-cols-3">
          {reasons.map((r, i) => (
            <motion.div
              key={r.title}
              className="glass glass-hover p-6"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              whileHover={{ y: -6 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className={`${mono} mb-4 text-[10px] text-flame`}>0{i + 1}</div>
              <h3 className="mb-2 text-base font-semibold">{r.title}</h3>
              <p className="text-sm leading-relaxed text-muted">{r.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* STATS */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="grid gap-6 sm:grid-cols-2">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              className="glass glass-hover p-8 text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <div className="text-4xl font-extrabold text-flame">
                <CountUp to={s.value} suffix={s.suffix} />
              </div>
              <div className={`${mono} mt-3 text-[10px] text-muted`}>{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  )
}