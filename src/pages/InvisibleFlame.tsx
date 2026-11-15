import { useEffect, useRef, useState } from 'react'

type Gravity = 'micro' | 'earth'

const W = 900
const H = 540
const LOOP_SECONDS = 16

const STOPS: [number, number[]][] = [
  [300, [20, 30, 90]],
  [550, [70, 40, 150]],
  [700, [150, 50, 190]],
  [1000, [215, 50, 110]],
  [1300, [255, 130, 40]],
  [1800, [255, 245, 190]],
]

const TEXT = {
  en: {
    title: 'The invisible flame',
    lede: 'In microgravity, some flames burn at low temperature and are almost invisible. Switch the gravity, then reveal the hidden burning zones.',
    micro: 'Microgravity',
    earth: 'Earth gravity',
    reveal: 'Reveal hidden zones',
    hide: 'Hide hidden zones',
    play: 'Play',
    pause: 'Pause',
    replay: 'Replay',
    hottest: 'Hottest point',
    seen: 'Seen by eye or camera',
    eye: ['Bright', 'Fading', 'Barely a trace', 'Nothing'],
    ambient: 'Ambient',
    marks: ['Hot flame', 'Flame-out', 'Cool flame'],
    badgeNormal: 'What an eye or camera sees',
    badgeFalse: 'False color: a temperature map, not what you would see',
    hotLabel: 'hot flame, about 1,700 K',
    coolLabel: 'cool-flame shell, about 650 K',
    g0: 'about 0 g',
    g1: '1 g',
    story: {
      '0micro': 'The droplet burns with a hot blue sphere. With no buoyancy, hot gas doesn’t rise, so the flame wraps evenly around the fuel.',
      '0earth': 'On Earth, hot gas rises and drags the flame into a yellow teardrop.',
      '1micro': 'The hot flame goes out as the droplet shrinks.',
      '1earth': 'The hot flame goes out as the droplet shrinks.',
      '2micro': 'The hot flame is gone, but low-temperature chemistry keeps a shell burning near 650 K. It is far too faint to see. Press “Reveal hidden zones”.',
      '2earth': 'Rising gas carries heat away, and in ground tests the burn usually just ends here. Switch to microgravity to see what stays behind.',
    },
    note: 'This is an illustration, not footage or a combustion simulation. Sizes and temperatures are approximate, and the false colors mark where the heat is, not what you would see.',
  },
  ar: {
    title: 'نمط اللهب غير المرئي',
    lede: 'في الجاذبية الصغرى، تحترق بعض ألسنة اللهب عند درجات حرارة منخفضة وتكاد تكون غير مرئية. بدّل الجاذبية ثم اكشف مناطق الاحتراق الخفية.',
    micro: 'جاذبية صغرى',
    earth: 'جاذبية الأرض',
    reveal: 'اكشف المناطق الخفية',
    hide: 'أخفِ المناطق الخفية',
    play: 'تشغيل',
    pause: 'إيقاف مؤقت',
    replay: 'إعادة',
    hottest: 'أعلى درجة حرارة',
    seen: 'ما تراه العين أو الكاميرا',
    eye: ['ساطع', 'يخبو', 'أثر خافت', 'لا شيء'],
    ambient: 'حرارة الوسط',
    marks: ['لهب ساخن', 'انطفاء اللهب', 'لهب بارد'],
    badgeNormal: 'ما تراه العين أو الكاميرا',
    badgeFalse: 'ألوان زائفة: خريطة حرارة وليست ما تراه العين',
    hotLabel: 'لهب ساخن ≈ 1,700 K',
    coolLabel: 'غلاف اللهب البارد ≈ 650 K',
    g0: 'قرابة 0 g',
    g1: '1 g',
    story: {
      '0micro': 'تحترق القطرة بلهب أزرق كروي ساخن. ولأنه لا طفو في الجاذبية الصغرى، لا يصعد الغاز الساخن، فيلتف اللهب بالتساوي حول الوقود.',
      '0earth': 'على الأرض يصعد الغاز الساخن ويسحب اللهب إلى شكل قطرة صفراء.',
      '1micro': 'ينطفئ اللهب الساخن بينما تتقلص القطرة.',
      '1earth': 'ينطفئ اللهب الساخن بينما تتقلص القطرة.',
      '2micro': 'اختفى اللهب الساخن، لكن كيمياء الحرارة المنخفضة تُبقي غلافًا يحترق قرابة 650 K. إنه خافت جدًا فلا يُرى. اضغط «اكشف المناطق الخفية».',
      '2earth': 'يحمل الغاز الصاعد الحرارة بعيدًا، وفي التجارب الأرضية ينتهي الاحتراق عادةً هنا. بدّل إلى الجاذبية الصغرى لترى ما يبقى.',
    },
    note: 'هذا رسم توضيحي وليس تسجيلًا حقيقيًا ولا محاكاة احتراق دقيقة. الأحجام ودرجات الحرارة تقريبية، والألوان الزائفة تبيّن موضع الحرارة وليس ما تراه العين.',
  },
}
type Strings = typeof TEXT.en

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x))
const smooth = (x: number) => {
  const v = clamp(x, 0, 1)
  return v * v * (3 - 2 * v)
}

function tempColor(T: number): number[] {
  for (let i = 1; i < STOPS.length; i++) {
    if (T <= STOPS[i][0] || i === STOPS.length - 1) {
      const [t0, c0] = STOPS[i - 1]
      const [t1, c1] = STOPS[i]
      const f = clamp((T - t0) / (t1 - t0), 0, 1)
      return c0.map((v, k) => v + (c1[k] - v) * f)
    }
  }
  return STOPS[0][1]
}

// Brightness of the hot flame (h) and the cool flame (c) at timeline position t.
function levels(t: number, gravity: Gravity) {
  const h = t < 0.4 ? 1 : t < 0.5 ? 1 - (t - 0.4) / 0.1 : 0
  const c =
    gravity === 'micro'
      ? t < 0.43 ? 0 : t < 0.56 ? (t - 0.43) / 0.13 : t < 0.9 ? 1 : 1 - ((t - 0.9) / 0.1) * 0.6
      : 0
  return { h: smooth(h), c: smooth(c) }
}

export default function InvisibleFlame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isAr = typeof document !== 'undefined' && document.documentElement.dir === 'rtl'
  const s: Strings = isAr ? TEXT.ar : TEXT.en

  const reduced =
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const [gravity, setGravity] = useState<Gravity>('micro')
  const [reveal, setReveal] = useState(false)
  const [playing, setPlaying] = useState(!reduced)
  const [t, setT] = useState(reduced ? 0.7 : 0)

  // The animation loop reads these refs so it never restarts.
  const gRef = useRef(gravity)
  const rRef = useRef(reveal)
  const pRef = useRef(playing)
  const tRef = useRef(reduced ? 0.7 : 0)
  const sRef = useRef(s)
  gRef.current = gravity
  rRef.current = reveal
  pRef.current = playing
  sRef.current = s

  useEffect(() => {
    const cv = canvasRef.current
    const ctx = cv?.getContext('2d')
    if (!cv || !ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    cv.width = W * dpr
    cv.height = H * dpr
    let cy = 270
    let last = performance.now()
    let raf = 0
    const font = (px: number) => `${px}px Inter, Cairo, system-ui, sans-serif`

    const heat = (x: number, y: number, Rp: number, Tp: number, sp: number, rMax: number) => {
      if (Tp < 340) return
      const gr = ctx.createRadialGradient(x, y, 0, x, y, rMax)
      for (let k = 0; k <= 24; k++) {
        const r = (k / 24) * rMax
        const T = 300 + (Tp - 300) * Math.exp(-(((r - Rp) / sp) ** 2))
        const a = clamp((T - 310) / 70, 0, 1) * 0.92
        const [R, G, B] = tempColor(T)
        gr.addColorStop(k / 24, `rgba(${R | 0},${G | 0},${B | 0},${a})`)
      }
      ctx.fillStyle = gr
      ctx.fillRect(x - rMax, y - rMax, rMax * 2, rMax * 2)
    }

    const label = (x1: number, y1: number, x2: number, y2: number, text: string, alpha: number, rtl: boolean) => {
      ctx.globalAlpha = alpha
      ctx.strokeStyle = 'rgba(255,255,255,.7)'
      ctx.lineWidth = 1
      const dir = rtl ? -1 : 1
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.lineTo(x2 + 14 * dir, y2)
      ctx.stroke()
      ctx.fillStyle = '#fff'
      ctx.font = font(13)
      ctx.textAlign = rtl ? 'right' : 'left'
      ctx.fillText(text, x2 + 20 * dir, y2 + 4)
      ctx.globalAlpha = 1
    }

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      if (pRef.current) {
        tRef.current = Math.min(1, tRef.current + dt / LOOP_SECONDS)
        setT(tRef.current)
        if (tRef.current >= 1) setPlaying(false)
      }

      const tt = tRef.current
      const gravityNow = gRef.current
      const earth = gravityNow === 'earth'
      const str = sRef.current
      const rtl = str === TEXT.ar
      const { h, c } = levels(tt, gravityNow)
      const cx = W / 2
      const time = now / 1000
      cy += ((earth ? 370 : 270) - cy) * 0.12

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      const bg = ctx.createRadialGradient(cx, H / 2, 40, cx, H / 2, 520)
      bg.addColorStop(0, 'rgba(16,24,47,.85)')
      bg.addColorStop(1, 'rgba(6,9,18,.9)')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      // fiber holding the droplet
      ctx.strokeStyle = 'rgba(200,212,235,.35)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(cx, cy - 240)
      ctx.lineTo(cx, cy + 170)
      ctx.stroke()

      const r = 15 * (1 - 0.75 * clamp(tt / 0.95, 0, 1))

      // normal view
      ctx.globalCompositeOperation = 'lighter'
      if (h > 0.01) {
        if (!earth) {
          const R = 62 * (0.6 + 0.4 * h)
          const rg = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, R * 1.35)
          rg.addColorStop(0, 'rgba(76,201,240,0)')
          rg.addColorStop(0.5, `rgba(76,201,240,${0.8 * h})`)
          rg.addColorStop(1, 'rgba(60,110,255,0)')
          ctx.fillStyle = rg
          ctx.fillRect(cx - 100, cy - 100, 200, 200)
        } else {
          const Hh = 190 * Math.sqrt(h)
          const wd = 58 * (0.5 + 0.5 * h)
          const f = Math.sin(time * 9) * 5 + Math.sin(time * 17) * 2.5
          const top = cy - Hh
          const lg = ctx.createLinearGradient(0, top, 0, cy + 18)
          lg.addColorStop(0, 'rgba(255,107,44,0)')
          lg.addColorStop(0.35, `rgba(255,107,44,${0.75 * h})`)
          lg.addColorStop(0.8, `rgba(255,179,71,${0.85 * h})`)
          lg.addColorStop(1, `rgba(76,201,240,${0.6 * h})`)
          ctx.fillStyle = lg
          ctx.shadowColor = 'rgba(255,107,44,.6)'
          ctx.shadowBlur = 30
          ctx.beginPath()
          ctx.moveTo(cx, cy + 18)
          ctx.bezierCurveTo(cx - wd, cy - 10, cx - wd * 0.7, cy - Hh * 0.55, cx + f, top)
          ctx.bezierCurveTo(cx + wd * 0.7, cy - Hh * 0.55, cx + wd, cy - 10, cx, cy + 18)
          ctx.fill()
          ctx.shadowBlur = 0
        }
      }
      if (c > 0.01) {
        // the cool flame: present, but almost nothing to see
        const rc = ctx.createRadialGradient(cx, cy, 95, cx, cy, 150)
        rc.addColorStop(0, 'rgba(150,170,255,0)')
        rc.addColorStop(0.5, `rgba(150,170,255,${0.05 * c})`)
        rc.addColorStop(1, 'rgba(150,170,255,0)')
        ctx.fillStyle = rc
        ctx.fillRect(cx - 160, cy - 160, 320, 320)
      }
      ctx.globalCompositeOperation = 'source-over'

      // false-color temperature map
      if (rRef.current) {
        if (h > 0.01) {
          if (!earth) heat(cx, cy, 62 * (0.6 + 0.4 * h), 300 + 1400 * h, 20, 190)
          else {
            ctx.save()
            ctx.translate(cx, cy - 75)
            ctx.scale(0.62, 1.5)
            heat(0, 0, 60, 300 + 1400 * h, 22, 150)
            ctx.restore()
          }
        }
        if (c > 0.01) heat(cx, cy, 118, 300 + 350 * c, 16, 190)
        const d = rtl ? -1 : 1
        if (!earth && h > 0.5) label(cx + 44 * d, cy - 44, cx + 120 * d, cy - 100, str.hotLabel, h, rtl)
        if (earth && h > 0.5) label(cx + 34 * d, cy - 110, cx + 90 * d, cy - 160, str.hotLabel, h, rtl)
        if (c > 0.4) label(cx + 84 * d, cy + 84, cx + 130 * d, cy + 150, str.coolLabel, c, rtl)

        const lx = rtl ? W - 200 : 20
        const lg2 = ctx.createLinearGradient(lx, 0, lx + 180, 0)
        for (let k = 0; k <= 10; k++) {
          const [R, G, B] = tempColor(300 + (1500 * k) / 10)
          lg2.addColorStop(k / 10, `rgb(${R | 0},${G | 0},${B | 0})`)
        }
        ctx.fillStyle = lg2
        ctx.fillRect(lx, H - 34, 180, 10)
        ctx.fillStyle = 'rgba(255,255,255,.8)'
        ctx.font = font(12)
        ctx.textAlign = 'left'
        ctx.fillText('300 K', lx, H - 10)
        ctx.textAlign = 'right'
        ctx.fillText('1,800 K', lx + 180, H - 10)
      }

      // droplet
      const dg = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 1, cx, cy, r)
      dg.addColorStop(0, 'rgba(255,248,225,.95)')
      dg.addColorStop(1, 'rgba(210,190,130,.9)')
      ctx.fillStyle = dg
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill()

      // badges
      ctx.fillStyle = 'rgba(255,255,255,.75)'
      ctx.font = font(13)
      ctx.textAlign = rtl ? 'right' : 'left'
      ctx.fillText(rRef.current ? str.badgeFalse : str.badgeNormal, rtl ? W - 20 : 20, 30)
      ctx.textAlign = rtl ? 'left' : 'right'
      ctx.fillText(earth ? str.g1 : str.g0, rtl ? 20 : W - 20, 30)

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  const { h, c } = levels(t, gravity)
  const peak = Math.max(300 + 1400 * h, 300 + 350 * c)
  const eyeIdx = h > 0.6 ? 0 : h > 0.02 ? 1 : c > 0.1 ? 2 : 3
  const stage = t < 0.4 ? 0 : t < 0.52 ? 1 : 2
  const story = s.story[`${stage}${gravity}` as keyof Strings['story']]
  const noHeat = h < 0.01 && c < 0.01

  const onPlay = () => {
    if (t >= 1) {
      tRef.current = 0
      setT(0)
      setPlaying(true)
    } else setPlaying(!playing)
  }

  return (
    <section className="mx-auto max-w-5xl px-5 pb-24 pt-28">
      <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">{s.title}</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">{s.lede}</p>

      <div className="glass mt-8 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="block h-auto w-full"
          width={W}
          height={H}
          role="img"
          aria-label={s.title}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          onClick={() => setGravity('micro')}
          aria-pressed={gravity === 'micro'}
          className={`btn-sm ${gravity === 'micro' ? 'btn-primary' : 'btn-ghost'}`}
        >
          {s.micro}
        </button>
        <button
          onClick={() => setGravity('earth')}
          aria-pressed={gravity === 'earth'}
          className={`btn-sm ${gravity === 'earth' ? 'btn-primary' : 'btn-ghost'}`}
        >
          {s.earth}
        </button>
        <button
          onClick={() => setReveal(!reveal)}
          aria-pressed={reveal}
          className={`btn-sm ${reveal ? 'btn-primary' : 'btn-ghost'}`}
        >
          {reveal ? s.hide : s.reveal}
        </button>
        <button onClick={onPlay} className="btn-ghost btn-sm">
          {playing ? s.pause : t >= 1 ? s.replay : s.play}
        </button>
      </div>

      <div className="mt-5">
        <input
          type="range"
          min={0}
          max={1000}
          value={Math.round(t * 1000)}
          onChange={(e) => {
            const v = Number(e.target.value) / 1000
            tRef.current = v
            setT(v)
            setPlaying(false)
          }}
          aria-label={s.marks.join(' / ')}
          className="w-full accent-flame"
        />
        <div className="flex justify-between text-sm text-muted">
          {s.marks.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-x-12 gap-y-4">
        <div>
          <div className="font-mono text-3xl tabular-nums text-ember">
            {noHeat ? s.ambient : `${(Math.round(peak / 10) * 10).toLocaleString('en-US')} K`}
          </div>
          <div className="text-sm text-muted">{s.hottest}</div>
        </div>
        <div>
          <div className="font-mono text-3xl text-blueflame">{s.eye[eyeIdx]}</div>
          <div className="text-sm text-muted">{s.seen}</div>
        </div>
      </div>

      <p className="mt-5 min-h-[3.5em] max-w-2xl" aria-live="polite">
        {story}
      </p>
      <p className="mt-6 max-w-2xl border-t border-white/10 pt-4 text-sm text-muted">{s.note}</p>
    </section>
  )
}
