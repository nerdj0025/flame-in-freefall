import type { ReactNode } from 'react'
import { motion } from 'motion/react'

const mono = 'font-mono uppercase tracking-[0.25em]'

export function EmptyNote({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted">{text}</div>
  )
}

interface Props {
  title: string
  controls?: ReactNode
  children: ReactNode
  className?: string
}

export default function ChartCard({ title, controls, children, className = '' }: Props) {
  return (
    <motion.div
      className={`glass p-5 ${className}`}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h3 className={`${mono} text-[11px] text-flame`}>{title}</h3>
        {controls && <div className="flex flex-wrap gap-3">{controls}</div>}
      </div>
      <div className="h-72">{children}</div>
    </motion.div>
  )
}