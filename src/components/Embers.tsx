import { useMemo } from 'react'
import { motion } from 'motion/react'

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

export default function Embers({ count = 40 }: { count?: number }) {
  const embers = useMemo(() => {
    const rand = seeded(7)
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: rand() * 100,
      size: 2 + rand() * 4,
      drift: (rand() - 0.5) * 120,
      rise: 250 + rand() * 450,
      delay: rand() * 3,
      duration: 4 + rand() * 4,
      color: rand() > 0.5 ? '#FF6B2C' : '#FFB347',
    }))
  }, [count])

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {embers.map((e) => (
        <motion.span
          key={e.id}
          className="absolute rounded-full"
          style={{
            left: `${e.left}%`,
            bottom: '-10px',
            width: e.size,
            height: e.size,
            background: e.color,
          }}
          initial={{ y: 0, x: 0, opacity: 0 }}
          animate={{ y: -e.rise, x: e.drift, opacity: [0, 1, 0] }}
          transition={{ duration: e.duration, delay: e.delay, repeat: Infinity, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}