import { useEffect, useRef, useState } from 'react'

const mono = 'font-mono uppercase tracking-[0.25em]'

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
    controls: 'Controls',
    gravity: 'Gravity',
    timeline: 'Timeline',
    readout: 'Right now',
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
      '0micro': 'The droplet burns with a hot blue sphere. With no buoyancy, hot gas doesn\u2019t rise, so the flame wraps evenly around the fuel.',
      '0earth': 'On Earth, hot gas rises and drags the flame into a yellow teardrop.',
      '1micro': 'The hot flame goes out as the droplet shrinks.',
      '1earth': 'The hot flame goes out as the droplet shrinks.',
      '2micro': 'The hot flame is gone, but low-temperature chemistry keeps a shell burning near 650 K. It is far too faint to see. Press \u201cReveal hidden zones\u201d.',
      '2earth': 'Rising gas carries heat away, and in ground tests the burn usually just ends here. Switch to microgravity to see what stays behind.',
    },
    note: 'This is an illustration, not footage or a combustion simulation. Sizes and temperatures are approximate, and the false colors mark where the heat is, not what you would see.',
  },
  ar: {
    title: '\u0646\u0645\u0637 \u0627\u0644\u0644\u0647\u0628 \u063a\u064a\u0631 \u0627\u0644\u0645\u0631\u0626\u064a',
    controls: '\u0627\u0644\u062a\u062d\u0643\u0645',
    gravity: '\u0627\u0644\u062c\u0627\u0630\u0628\u064a\u0629',
    timeline: '\u0627\u0644\u062c\u062f\u0648\u0644 \u0627\u0644\u0632\u0645\u0646\u064a',
    readout: '\u0627\u0644\u0622\u0646',
    lede: '\u0641\u064a \u0627\u0644\u062c\u0627\u0630\u0628\u064a\u0629 \u0627\u0644\u0635\u063a\u0631\u0649\u060c \u062a\u062d\u062a\u0631\u0642 \u0628\u0639\u0636 \u0623\u0644\u0633\u0646\u0629 \u0627\u0644\u0644\u0647\u0628 \u0639\u0646\u062f \u062f\u0631\u062c\u0627\u062a \u062d\u0631\u0627\u0631\u0629 \u0645\u0646\u062e\u0641\u0636\u0629 \u0648\u062a\u0643\u0627\u062f \u062a\u0643\u0648\u0646 \u063a\u064a\u0631 \u0645\u0631\u0626\u064a\u0629. \u0628\u062f\u0651\u0644 \u0627\u0644\u062c\u0627\u0630\u0628\u064a\u0629 \u062b\u0645 \u0627\u0643\u0634\u0641 \u0645\u0646\u0627\u0637\u0642 \u0627\u0644\u0627\u062d\u062a\u0631\u0627\u0642 \u0627\u0644\u062e\u0641\u064a\u0629.',
    micro: '\u062c\u0627\u0630\u0628\u064a\u0629 \u0635\u063a\u0631\u0649',
    earth: '\u062c\u0627\u0630\u0628\u064a\u0629 \u0627\u0644\u0623\u0631\u0636',
    reveal: '\u0627\u0643\u0634\u0641 \u0627\u0644\u0645\u0646\u0627\u0637\u0642 \u0627\u0644\u062e\u0641\u064a\u0629',
    hide: '\u0623\u062e\u0641\u0650 \u0627\u0644\u0645\u0646\u0627\u0637\u0642 \u0627\u0644\u062e\u0641\u064a\u0629',
    play: '\u062a\u0634\u063a\u064a\u0644',
    pause: '\u0625\u064a\u0642\u0627\u0641 \u0645\u0624\u0642\u062a',
    replay: '\u0625\u0639\u0627\u062f\u0629',
    hottest: '\u0623\u0639\u0644\u0649 \u062f\u0631\u062c\u0629 \u062d\u0631\u0627\u0631\u0629',
    seen: '\u0645\u0627 \u062a\u0631\u0627\u0647 \u0627\u0644\u0639\u064a\u0646 \u0623\u0648 \u0627\u0644\u0643\u0627\u0645\u064a\u0631\u0627',
    eye: ['\u0633\u0627\u0637\u0639', '\u064a\u062e\u0628\u0648', '\u0623\u062b\u0631 \u062e\u0627\u0641\u062a', '\u0644\u0627 \u0634\u064a\u0621'],
    ambient: '\u062d\u0631\u0627\u0631\u0629 \u0627\u0644\u0648\u0633\u0637',
    marks: ['\u0644\u0647\u0628 \u0633\u0627\u062e\u0646', '\u0627\u0646\u0637\u0641\u0627\u0621 \u0627\u0644\u0644\u0647\u0628', '\u0644\u0647\u0628 \u0628\u0627\u0631\u062f'],
    badgeNormal: '\u0645\u0627 \u062a\u0631\u0627\u0647 \u0627\u0644\u0639\u064a\u0646 \u0623\u0648 \u0627\u0644\u0643\u0627\u0645\u064a\u0631\u0627',
    badgeFalse: '\u0623\u0644\u0648\u0627\u0646 \u0632\u0627\u0626\u0641\u0629: \u062e\u0631\u064a\u0637\u0629 \u062d\u0631\u0627\u0631\u0629 \u0648\u0644\u064a\u0633\u062a \u0645\u0627 \u062a\u0631\u0627\u0647 \u0627\u0644\u0639\u064a\u0646',
    hotLabel: '\u0644\u0647\u0628 \u0633\u0627\u062e\u0646 \u2248 1,700 K',
    coolLabel: '\u063a\u0644\u0627\u0641 \u0627\u0644\u0644\u0647\u0628 \u0627\u0644\u0628\u0627\u0631\u062f \u2248 650 K',
    g0: '\u0642\u0631\u0627\u0628\u0629 0 g',
    g1: '1 g',
    story: {
      '0micro': '\u062a\u062d\u062a\u0631\u0642 \u0627\u0644\u0642\u0637\u0631\u0629 \u0628\u0644\u0647\u0628 \u0623\u0632\u0631\u0642 \u0643\u0631\u0648\u064a \u0633\u0627\u062e\u0646. \u0648\u0644\u0623\u0646\u0647 \u0644\u0627 \u0637\u0641\u0648 \u0641\u064a \u0627\u0644\u062c\u0627\u0630\u0628\u064a\u0629 \u0627\u0644\u0635\u063a\u0631\u0649\u060c \u0644\u0627 \u064a\u0635\u0639\u062f \u0627\u0644\u063a\u0627\u0632 \u0627\u0644\u0633\u0627\u062e\u0646\u060c \u0641\u064a\u0644\u062a\u0641 \u0627\u0644\u0644\u0647\u0628 \u0628\u0627\u0644\u062a\u0633\u0627\u0648\u064a \u062d\u0648\u0644 \u0627\u0644\u0648\u0642\u0648\u062f.',
      '0earth': '\u0639\u0644\u0649 \u0627\u0644\u0623\u0631\u0636 \u064a\u0635\u0639\u062f \u0627\u0644\u063a\u0627\u0632 \u0627\u0644\u0633\u0627\u062e\u0646 \u0648\u064a\u0633\u062d\u0628 \u0627\u0644\u0644\u0647\u0628 \u0625\u0644\u0649 \u0634\u0643\u0644 \u0642\u0637\u0631\u0629 \u0635\u0641\u0631\u0627\u0621.',
      '1micro': '\u064a\u0646\u0637\u0641\u0626 \u0627\u0644\u0644\u0647\u0628 \u0627\u0644\u0633\u0627\u062e\u0646 \u0628\u064a\u0646\u0645\u0627 \u062a\u062a\u0642\u0644\u0635 \u0627\u0644\u0642\u0637\u0631\u0629.',
      '1earth': '\u064a\u0646\u0637\u0641\u0626 \u0627\u0644\u0644\u0647\u0628 \u0627\u0644\u0633\u0627\u062e\u0646 \u0628\u064a\u0646\u0645\u0627 \u062a\u062a\u0642\u0644\u0635 \u0627\u0644\u0642\u0637\u0631\u0629.',
      '2micro': '\u0627\u062e\u062a\u0641\u0649 \u0627\u0644\u0644\u0647\u0628 \u0627\u0644\u0633\u0627\u062e\u0646\u060c \u0644\u0643\u0646 \u0643\u064a\u0645\u064a\u0627\u0621 \u0627\u0644\u062d\u0631\u0627\u0631\u0629 \u0627\u0644\u0645\u0646\u062e\u0641\u0636\u0629 \u062a\u064f\u0628\u0642\u064a \u063a\u0644\u0627\u0641\u064b\u0627 \u064a\u062d\u062a\u0631\u0642 \u0642\u0631\u0627\u0628\u0629 650 K. \u0625\u0646\u0647 \u062e\u0627\u0641\u062a \u062c\u062f\u064b\u0627 \u0641\u0644\u0627 \u064a\u064f\u0631\u0649. \u0627\u0636\u063a\u0637 \u00ab\u0627\u0643\u0634\u0641 \u0627\u0644\u0645\u0646\u0627\u0637\u0642 \u0627\u0644\u062e\u0641\u064a\u0629\u00bb.',
      '2earth': '\u064a\u062d\u0645\u0644 \u0627\u0644\u063a\u0627\u0632 \u0627\u0644\u0635\u0627\u0639\u062f \u0627\u0644\u062d\u0631\u0627\u0631\u0629 \u0628\u0639\u064a\u062f\u064b\u0627\u060c \u0648\u0641\u064a \u0627\u0644\u062a\u062c\u0627\u0631\u0628 \u0627\u0644\u0623\u0631\u0636\u064a\u0629 \u064a\u0646\u062a\u0647\u064a \u0627\u0644\u0627\u062d\u062a\u0631\u0627\u0642 \u0639\u0627\u062f\u0629\u064b \u0647\u0646\u0627. \u0628\u062f\u0651\u0644 \u0625\u0644\u0649 \u0627\u0644\u062c\u0627\u0630\u0628\u064a\u0629 \u0627\u0644\u0635\u063a\u0631\u0649 \u0644\u062a\u0631\u0649 \u0645\u0627 \u064a\u0628\u0642\u0649.',
    },
    note: '\u0647\u0630\u0627 \u0631\u0633\u0645 \u062a\u0648\u0636\u064a\u062d\u064a \u0648\u0644\u064a\u0633 \u062a\u0633\u062c\u064a\u0644\u064b\u0627 \u062d\u0642\u064a\u0642\u064a\u064b\u0627 \u0648\u0644\u0627 \u0645\u062d\u0627\u0643\u0627\u0629 \u0627\u062d\u062a\u0631\u0627\u0642 \u062f\u0642\u064a\u0642\u0629. \u0627\u0644\u0623\u062d\u062c\u0627\u0645 \u0648\u062f\u0631\u062c\u0627\u062a \u0627\u0644\u062d\u0631\u0627\u0631\u0629 \u062a\u0642\u0631\u064a\u0628\u064a\u0629\u060c \u0648\u0627\u0644\u0623\u0644\u0648\u0627\u0646 \u0627\u0644\u0632\u0627\u0626\u0641\u0629 \u062a\u0628\u064a\u0651\u0646 \u0645\u0648\u0636\u0639 \u0627\u0644\u062d\u0631\u0627\u0631\u0629 \u0648\u0644\u064a\u0633 \u0645\u0627 \u062a\u0631\u0627\u0647 \u0627\u0644\u0639\u064a\u0646.',
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


// Hot/cool flame illustration for the lab page. Frontend only: no backend needed.
export default function InvisibleFlamePanel() {
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
      bg.addColorStop(0, 'rgba(14,16,24,.9)')
      bg.addColorStop(1, 'rgba(0,0,0,.95)')
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
  const earth = gravity === 'earth'

  const onPlay = () => {
    if (t >= 1) {
      tRef.current = 0
      setT(0)
      setPlaying(true)
    } else setPlaying(!playing)
  }

  const switchCls = (on: boolean) =>
    `relative h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors ${
      on ? 'border-flame bg-flame/30' : 'border-white/20 bg-white/10'
    }`
  const knobCls = (on: boolean) =>
    `absolute top-[3px] left-[3px] h-4 w-4 rounded-full transition-transform ${
      on ? 'translate-x-[20px] bg-flame' : 'bg-ink'
    }`

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[22rem_1fr]">
      <div className="glass space-y-6 p-5 lg:sticky lg:top-28">
        <h2 className={`${mono} text-[11px] text-flame`}>{s.controls}</h2>

        <div>
          <p className={`${mono} mb-3 text-[10px] text-muted`}>{s.gravity}</p>
          <div className="flex items-center gap-3 text-sm">
            <button
              type="button"
              onClick={() => setGravity('micro')}
              className={`cursor-pointer ${!earth ? 'font-semibold text-ink' : 'text-muted hover:text-ink'}`}
            >
              {s.micro}
            </button>
            <button
              type="button"
              role="switch"
              aria-checked={earth}
              aria-label={s.earth}
              onClick={() => setGravity((g) => (g === 'earth' ? 'micro' : 'earth'))}
              className={switchCls(earth)}
            >
              <span className={knobCls(earth)} />
            </button>
            <button
              type="button"
              onClick={() => setGravity('earth')}
              className={`cursor-pointer ${earth ? 'font-semibold text-ink' : 'text-muted hover:text-ink'}`}
            >
              {s.earth}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-ink">{reveal ? s.hide : s.reveal}</span>
          <button
            type="button"
            role="switch"
            aria-checked={reveal}
            aria-label={s.reveal}
            onClick={() => setReveal(!reveal)}
            className={switchCls(reveal)}
          >
            <span className={knobCls(reveal)} />
          </button>
        </div>

        <button
          type="button"
          onClick={onPlay}
          className={`${mono} w-full cursor-pointer bg-flame px-5 py-3 text-[11px] font-bold text-space shadow-[0_0_28px_rgba(255,107,44,0.3)]`}
        >
          {playing ? s.pause : t >= 1 ? s.replay : s.play}
        </button>

        <div>
          <label htmlFor="invisible-flame-time" className={`${mono} mb-2 block text-[10px] text-muted`}>
            {s.timeline}
          </label>
          <input
            id="invisible-flame-time"
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
            className="w-full cursor-pointer accent-flame"
          />
          <div className="mt-1 flex justify-between text-[10px] text-muted/80">
            {s.marks.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
          <div>
            <div className={`${mono} mb-1 text-[9px] text-muted`}>{s.hottest}</div>
            <div className="font-mono text-lg font-semibold text-flame">
              {noHeat ? s.ambient : `${(Math.round(peak / 10) * 10).toLocaleString('en-US')} K`}
            </div>
          </div>
          <div>
            <div className={`${mono} mb-1 text-[9px] text-muted`}>{s.seen}</div>
            <div className="text-lg font-semibold text-blueflame">{s.eye[eyeIdx]}</div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="glass overflow-hidden">
          <canvas
            ref={canvasRef}
            className="block h-auto w-full"
            width={W}
            height={H}
            role="img"
            aria-label={s.title}
          />
        </div>
        <div className="glass p-5">
          <p className="min-h-[3.5em] text-sm leading-relaxed" aria-live="polite">
            {story}
          </p>
          <p className="mt-4 border-t border-white/10 pt-4 text-[11px] leading-snug text-muted">{s.note}</p>
        </div>
      </div>
    </div>
  )
}