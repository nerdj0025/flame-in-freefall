import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ExternalLink } from 'lucide-react'
import type { Source } from '../../lib/api'

const mono = 'font-mono uppercase tracking-[0.2em]'

function domainOf(url?: string) {
  if (!url) return 'Source'
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

interface Props {
  source: Source
  turnId: number
  highlighted?: boolean
}

export default function SourceCard({ source, turnId, highlighted = false }: Props) {
  const label = source.experimentId ? 'Experiment ' + source.experimentId : domainOf(source.url)
  const cls = 'glass glass-hover group block p-4'
  const style = highlighted
    ? { borderColor: '#FF6B2C', boxShadow: '0 0 28px rgba(255,107,44,0.3)' }
    : undefined

  const body = (
    <>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <span className="flex h-5 min-w-5 items-center justify-center rounded bg-flame/15 px-1 font-mono text-[10px] text-flame">
            {source.id}
          </span>
          <span className={`${mono} truncate text-[9px] text-muted`}>{label}</span>
        </span>
        <ExternalLink size={13} className="shrink-0 text-muted transition-colors group-hover:text-flame" />
      </div>
      <h4 className="text-sm leading-snug font-semibold">{source.title}</h4>
      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{source.snippet}</p>
    </>
  )

  let card
  if (source.experimentId) {
    card = (
      <Link to={'/dashboard?exp=' + encodeURIComponent(source.experimentId)} className={cls} style={style}>
        {body}
      </Link>
    )
  } else if (source.url) {
    card = (
      <a href={source.url} target="_blank" rel="noreferrer" className={cls} style={style}>
        {body}
      </a>
    )
  } else {
    card = (
      <div className={cls} style={style}>
        {body}
      </div>
    )
  }

  return (
    <motion.div data-src={turnId + '-' + source.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      {card}
    </motion.div>
  )
}