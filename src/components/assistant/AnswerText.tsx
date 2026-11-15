import { useEffect, useRef, useState } from 'react'

interface Props {
  text: string
  animate: boolean // true = typewriter reveal, false = show everything at once
  onDone: () => void
  onGrow: () => void
  onMarker: (id: number) => void
}

// Shows an answer with a typewriter effect (click to skip) and turns [1] markers into small chips.
export default function AnswerText({ text, animate, onDone, onGrow, onMarker }: Props) {
  const [shown, setShown] = useState(animate ? 0 : text.length)
  const doneRef = useRef(onDone)
  const growRef = useRef(onGrow)

  useEffect(() => {
    doneRef.current = onDone
    growRef.current = onGrow
  })

  useEffect(() => {
    if (!animate) return
    const timer = window.setInterval(() => {
      setShown((s) => Math.min(s + 2, text.length))
      growRef.current()
    }, 16)
    return () => window.clearInterval(timer)
  }, [animate, text])

  useEffect(() => {
    if (animate && shown >= text.length) doneRef.current()
  }, [animate, shown, text])

  const typing = animate && shown < text.length
  // hide a half-typed marker such as "[1" until it is complete
  const visible = text.slice(0, shown).replace(/\[\d*$/, '')
  const parts = visible.split(/(\[\d+\])/g)

  return (
    <p
      className={`text-sm leading-relaxed text-ink ${typing ? 'cursor-pointer' : ''}`}
      onClick={() => typing && setShown(text.length)}
      title={typing ? 'Click to skip' : undefined}
    >
      {parts.map((part, i) => {
        const m = /^\[(\d+)\]$/.exec(part)
        if (m) {
          const id = Number(m[1])
          return (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onMarker(id)
              }}
              className="mx-0.5 inline-flex h-4 min-w-4 -translate-y-0.5 cursor-pointer items-center justify-center rounded bg-flame/15 px-1 font-mono text-[10px] text-flame transition-colors hover:bg-flame hover:text-space"
              aria-label={'Show source ' + id}
            >
              {id}
            </button>
          )
        }
        return <span key={i}>{part}</span>
      })}
      {typing && <span className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-flame" />}
    </p>
  )
}