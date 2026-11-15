import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useSpring } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import TiltCard from '../components/TiltCard'

const mono = 'font-mono uppercase tracking-[0.25em]'

const mission = [
  { title: 'Analyse', text: 'AI reads each experiment report and pulls out the fuel, gravity level, conditions and results.' },
  { title: 'Compare', text: 'Experiments are lined up side by side so differences in flame behaviour are easy to see.' },
  { title: 'Answer', text: 'Ask a question in plain language and get an answer that points back to the experiments behind it.' },
]

const steps = [
  { title: 'NASA data', text: 'Combustion experiment reports and measurements are collected from NASA research.' },
  { title: 'AI analysis', text: 'Language models read the reports, extract the key details and index them for semantic search.' },
  { title: 'Comparison', text: 'Experiments are ranked and compared by fuel, gravity, pressure and how the flame behaved.' },
  { title: 'Insights', text: 'Patterns about flame behaviour and safety are summarised in clear, simple language.' },
]

// Placeholder team: edit names and roles here
const team = [
  { name: 'Joudy', role: 'Frontend and backend' },
  { name: 'Ghazal', role: 'AI model and NLP' },
  { name: 'Hadil', role: 'Data analysis and engineering' },
]

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

function SectionLabel({ children }: { children: string }) {
  return (
    <motion.p
      className={`${mono} mb-3 text-[10px] text-flame`}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
    >
      {children}
    </motion.p>
  )
}

function Timeline() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.75', 'end 0.55'] })
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 25 })

  return (
    <div ref={ref} className="relative mx-auto max-w-3xl">
      {/* base line + progress line */}
      <div className="absolute top-2 bottom-2 left-[18px] w-px bg-white/10" />
      <motion.div className="absolute top-2 bottom-2 left-[18px] w-px origin-top bg-flame" style={{ scaleY: fill }} />

      <div className="space-y-10">
        {steps.map((s, i) => (
          <motion.div
            key={s.title}
            className="relative pl-16"
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '0px 0px -15% 0px' }}
            transition={{ duration: 0.4 }}
          >
            <motion.div
              className="absolute top-0 left-0 flex h-9 w-9 items-center justify-center rounded-full border font-mono text-xs"
              initial={{ backgroundColor: '#0B0F1A', borderColor: 'rgba(255,255,255,0.15)', color: '#E8ECF4' }}
              whileInView={{ backgroundColor: '#FF6B2C', borderColor: '#FF6B2C', color: '#0B0F1A', scale: [1, 1.25, 1] }}
              viewport={{ once: true, margin: '0px 0px -15% 0px' }}
              transition={{ duration: 0.5 }}
            >
              {i + 1}
            </motion.div>
            <motion.div className="glass glass-hover p-5" whileHover={{ x: 6 }}>
              <h3 className="text-base font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{s.text}</p>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export default function About() {
  return (
    <div>
      {/* INTRO */}
      <section className="mx-auto max-w-5xl px-6 pt-36 pb-16 text-center">
        <motion.p
          className={`${mono} mb-4 text-[10px] text-flame`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          About the project
        </motion.p>
        <motion.h1
          className="text-3xl font-extrabold tracking-tight sm:text-4xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          Making sense of <span className="text-flame">fire in space</span>
        </motion.h1>
        <motion.p
          className="mx-auto mt-4 max-w-xl text-base text-muted"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          Built for the NASA hackathon by a small team who wanted combustion research to be easier to explore.
        </motion.p>
      </section>

      {/* MISSION */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <SectionLabel>01 / Our mission</SectionLabel>
        <motion.h2
          className="mb-4 max-w-2xl text-2xl font-bold sm:text-3xl"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          NASA has run many experiments on how flames behave without gravity. Reading them all is slow.
        </motion.h2>
        <motion.p
          className="mb-10 max-w-2xl text-sm leading-relaxed text-muted"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          Flame in Freefall is a platform that uses AI to analyse these experiments, summarise them, compare them
          and surface patterns about how fire behaves and how to stay safe around it.
        </motion.p>
        <div className="grid gap-6 md:grid-cols-3">
          {mission.map((m, i) => (
            <motion.div
              key={m.title}
              className="glass glass-hover p-6"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              whileHover={{ y: -6 }}
            >
              <div className={`${mono} mb-3 text-[10px] text-flame`}>0{i + 1}</div>
              <h3 className="mb-2 text-base font-semibold">{m.title}</h3>
              <p className="text-sm leading-relaxed text-muted">{m.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <SectionLabel>02 / How it works</SectionLabel>
        <motion.h2
          className="mb-12 text-2xl font-bold sm:text-3xl"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          From raw reports to clear answers
        </motion.h2>
        <Timeline />
      </section>

      {/* TEAM */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <SectionLabel>03 / The team</SectionLabel>
        <motion.h2
          className="mb-10 text-2xl font-bold sm:text-3xl"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          The people behind it
        </motion.h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {team.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
            >
              <TiltCard className="glass glass-hover flex h-full flex-col items-center p-6 text-center">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-flame/50 bg-flame/10 text-xl font-bold text-flame shadow-[0_0_24px_rgba(255,107,44,0.25)]">
                  {initials(t.name)}
                </div>
                <h3 className="text-base font-semibold">{t.name}</h3>
                <p className={`${mono} mt-2 text-[10px] text-muted`}>{t.role}</p>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-6 pt-16 pb-28">
        <motion.div
          className="glass relative overflow-hidden p-10 text-center"
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
        >
          <motion.div
            className="pointer-events-none absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(255,107,44,0.35),transparent_70%)]"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <h2 className="relative text-2xl font-bold sm:text-3xl">See the experiments for yourself</h2>
          <p className="relative mx-auto mt-3 max-w-md text-sm text-muted">
            Explore the data, compare experiments, or just ask the AI a question.
          </p>
          <div className="relative mt-7 flex flex-wrap justify-center gap-3">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
              <Link
                to="/dashboard"
                className={`${mono} flex items-center gap-3 bg-flame px-6 py-3.5 text-[10px] font-bold text-space shadow-[0_0_30px_rgba(255,107,44,0.45)]`}
              >
                Explore dashboard <ArrowRight size={13} />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
              <Link
                to="/assistant"
                className={`${mono} flex items-center border border-flame/60 px-6 py-3.5 text-[10px] text-ink hover:bg-flame/10`}
              >
                Ask the AI
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>
    </div>
  )
}