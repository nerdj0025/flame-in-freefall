import { useEffect, useRef, useState } from 'react'
import { animate } from 'motion/react'

// Counts up (or down) to the new value whenever it changes.
export default function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [display, setDisplay] = useState(0)
  const current = useRef(0)

  useEffect(() => {
    const controls = animate(current.current, value, {
      duration: 0.9,
      ease: 'easeOut',
      onUpdate: (v) => {
        current.current = v
        setDisplay(v)
      },
    })
    return () => controls.stop()
  }, [value])

  return (
    <>
      {display.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
    </>
  )
}