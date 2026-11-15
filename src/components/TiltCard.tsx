import type { ReactNode } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'

// Card that leans slightly toward the mouse
export default function TiltCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const sx = useSpring(px, { stiffness: 200, damping: 18 })
  const sy = useSpring(py, { stiffness: 200, damping: 18 })
  const rotateY = useTransform(sx, (v) => v * 16)
  const rotateX = useTransform(sy, (v) => v * -16)

  return (
    <div style={{ perspective: 800 }} className="h-full">
      <motion.div
        className={className}
        style={{ rotateX, rotateY }}
        whileHover={{ scale: 1.03 }}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          px.set((e.clientX - r.left) / r.width - 0.5)
          py.set((e.clientY - r.top) / r.height - 0.5)
        }}
        onMouseLeave={() => {
          px.set(0)
          py.set(0)
        }}
      >
        {children}
      </motion.div>
    </div>
  )
}