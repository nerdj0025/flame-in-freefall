import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUp, PanelLeft, Plus, RotateCcw, X } from 'lucide-react'
import { askAssistant } from '../lib/api'
import type { AssistantReply, ChatMessage } from '../lib/api'
import SourceCard from '../components/assistant/SourceCard'
import AnswerText from '../components/assistant/AnswerText'

const mono = 'font-mono uppercase tracking-[0.25em]'

const SUGGESTED = [
  'PMMA combustion oxygen',
  'PSI-25 oxygen and carbon monoxide changes',
  'PSI-69 oxygen concentration and burn time',
  'PSI-26 combustion results',
  'PSI-102 weight loss',
]

interface Turn {
  id: number
  question: string
  status: 'loading' | 'done' | 'error'
  reply?: AssistantReply
  typed: boolean // typewriter finished
}

interface Chat {
  id: number
  title: string
  turns: Turn[]
}

function buildHistory(turns: Turn[]): ChatMessage[] {
  return turns.flatMap((t): ChatMessage[] =>
    t.status === 'done' && t.reply
      ? [
          { role: 'user', content: t.question },
          { role: 'assistant', content: t.reply.answer },
        ]
      : [],
  )
}

function TypingDots() {
  return (
    <div className="glass inline-flex items-center gap-1.5 px-5 py-4" aria-label="The assistant is typing">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-flame"
          animate={{ y: [0, -6, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  )
}

interface SidebarProps {
  chats: Chat[]
  activeId: number
  pending: boolean
  onNew: () => void
  onPick: (id: number) => void
  onAsk: (q: string) => void
}

function Sidebar({ chats, activeId, pending, onNew, onPick, onAsk }: SidebarProps) {
  const recent = chats.filter((c) => c.turns.length > 0).reverse()
  return (
    <div className="flex h-full flex-col gap-8 overflow-y-auto px-5 py-6">
      <button
        onClick={onNew}
        className={`${mono} flex w-full cursor-pointer items-center justify-center gap-2 border border-flame/60 py-3 text-[10px] text-ink transition-colors hover:bg-flame/10`}
      >
        <Plus size={13} /> New chat
      </button>

      <div>
        <p className={`${mono} mb-3 text-[10px] text-muted`}>Suggested questions</p>
        <ul>
          {SUGGESTED.map((q) => (
            <li key={q}>
              <button
                disabled={pending}
                onClick={() => onAsk(q)}
                className="block w-full cursor-pointer border-l border-white/10 py-2 pl-3 text-left text-sm text-muted transition-colors hover:border-flame hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
              >
                {q}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className={`${mono} mb-3 text-[10px] text-muted`}>Recent chats</p>
        {recent.length === 0 ? (
          <p className="text-sm text-muted/60">Nothing yet.</p>
        ) : (
          <ul>
            {recent.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => onPick(c.id)}
                  className={`block w-full cursor-pointer truncate border-l py-2 pl-3 text-left text-sm transition-colors hover:border-flame hover:text-ink ${
                    c.id === activeId ? 'border-flame text-ink' : 'border-white/10 text-muted'
                  }`}
                >
                  {c.title}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default function Assistant() {
  const idRef = useRef(1)
  const [chats, setChats] = useState<Chat[]>([{ id: 1, title: 'New chat', turns: [] }])
  const [activeId, setActiveId] = useState(1)
  const [selected, setSelected] = useState<number | null>(null)
  const [hl, setHl] = useState<{ turn: number; id: number } | null>(null)
  const [input, setInput] = useState('')
  const [drawer, setDrawer] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const hlTimer = useRef<number | undefined>(undefined)

  const active = chats.find((c) => c.id === activeId) ?? chats[0]
  const turns = active.turns
  const pending = turns.some((t) => t.status === 'loading')
  const selTurn =
    turns.find((t) => t.id === selected && t.reply) ?? [...turns].reverse().find((t) => t.reply)

  useEffect(() => () => window.clearTimeout(hlTimer.current), [])

  const scrollToBottom = useCallback((smooth: boolean) => {
    const el = scrollRef.current
    if (!el) return
    if (smooth) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    else if (el.scrollHeight - el.scrollTop - el.clientHeight < 160) el.scrollTop = el.scrollHeight
  }, [])

  const statusKey = turns.map((t) => t.status).join(',')
  useEffect(() => {
    scrollToBottom(true)
  }, [turns.length, statusKey, activeId, scrollToBottom])

  const patchTurn = (chatId: number, turnId: number, patch: Partial<Turn>) =>
    setChats((cs) =>
      cs.map((c) =>
        c.id === chatId ? { ...c, turns: c.turns.map((t) => (t.id === turnId ? { ...t, ...patch } : t)) } : c,
      ),
    )

  const run = async (chatId: number, turnId: number, question: string, history: ChatMessage[]) => {
    try {
      const reply = await askAssistant(question, history)
      patchTurn(chatId, turnId, { status: 'done', reply })
      setSelected(turnId)
    } catch {
      patchTurn(chatId, turnId, { status: 'error' })
    }
  }

  const send = (text: string) => {
    const q = text.trim()
    if (!q || pending) return
    const turnId = ++idRef.current
    const history = buildHistory(turns)
    setChats((cs) =>
      cs.map((c) =>
        c.id === activeId
          ? {
              ...c,
              title: c.turns.length === 0 ? q : c.title,
              turns: [...c.turns, { id: turnId, question: q, status: 'loading', typed: false }],
            }
          : c,
      ),
    )
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    setDrawer(false)
    run(activeId, turnId, q, history)
  }

  const retry = (turn: Turn) => {
    const idx = turns.findIndex((t) => t.id === turn.id)
    patchTurn(activeId, turn.id, { status: 'loading' })
    run(activeId, turn.id, turn.question, buildHistory(turns.slice(0, idx)))
  }

  const newChat = () => {
    setDrawer(false)
    if (turns.length === 0) return
    const id = ++idRef.current
    setChats((cs) => [...cs, { id, title: 'New chat', turns: [] }])
    setActiveId(id)
    setSelected(null)
  }

  const pickChat = (id: number) => {
    setActiveId(id)
    setSelected(null)
    setDrawer(false)
  }

  const onMarker = (turnId: number, id: number) => {
    setSelected(turnId)
    setHl({ turn: turnId, id })
    window.clearTimeout(hlTimer.current)
    hlTimer.current = window.setTimeout(() => setHl(null), 2500)
    requestAnimationFrame(() => {
      const els = document.querySelectorAll<HTMLElement>('[data-src="' + turnId + '-' + id + '"]')
      const visible = Array.from(els).find((e) => e.offsetParent !== null)
      visible?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      send(input)
    }
  }

  const sidebar = (
    <Sidebar chats={chats} activeId={activeId} pending={pending} onNew={newChat} onPick={pickChat} onAsk={send} />
  )

  return (
    <section className="flex h-dvh overflow-hidden pt-20">
      {/* LEFT: suggested questions + recent chats */}
      <aside className="hidden w-64 shrink-0 border-r border-white/10 lg:block">{sidebar}</aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawer && (
          <>
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-30 bg-black/60 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawer(false)}
            />
            <motion.aside
              key="drawer"
              className="fixed top-20 bottom-0 left-0 z-40 w-72 border-r border-white/10 bg-space lg:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            >
              <button
                onClick={() => setDrawer(false)}
                aria-label="Close menu"
                className="absolute top-3 right-3 cursor-pointer text-muted hover:text-flame"
              >
                <X size={18} />
              </button>
              {sidebar}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* CENTER: chat */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-white/10 px-5 py-2 lg:hidden">
          <button
            onClick={() => setDrawer(true)}
            className={`${mono} flex cursor-pointer items-center gap-2 py-1 text-[10px] text-muted hover:text-flame`}
          >
            <PanelLeft size={15} /> Questions and chats
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[720px] space-y-10 px-5 py-8">
            {turns.length === 0 && (
              <motion.div
                className="py-10 text-center"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p className={`${mono} mb-3 text-[10px] text-flame`}>AI assistant</p>
                <h1 className="text-2xl font-bold sm:text-3xl">
                  Ask about <span className="text-flame">fire in space</span>
                </h1>
                <p className="mx-auto mt-3 max-w-md text-sm text-muted">
                  Answers come with the NASA experiments and sources they are based on.
                </p>
                <div className="mt-8 flex flex-col gap-2 lg:hidden">
                  {SUGGESTED.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="glass glass-hover cursor-pointer px-4 py-3 text-left text-sm text-muted hover:text-ink"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {turns.map((t) => (
              <div key={t.id} className="space-y-4">
                <motion.div
                  className="flex justify-end"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-flame px-4 py-3 text-sm font-medium whitespace-pre-wrap text-space">
                    {t.question}
                  </div>
                </motion.div>

                <motion.div
                  className="flex justify-start"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {t.status === 'loading' && <TypingDots />}

                  {t.status === 'error' && (
                    <div className="glass w-full p-5" role="alert">
                      <p className="text-sm text-ink">
                        Sorry, I could not get an answer just now. Please check the connection and try again.
                      </p>
                      <button
                        onClick={() => retry(t)}
                        className={`${mono} mt-4 flex cursor-pointer items-center gap-2 border border-flame/60 px-4 py-2.5 text-[10px] text-ink hover:bg-flame/10`}
                      >
                        <RotateCcw size={13} /> Retry
                      </button>
                    </div>
                  )}

                  {t.status === 'done' && t.reply && (
                    <div
                      className="glass w-full p-5"
                      style={selTurn?.id === t.id ? { borderColor: 'rgba(255,107,44,0.35)' } : undefined}
                      onClick={() => setSelected(t.id)}
                    >
                      <AnswerText
                        text={t.reply.answer}
                        animate={!t.typed}
                        onDone={() => patchTurn(activeId, t.id, { typed: true })}
                        onGrow={() => scrollToBottom(false)}
                        onMarker={(id) => onMarker(t.id, id)}
                      />

                      {t.typed && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          {/* sources inline when the right column is hidden */}
                          {t.reply.sources.length > 0 && (
                            <div className="mt-5 xl:hidden">
                              <p className={`${mono} mb-3 text-[10px] text-muted`}>Sources</p>
                              <div className="grid gap-3">
                                {t.reply.sources.map((s) => (
                                  <SourceCard
                                    key={s.id}
                                    source={s}
                                    turnId={t.id}
                                    highlighted={hl?.turn === t.id && hl.id === s.id}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {t.reply.followUps && t.reply.followUps.length > 0 && (
                            <div className="mt-5 flex flex-wrap gap-2">
                              {t.reply.followUps.slice(0, 3).map((q) => (
                                <button
                                  key={q}
                                  disabled={pending}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    send(q)
                                  }}
                                  className="cursor-pointer rounded-full border border-white/15 px-3 py-1.5 text-xs text-muted transition-colors hover:border-flame hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {q}
                                </button>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </div>
                  )}
                </motion.div>
              </div>
            ))}
          </div>
        </div>

        {/* Input bar */}
        <div className="border-t border-white/10 bg-black/70 px-5 py-4">
          <div className="mx-auto flex w-full max-w-[720px] items-end gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-2 transition-colors focus-within:border-flame">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                e.currentTarget.style.height = 'auto'
                e.currentTarget.style.height = Math.min(e.currentTarget.scrollHeight, 160) + 'px'
              }}
              onKeyDown={onKeyDown}
              placeholder="Ask about a flame experiment..."
              aria-label="Your question"
              className="max-h-40 min-h-[2.5rem] flex-1 resize-none bg-transparent px-3 py-2 text-sm text-ink outline-none placeholder:text-muted/60"
            />
            <motion.button
              type="button"
              onClick={() => send(input)}
              disabled={pending || !input.trim()}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.92 }}
              aria-label="Send"
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-flame text-space disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowUp size={18} />
            </motion.button>
          </div>
          <p className="mx-auto mt-2 max-w-[720px] text-center text-[11px] text-muted/60">
            Enter to send, Shift+Enter for a new line.
          </p>
        </div>
      </div>

      {/* RIGHT: sources of the selected answer */}
      <aside className="hidden w-72 shrink-0 overflow-y-auto border-l border-white/10 xl:block">
        <div className="px-5 py-6">
          <p className={`${mono} mb-1 text-[10px] text-muted`}>Sources</p>
          {selTurn?.reply ? (
            <>
              <p className="mb-4 line-clamp-2 text-xs text-muted/70">For: {selTurn.question}</p>
              <div className="space-y-3">
                {selTurn.reply.sources.map((s) => (
                  <SourceCard
                    key={selTurn.id + '-' + s.id}
                    source={s}
                    turnId={selTurn.id}
                    highlighted={hl?.turn === selTurn.id && hl.id === s.id}
                  />
                ))}
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted/60">Sources for the selected answer appear here.</p>
          )}
        </div>
      </aside>
    </section>
  )
}