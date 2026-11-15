import { useEffect, useRef } from 'react'
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useSpring,
  useTransform,
} from 'motion/react'

const IDLE_SPEED = 9 // degrees per second
const HOVER_SPEED = 90

export default function FlameOrb({ className = '' }: { className?: string }) {
  // cursor position across the window, -1 .. 1
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 90, damping: 14 })
  const sy = useSpring(my, { stiffness: 90, damping: 14 })
  const x = useTransform(sx, (v) => v * 28)
  const y = useTransform(sy, (v) => v * 28)
  const rotateY = useTransform(sx, (v) => v * 16)
  const rotateX = useTransform(sy, (v) => v * -16)

  // continuous spin whose speed eases up when the mouse touches the orb
  const spin = useMotionValue(0)
  const speed = useRef(IDLE_SPEED)
  const target = useRef(IDLE_SPEED)
  useAnimationFrame((_, delta) => {
    speed.current += (target.current - speed.current) * 0.06
    spin.set(spin.get() + (speed.current * delta) / 1000)
  })

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mx.set((e.clientX / window.innerWidth - 0.5) * 2)
      my.set((e.clientY / window.innerHeight - 0.5) * 2)
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [mx, my])

  return (
    <div className={className} style={{ perspective: 900 }}>
      <motion.div
        className="relative h-full w-full cursor-pointer"
        style={{ x, y, rotateX, rotateY }}
        whileHover={{
          scale: 1.08,
          rotate: [0, -6, 6, -4, 4, -2, 0],
          transition: {
            scale: { type: 'spring', stiffness: 200, damping: 12 },
            rotate: { duration: 0.8, ease: 'easeInOut' },
          },
        }}
        whileTap={{ scale: 0.94 }}
        onHoverStart={() => (target.current = HOVER_SPEED)}
        onHoverEnd={() => (target.current = IDLE_SPEED)}
      >
        {/* pulsing glow */}
        <motion.div
          className="absolute -inset-16 rounded-full bg-[radial-gradient(circle,rgba(255,107,44,0.5)_0%,rgba(255,107,44,0.15)_45%,transparent_70%)]"
          animate={{ opacity: [0.5, 1, 0.5], scale: [0.95, 1.08, 0.95] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* faint blue rings */}
        <motion.div
          className="absolute -inset-5 rounded-full border border-blueflame/40"
          animate={{ scale: [1, 1.05, 1], opacity: [0.35, 0.8, 0.35] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -inset-10 rounded-full border border-flame/20"
          animate={{ scale: [1.02, 0.98, 1.02], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* spinning picture */}
        <motion.div className="relative h-full w-full overflow-hidden rounded-full" style={{ rotate: spin }}>
          <img
            src="/hero-flame.jpg"
            alt="Spherical flame burning in microgravity"
            draggable={false}
            className="h-full w-full scale-110 object-cover"
          />
        </motion.div>
      </motion.div>
    </div>
  )
}