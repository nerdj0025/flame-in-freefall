import { useMemo } from 'react'
import { motion } from 'motion/react'

// Small seeded random so the stars are stable between renders
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

export default function StarField({ count = 80 }: { count?: number }) {
  const stars = useMemo(() => {
    const rand = seeded(42)
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: rand() * 100,
      top: rand() * 100,
      size: 1 + rand() * 2.2,
      delay: rand() * 4,
      duration: 2 + rand() * 3,
    }))
  }, [count])

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {stars.map((s) => (
        <motion.span
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size }}
          initial={{ opacity: 0.15 }}
          animate={{ opacity: [0.15, 1, 0.15] }}
          transition={{ duration: s.duration, delay: s.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}