import { useEffect, useMemo, useState } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'motion/react'
import { RotateCcw } from 'lucide-react'
import type { FlameData } from '../../lib/lab'

const mono = 'font-mono uppercase tracking-[0.25em]'
const PX_PER_MM = 38 // 4.67 mm droplet -> about 177 px flame

// Schematic only: duration, droplet size and final size come from the nearest NASA tests,
// the shape of the animation (d-squared law) is an illustration, not measured frames.
export default function FlameStage({ data, fuel }: { data: FlameData; fuel: string }) {
  const [run, setRun] = useState(0)
  const progress = useMotionValue(0)
  const d0 = data.initial_droplet_diameter_mm
  const ratio = useMemo(() => {
    const de = data.extinction_diameter_mm
    return de && d0 > 0 ? Math.min(0.9, Math.max(0.12, de / d0)) : 0.4
  }, [data.extinction_diameter_mm, d0])

  useEffect(() => {
    progress.set(0)
    const controls = animate(progress, 1, { duration: Math.max(1, data.flame_duration_s), ease: 'linear' })
    return () => controls.stop()
  }, [run, data.flame_duration_s, progress])

  // diameter shrinks by the d-squared law: d^2 falls linearly with time
  const scale = useTransform(progress, (p) => Math.sqrt(1 - (1 - ratio * ratio) * p))
  const ignite = useTransform(progress, (p) => Math.min(1, p / 0.06))
  const flameScale = useTransform([scale, ignite], ([s, i]: number[]) => s * i)
  const opacity = useTransform(progress, [0, 0.04, 0.9, 1], [0, 1, 1, 0])
  const elapsed = useTransform(progress, (p) => (p * data.flame_duration_s).toFixed(1))

  const blue = fuel.toLowerCase() === 'methanol'
  const glow = blue
    ? 'radial-gradient(circle, rgba(76,201,240,0.75) 0%, rgba(76,201,240,0.35) 45%, rgba(76,201,240,0) 70%)'
    : 'radial-gradient(circle, rgba(255,179,71,0.85) 0%, rgba(255,107,44,0.5) 45%, rgba(255,107,44,0) 70%)'
  const size = d0 * PX_PER_MM

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/60">
      <div className="relative flex h-60 items-center justify-center">
        <motion.div
          className="absolute rounded-full"
          style={{ width: size, height: size, background: glow, scale: flameScale, opacity }}
        />
        <motion.div
          className="absolute rounded-full bg-white/80 shadow-[0_0_12px_rgba(255,255,255,0.5)]"
          style={{ width: d0 * 9, height: d0 * 9, scale }}
        />
        <span className={`${mono} absolute top-3 left-4 text-[9px] text-muted`}>Schematic</span>
        <button
          onClick={() => setRun((r) => r + 1)}
          aria-label="Replay"
          className={`${mono} absolute top-2.5 right-3 flex cursor-pointer items-center gap-1.5 px-2 py-1 text-[9px] text-muted hover:text-flame`}
        >
          <RotateCcw size={12} /> Replay
        </button>
        <div className="absolute bottom-3 left-4 font-mono text-xs text-ink">
          <motion.span>{elapsed}</motion.span> s <span className="text-muted">/ {data.flame_duration_s} s</span>
        </div>
      </div>
      <p className="border-t border-white/10 px-4 py-2 text-[11px] leading-snug text-muted">{data.note}</p>
    </div>
  )
}
