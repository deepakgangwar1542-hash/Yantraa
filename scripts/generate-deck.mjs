/**
 * Generates the YANTRAA hackathon pitch deck as a .pptx file.
 *
 * Design language mirrors the app: a powered PCB on a dark lab bench.
 *   - Substrate: near-black, faintly warm (#0b0d0f / panels)
 *   - Brand: signal red (#ff2d2d) = "current is flowing"
 *   - Copper idle material + monospace instrument readouts
 *
 * Run: node scripts/generate-deck.mjs
 * Output: public/yantraa-hackathon-deck.pptx
 */
import pptxgen from 'pptxgenjs'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(__dirname, '..', 'public')
mkdirSync(OUT_DIR, { recursive: true })

/* ---- Palette (PCB material vocabulary) --------------------------------- */
const C = {
  base: '0B0D0F',
  panel: '121417',
  panel2: '191B1F',
  red: 'FF2D2D',
  hot: 'FF5C4D',
  cool: '7A1210',
  copper: 'C08457',
  copperDim: '8A6A4E',
  green: '2ECC71',
  amber: 'F5A623',
  white: 'F4F6F8',
  gray: 'A9B2BD',
  grayDim: '6B7480',
  stroke: '2A2D33',
}

const FONT = 'Arial'
const MONO = 'Consolas'

const pptx = new pptxgen()
pptx.defineLayout({ name: 'YAN', width: 13.33, height: 7.5 })
pptx.layout = 'YAN'
pptx.author = 'YANTRAA'
pptx.company = 'YANTRAA'
pptx.title = 'YANTRAA — Hackathon Pitch'

const W = 13.33
const H = 7.5
const MX = 0.9 // horizontal margin

/* ---- Shared slide chrome ----------------------------------------------- */
let pageNo = 0
function newSlide({ footer = true } = {}) {
  pageNo += 1
  const s = pptx.addSlide()
  s.background = { color: C.base }

  // faint PCB graticule (thin copper lines) — decorative, low opacity feel
  for (let gx = 1; gx <= 12; gx++) {
    s.addShape('line', {
      x: gx * (W / 13),
      y: 0,
      w: 0,
      h: H,
      line: { color: C.panel2, width: 0.5 },
    })
  }
  // signal-red trace accent along the top
  s.addShape('rect', { x: 0, y: 0, w: W, h: 0.09, fill: { color: C.red } })
  s.addShape('rect', { x: 0, y: 0.09, w: W, h: 0.02, fill: { color: C.cool } })

  if (footer) {
    s.addText('YANTRAA', {
      x: MX,
      y: H - 0.5,
      w: 3,
      h: 0.3,
      fontFace: MONO,
      fontSize: 9,
      color: C.grayDim,
      charSpacing: 2,
      align: 'left',
    })
    s.addText('LEARN ELECTRONICS IN 3D', {
      x: W / 2 - 3,
      y: H - 0.5,
      w: 6,
      h: 0.3,
      fontFace: MONO,
      fontSize: 9,
      color: C.grayDim,
      charSpacing: 2,
      align: 'center',
    })
    s.addText(String(pageNo).padStart(2, '0'), {
      x: W - MX - 1.5,
      y: H - 0.5,
      w: 1.5,
      h: 0.3,
      fontFace: MONO,
      fontSize: 9,
      color: C.red,
      charSpacing: 2,
      align: 'right',
    })
  }
  return s
}

// mono "eyebrow" chip + big heading
function heading(s, kicker, title, opts = {}) {
  const y = opts.y ?? 0.7
  s.addText(kicker, {
    x: MX,
    y,
    w: 8,
    h: 0.32,
    fontFace: MONO,
    fontSize: 12,
    bold: true,
    color: C.red,
    charSpacing: 3,
    align: 'left',
  })
  s.addText(title, {
    x: MX,
    y: y + 0.36,
    w: opts.w ?? W - MX * 2,
    h: opts.h ?? 1.0,
    fontFace: FONT,
    fontSize: opts.size ?? 34,
    bold: true,
    color: C.white,
    align: 'left',
  })
}

// a PCB "chip" card
function card(s, { x, y, w, h, fill = C.panel }) {
  s.addShape('roundRect', {
    x,
    y,
    w,
    h,
    rectRadius: 0.06,
    fill: { color: fill },
    line: { color: C.stroke, width: 1 },
  })
  // copper trace along the card's top edge
  s.addShape('rect', {
    x: x + 0.25,
    y,
    w: w - 0.5,
    h: 0.03,
    fill: { color: C.copperDim },
  })
}

/* ======================================================================== */
/* 1 — TITLE                                                                */
/* ======================================================================== */
{
  const s = newSlide({ footer: false })
  s.addShape('rect', { x: 0, y: 0, w: W, h: 0.09, fill: { color: C.red } })

  // IC-chip brand mark
  const cx = MX
  const cy = 2.35
  s.addShape('roundRect', {
    x: cx,
    y: cy,
    w: 1.0,
    h: 1.0,
    rectRadius: 0.1,
    fill: { color: C.panel },
    line: { color: C.red, width: 1.5 },
  })
  s.addShape('ellipse', {
    x: cx + 0.28,
    y: cy + 0.28,
    w: 0.44,
    h: 0.44,
    fill: { color: C.red },
  })
  // chip pins
  for (let i = 0; i < 3; i++) {
    s.addShape('rect', { x: cx + 0.2 + i * 0.3, y: cy - 0.12, w: 0.1, h: 0.12, fill: { color: C.copper } })
    s.addShape('rect', { x: cx + 0.2 + i * 0.3, y: cy + 1.0, w: 0.1, h: 0.12, fill: { color: C.copper } })
  }

  s.addText('HARDWARE LEARNING PLATFORM', {
    x: MX,
    y: 3.65,
    w: 10,
    h: 0.35,
    fontFace: MONO,
    fontSize: 13,
    color: C.red,
    charSpacing: 4,
  })
  s.addText('YANTRAA', {
    x: MX - 0.05,
    y: 3.95,
    w: 11.5,
    h: 1.5,
    fontFace: FONT,
    fontSize: 96,
    bold: true,
    color: C.white,
    charSpacing: 2,
  })
  s.addText('Learn electronics by building real circuits in an interactive 3D lab.', {
    x: MX,
    y: 5.45,
    w: 10.5,
    h: 0.6,
    fontFace: FONT,
    fontSize: 20,
    color: C.gray,
  })

  s.addText(
    [
      { text: 'HACKATHON PITCH', options: { color: C.white, bold: true } },
      { text: '   //   ', options: { color: C.grayDim } },
      { text: 'Team YANTRAA', options: { color: C.gray } },
    ],
    { x: MX, y: 6.6, w: 11, h: 0.4, fontFace: MONO, fontSize: 12, charSpacing: 1 },
  )
}

/* ======================================================================== */
/* 2 — PROBLEM                                                              */
/* ======================================================================== */
{
  const s = newSlide()
  heading(s, 'THE PROBLEM', 'Electronics is taught on paper.')

  const points = [
    ['Abstract & intimidating', 'Circuit theory lives in 2D diagrams and equations. Beginners can\u2019t see what a circuit actually does.'],
    ['Hardware has a high floor', 'Real breadboards need parts, money, and space \u2014 and a wrong wire can fry a component or a student\u2019s confidence.'],
    ['No safe place to fail', 'Students fear mistakes because they\u2019re slow, costly, and invisible until something breaks.'],
    ['Feedback is delayed', 'You find out a circuit is wrong hours later \u2014 not the instant you connect it.'],
  ]
  const cardW = (W - MX * 2 - 0.5) / 2
  const cardH = 1.9
  points.forEach((p, i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = MX + col * (cardW + 0.5)
    const y = 2.5 + row * (cardH + 0.4)
    card(s, { x, y, w: cardW, h: cardH })
    s.addText(String(i + 1).padStart(2, '0'), {
      x: x + 0.3,
      y: y + 0.25,
      w: 1,
      h: 0.4,
      fontFace: MONO,
      fontSize: 16,
      bold: true,
      color: C.red,
    })
    s.addText(p[0], {
      x: x + 0.3,
      y: y + 0.62,
      w: cardW - 0.6,
      h: 0.4,
      fontFace: FONT,
      fontSize: 18,
      bold: true,
      color: C.white,
    })
    s.addText(p[1], {
      x: x + 0.3,
      y: y + 1.05,
      w: cardW - 0.6,
      h: 0.7,
      fontFace: FONT,
      fontSize: 12.5,
      color: C.gray,
    })
  })
}

/* ======================================================================== */
/* 3 — SOLUTION                                                             */
/* ======================================================================== */
{
  const s = newSlide()
  heading(s, 'THE SOLUTION', 'A virtual electronics lab that feels real.')
  s.addText(
    'YANTRAA is a browser-based platform where students drag real components onto a spatial breadboard, wire them in 3D, and press Run \u2014 watching current flow, LEDs glow, and buzzers pulse in real time. No parts to buy, nothing to break, instant feedback.',
    { x: MX, y: 2.25, w: W - MX * 2, h: 1.0, fontFace: FONT, fontSize: 17, color: C.gray, lineSpacingMultiple: 1.15 },
  )

  const pillars = [
    ['SEE IT', 'Current, polarity, and faults are visible \u2014 glow means current is flowing.'],
    ['BUILD IT', 'Snap real wires between pins on a 3D breadboard, just like the bench.'],
    ['UNDERSTAND IT', 'A live circuit engine + AI tutor explain why it works, the moment it does.'],
  ]
  const cw = (W - MX * 2 - 0.8) / 3
  pillars.forEach((p, i) => {
    const x = MX + i * (cw + 0.4)
    const y = 3.6
    card(s, { x, y, w: cw, h: 2.4 })
    s.addText(p[0], {
      x: x + 0.3,
      y: y + 0.35,
      w: cw - 0.6,
      h: 0.4,
      fontFace: MONO,
      fontSize: 15,
      bold: true,
      color: C.red,
      charSpacing: 2,
    })
    s.addShape('rect', { x: x + 0.3, y: y + 0.85, w: 0.5, h: 0.03, fill: { color: C.copperDim } })
    s.addText(p[1], {
      x: x + 0.3,
      y: y + 1.05,
      w: cw - 0.6,
      h: 1.1,
      fontFace: FONT,
      fontSize: 14,
      color: C.gray,
      lineSpacingMultiple: 1.1,
    })
  })
}

/* ======================================================================== */
/* 4 — PRODUCT: THE 3D LAB (hero)                                           */
/* ======================================================================== */
{
  const s = newSlide()
  heading(s, 'PRODUCT / 01', 'The 3D Spatial Lab')
  s.addText('The hero of YANTRAA.', {
    x: MX,
    y: 1.95,
    w: 10,
    h: 0.4,
    fontFace: FONT,
    fontSize: 16,
    italic: true,
    color: C.hot,
  })

  const leftW = 6.7
  s.addText(
    [
      { text: 'Drag & drop components', options: { bold: true, color: C.white } },
      { text: '  onto a spatial breadboard.\n', options: { color: C.gray } },
      { text: 'Wire them in three dimensions', options: { bold: true, color: C.white } },
      { text: '  with real, snapping jumper wires.\n', options: { color: C.gray } },
      { text: 'Press Run', options: { bold: true, color: C.white } },
      { text: '  and a live circuit engine simulates the result \u2014 LEDs light, buzzers sound, traces glow where current flows.\n', options: { color: C.gray } },
      { text: 'Instant fault detection', options: { bold: true, color: C.white } },
      { text: '  flags shorts, reversed polarity, and missing resistors as you build.', options: { color: C.gray } },
    ],
    { x: MX, y: 2.65, w: leftW, h: 3.2, fontFace: FONT, fontSize: 15.5, color: C.gray, lineSpacingMultiple: 1.35, bullet: { code: '2013', indent: 18 } },
  )

  // right: mock breadboard panel
  const px = MX + leftW + 0.5
  const pw = W - px - MX
  card(s, { x: px, y: 2.5, w: pw, h: 3.7, fill: C.panel2 })
  s.addText('LIVE  \u25CF', {
    x: px + 0.25,
    y: 2.7,
    w: 2,
    h: 0.3,
    fontFace: MONO,
    fontSize: 11,
    bold: true,
    color: C.green,
    charSpacing: 2,
  })
  // battery -> resistor -> LED loop
  const midY = 4.4
  const nodes = [
    ['BAT', C.copper],
    ['R', C.copper],
    ['LED', C.red],
  ]
  const nx0 = px + 0.7
  const gap = (pw - 1.4) / 2
  nodes.forEach((n, i) => {
    const nx = nx0 + i * gap
    if (i > 0) {
      s.addShape('rect', { x: nx - gap + 0.45, y: midY + 0.22, w: gap - 0.9, h: 0.05, fill: { color: C.red } })
    }
    s.addShape('roundRect', {
      x: nx,
      y: midY,
      w: 0.9,
      h: 0.5,
      rectRadius: 0.05,
      fill: { color: C.panel },
      line: { color: n[1], width: 1.5 },
    })
    s.addText(n[0], { x: nx, y: midY, w: 0.9, h: 0.5, fontFace: MONO, fontSize: 11, bold: true, color: n[1], align: 'center', valign: 'middle' })
  })
  s.addText('current flowing \u2192 LED lit', {
    x: px + 0.25,
    y: 5.5,
    w: pw - 0.5,
    h: 0.3,
    fontFace: MONO,
    fontSize: 10,
    color: C.grayDim,
    align: 'center',
    charSpacing: 1,
  })
}

/* ======================================================================== */
/* 5 — PRODUCT: AI TUTOR + interaction                                      */
/* ======================================================================== */
{
  const s = newSlide()
  heading(s, 'PRODUCT / 02', 'Circuit \u2014 your AI hardware tutor')

  const cardW = (W - MX * 2 - 0.5) / 2
  // left card: AI tutor
  card(s, { x: MX, y: 2.5, w: cardW, h: 3.6 })
  s.addText('THE AI TUTOR', { x: MX + 0.3, y: 2.75, w: cardW - 0.6, h: 0.35, fontFace: MONO, fontSize: 13, bold: true, color: C.red, charSpacing: 2 })
  s.addText(
    'Circuit is an always-on tutor that explains any concept \u2014 from Ohm\u2019s law to 555 timing chips \u2014 grounded in what you\u2019re actually building. Patient, precise, and context-aware.',
    { x: MX + 0.3, y: 3.2, w: cardW - 0.6, h: 1.2, fontFace: FONT, fontSize: 14.5, color: C.gray, lineSpacingMultiple: 1.2 },
  )
  // fake chat bubble
  s.addShape('roundRect', { x: MX + 0.3, y: 4.5, w: cardW - 0.9, h: 0.55, rectRadius: 0.08, fill: { color: C.red } })
  s.addText('Why won\u2019t my LED light up?', { x: MX + 0.45, y: 4.5, w: cardW - 1.1, h: 0.55, fontFace: FONT, fontSize: 12, color: C.white, valign: 'middle' })
  s.addShape('roundRect', { x: MX + 0.6, y: 5.15, w: cardW - 0.9, h: 0.7, rectRadius: 0.08, fill: { color: C.panel2 }, line: { color: C.stroke, width: 1 } })
  s.addText('Check the polarity \u2014 the long leg is +. It looks reversed.', { x: MX + 0.75, y: 5.15, w: cardW - 1.1, h: 0.7, fontFace: FONT, fontSize: 12, color: C.gray, valign: 'middle' })

  // right card: interaction modes
  const rx = MX + cardW + 0.5
  card(s, { x: rx, y: 2.5, w: cardW, h: 3.6 })
  s.addText('NEXT-LEVEL INTERACTION', { x: rx + 0.3, y: 2.75, w: cardW - 0.6, h: 0.35, fontFace: MONO, fontSize: 13, bold: true, color: C.red, charSpacing: 2 })
  const feats = [
    ['Hand-tracking control', 'Pinch, grab, and zoom the 3D lab with your webcam \u2014 no mouse required.'],
    ['Living-schematic UI', 'The whole app is a powered PCB: glow always means current is flowing.'],
    ['Runs in the browser', 'WebGL 3D + real-time simulation, zero installs, works on a laptop.'],
  ]
  feats.forEach((f, i) => {
    const y = 3.25 + i * 0.92
    s.addShape('ellipse', { x: rx + 0.3, y: y + 0.05, w: 0.16, h: 0.16, fill: { color: C.green } })
    s.addText(f[0], { x: rx + 0.62, y, w: cardW - 0.9, h: 0.3, fontFace: FONT, fontSize: 15, bold: true, color: C.white })
    s.addText(f[1], { x: rx + 0.62, y: y + 0.32, w: cardW - 0.9, h: 0.55, fontFace: FONT, fontSize: 12.5, color: C.gray, lineSpacingMultiple: 1.1 })
  })
}

/* ======================================================================== */
/* 6 — PRODUCT: LIBRARY + BUILD PATH                                        */
/* ======================================================================== */
{
  const s = newSlide()
  heading(s, 'PRODUCT / 03 + 04', 'Learn by exploring, master by building')

  const cardW = (W - MX * 2 - 0.5) / 2
  // library
  card(s, { x: MX, y: 2.5, w: cardW, h: 3.6 })
  s.addText('THE COMPONENT LIBRARY', { x: MX + 0.3, y: 2.75, w: cardW - 0.6, h: 0.35, fontFace: MONO, fontSize: 13, bold: true, color: C.red, charSpacing: 2 })
  s.addText(
    'Explore every part in interactive 3D \u2014 pinouts, polarity, difficulty, and real-world uses \u2014 so a datasheet finally makes intuitive sense.',
    { x: MX + 0.3, y: 3.2, w: cardW - 0.6, h: 1.1, fontFace: FONT, fontSize: 14.5, color: C.gray, lineSpacingMultiple: 1.2 },
  )
  const chips = ['Resistor', 'LED', 'Transistor', 'NE555', 'Arduino', 'ESP32']
  chips.forEach((chip, i) => {
    const col = i % 3
    const row = Math.floor(i / 3)
    const x = MX + 0.3 + col * 1.75
    const y = 4.45 + row * 0.6
    s.addShape('roundRect', { x, y, w: 1.6, h: 0.45, rectRadius: 0.04, fill: { color: C.panel2 }, line: { color: C.strokeRed ?? C.stroke, width: 1 } })
    s.addText(chip, { x, y, w: 1.6, h: 0.45, fontFace: MONO, fontSize: 10, color: C.gray, align: 'center', valign: 'middle', charSpacing: 1 })
  })

  // build path
  const rx = MX + cardW + 0.5
  card(s, { x: rx, y: 2.5, w: cardW, h: 3.6 })
  s.addText('THE BUILD PATH', { x: rx + 0.3, y: 2.75, w: cardW - 0.6, h: 0.35, fontFace: MONO, fontSize: 13, bold: true, color: C.red, charSpacing: 2 })
  s.addText(
    'A guided roadmap of hands-on projects \u2014 from your first glowing LED to sensor-driven logic \u2014 wiring each real circuit step by step until it comes alive.',
    { x: rx + 0.3, y: 3.2, w: cardW - 0.6, h: 1.1, fontFace: FONT, fontSize: 14.5, color: C.gray, lineSpacingMultiple: 1.2 },
  )
  // roadmap nodes
  const steps = ['First Light', 'Switches', 'Sensors', 'Logic']
  steps.forEach((st, i) => {
    const y = 4.5 + i * 0.0
    const x = rx + 0.35 + i * ((cardW - 0.9) / 3)
    if (i > 0) {
      s.addShape('rect', { x: x - ((cardW - 0.9) / 3) + 0.22, y: 4.62, w: (cardW - 0.9) / 3 - 0.44, h: 0.04, fill: { color: i <= 1 ? C.red : C.copperDim } })
    }
    const lit = i === 0
    s.addShape('ellipse', { x, y: 4.45, w: 0.4, h: 0.4, fill: { color: lit ? C.red : C.panel }, line: { color: lit ? C.red : C.copperDim, width: 1.5 } })
    s.addText(String(i + 1), { x, y: 4.45, w: 0.4, h: 0.4, fontFace: MONO, fontSize: 11, bold: true, color: lit ? C.white : C.gray, align: 'center', valign: 'middle' })
    s.addText(st, { x: x - 0.35, y: 4.95, w: 1.1, h: 0.5, fontFace: FONT, fontSize: 9.5, color: C.gray, align: 'center' })
  })
  s.addText('Progress is saved \u2014 unlock harder builds as you go.', {
    x: rx + 0.3,
    y: 5.65,
    w: cardW - 0.6,
    h: 0.3,
    fontFace: MONO,
    fontSize: 9.5,
    color: C.grayDim,
    charSpacing: 1,
  })
}

/* ======================================================================== */
/* 7 — HOW IT WORKS                                                         */
/* ======================================================================== */
{
  const s = newSlide()
  heading(s, 'HOW IT WORKS', 'From empty board to living circuit')

  const steps = [
    ['MEET THE PARTS', 'Browse the 3D library \u2014 spin each component, learn its pins and what it does.'],
    ['WIRE IT IN 3D', 'Drop parts on the spatial breadboard and connect them with real, snapping wires.'],
    ['RUN & LEARN', 'Press Run: YANTRAA analyzes the circuit, flags issues, and brings it to life.'],
  ]
  const cw = (W - MX * 2 - 1.6) / 3
  steps.forEach((st, i) => {
    const x = MX + i * (cw + 0.8)
    const y = 2.9
    // connector arrow
    if (i > 0) {
      s.addText('\u2192', { x: x - 0.7, y: y + 1.2, w: 0.7, h: 0.5, fontFace: FONT, fontSize: 26, bold: true, color: C.red, align: 'center' })
    }
    card(s, { x, y, w: cw, h: 3.0 })
    s.addShape('roundRect', { x: x + 0.3, y: y + 0.3, w: 0.7, h: 0.7, rectRadius: 0.08, fill: { color: C.red } })
    s.addText(String(i + 1), { x: x + 0.3, y: y + 0.3, w: 0.7, h: 0.7, fontFace: FONT, fontSize: 26, bold: true, color: C.white, align: 'center', valign: 'middle' })
    s.addText(st[0], { x: x + 0.3, y: y + 1.2, w: cw - 0.6, h: 0.4, fontFace: MONO, fontSize: 13, bold: true, color: C.white, charSpacing: 1 })
    s.addText(st[1], { x: x + 0.3, y: y + 1.65, w: cw - 0.6, h: 1.2, fontFace: FONT, fontSize: 13, color: C.gray, lineSpacingMultiple: 1.2 })
  })
}

/* ======================================================================== */
/* 8 — TECH / ARCHITECTURE                                                  */
/* ======================================================================== */
{
  const s = newSlide()
  heading(s, 'UNDER THE HOOD', 'Built for the browser, engineered to scale')

  const items = [
    ['3D ENGINE', 'React Three Fiber + WebGL render the spatial lab. A single shared WebGL context keeps it fast and stable.'],
    ['CIRCUIT ENGINE', 'A custom real-time solver detects closed loops, current flow, shorts, and polarity faults on every edit.'],
    ['AI TUTOR', 'Streaming LLM responses via the AI SDK, grounded in the live circuit state for context-aware help.'],
    ['HAND TRACKING', 'Webcam gesture recognition drives pinch / grab / zoom \u2014 a natural, mouse-free interface.'],
    ['NEXT.JS + FLUENT UI', 'App Router front end with a cohesive PCB design system and persisted project progress.'],
    ['ZERO INSTALL', 'Everything runs client-side in the browser \u2014 no hardware, no setup, works on any laptop.'],
  ]
  const cardW = (W - MX * 2 - 0.8) / 3
  const cardH = 1.85
  items.forEach((it, i) => {
    const col = i % 3
    const row = Math.floor(i / 3)
    const x = MX + col * (cardW + 0.4)
    const y = 2.5 + row * (cardH + 0.35)
    card(s, { x, y, w: cardW, h: cardH })
    s.addText(it[0], { x: x + 0.25, y: y + 0.22, w: cardW - 0.5, h: 0.35, fontFace: MONO, fontSize: 12, bold: true, color: C.red, charSpacing: 1.5 })
    s.addText(it[1], { x: x + 0.25, y: y + 0.62, w: cardW - 0.5, h: 1.1, fontFace: FONT, fontSize: 12, color: C.gray, lineSpacingMultiple: 1.12 })
  })
}

/* ======================================================================== */
/* 9 — TECH STACK                                                           */
/* ======================================================================== */
{
  const s = newSlide()
  heading(s, 'TECH STACK', 'The tools that power YANTRAA')

  const groups = [
    ['FRONTEND', C.red, [
      'Next.js (App Router)',
      'React + TypeScript',
      'Fluent UI',
      'Tailwind-style tokens',
    ]],
    ['3D & GRAPHICS', C.copper, [
      'React Three Fiber',
      'Three.js / WebGL',
      '@react-three/drei',
      'Single shared GL context',
    ]],
    ['SIMULATION & AI', C.hot, [
      'Custom circuit engine',
      'Vercel AI SDK',
      'Groq LLM (streaming)',
      'MediaPipe hand tracking',
    ]],
    ['PLATFORM', C.green, [
      'Vercel hosting',
      'Supabase (auth ready)',
      'Client-side persistence',
      'Zero-install PWA-ready',
    ]],
  ]
  const cardW = (W - MX * 2 - 0.9) / 4
  const cardH = 3.5
  groups.forEach((g, i) => {
    const x = MX + i * (cardW + 0.3)
    const y = 2.6
    card(s, { x, y, w: cardW, h: cardH })
    s.addText(g[0], { x: x + 0.25, y: y + 0.28, w: cardW - 0.5, h: 0.35, fontFace: MONO, fontSize: 12, bold: true, color: g[1], charSpacing: 1.5 })
    s.addShape('rect', { x: x + 0.25, y: y + 0.72, w: 0.5, h: 0.03, fill: { color: C.copperDim } })
    g[2].forEach((item, j) => {
      const iy = y + 0.95 + j * 0.6
      s.addShape('ellipse', { x: x + 0.25, y: iy + 0.06, w: 0.13, h: 0.13, fill: { color: g[1] } })
      s.addText(item, { x: x + 0.5, y: iy, w: cardW - 0.7, h: 0.5, fontFace: FONT, fontSize: 12, color: C.white, valign: 'top' })
    })
  })

  s.addText('Everything runs in the browser \u2014 no native app, no hardware drivers, no setup.', {
    x: MX,
    y: 6.35,
    w: W - MX * 2,
    h: 0.35,
    fontFace: MONO,
    fontSize: 11,
    color: C.grayDim,
    charSpacing: 1,
    align: 'center',
  })
}

/* ======================================================================== */
/* 10 — IMPACT / WHO IT'S FOR                                               */
/* ======================================================================== */
{
  const s = newSlide()
  heading(s, 'IMPACT', 'Who it\u2019s for & why it matters')

  // audience column
  s.addText('BUILT FOR', { x: MX, y: 2.5, w: 5, h: 0.35, fontFace: MONO, fontSize: 13, bold: true, color: C.red, charSpacing: 2 })
  const who = [
    '1st & 2nd year engineering students',
    'Self-taught makers & hobbyists',
    'Classrooms without lab budgets',
    'Anyone intimidated by real hardware',
  ]
  who.forEach((w, i) => {
    const y = 3.0 + i * 0.62
    s.addShape('rect', { x: MX, y: y + 0.08, w: 0.18, h: 0.18, fill: { color: C.red } })
    s.addText(w, { x: MX + 0.35, y, w: 5.2, h: 0.4, fontFace: FONT, fontSize: 15, color: C.white })
  })

  // impact stats
  const stats = [
    ['$0', 'hardware cost to start learning'],
    ['0', 'components damaged by mistakes'],
    ['Instant', 'feedback the moment you wire'],
  ]
  const rx = MX + 6.2
  const rw = W - rx - MX
  stats.forEach((st, i) => {
    const y = 2.55 + i * 1.25
    card(s, { x: rx, y, w: rw, h: 1.05 })
    s.addText(st[0], { x: rx + 0.3, y: y + 0.12, w: 2.2, h: 0.8, fontFace: FONT, fontSize: 34, bold: true, color: C.red, valign: 'middle' })
    s.addText(st[1], { x: rx + 2.6, y, w: rw - 2.9, h: 1.05, fontFace: FONT, fontSize: 14, color: C.gray, valign: 'middle' })
  })
}

/* ======================================================================== */
/* 11 — BUSINESS MODEL                                                      */
/* ======================================================================== */
{
  const s = newSlide()
  heading(s, 'BUSINESS MODEL', 'Free to learn, sustainable to grow')

  const tiers = [
    ['FREE', 'Students & makers', [
      'Full 3D lab & core components',
      'AI tutor (fair-use)',
      'Guided Build Path',
    ], false],
    ['PRO', 'Power users', [
      'Advanced parts & unlimited AI',
      'Save & share unlimited circuits',
      'Export to real PCB layouts',
    ], true],
    ['CLASSROOM', 'Schools & bootcamps', [
      'Teacher dashboard & cohorts',
      'Assignments & progress tracking',
      'Seat-based institutional license',
    ], false],
  ]
  const cw = (W - MX * 2 - 0.8) / 3
  tiers.forEach((t, i) => {
    const x = MX + i * (cw + 0.4)
    const y = 2.6
    const featured = t[3]
    card(s, { x, y, w: cw, h: 3.5, fill: featured ? C.panel2 : C.panel })
    if (featured) {
      s.addShape('rect', { x: x + 0.25, y, w: cw - 0.5, h: 0.06, fill: { color: C.red } })
      s.addText('MOST POPULAR', { x: x + 0.3, y: y + 0.18, w: cw - 0.6, h: 0.3, fontFace: MONO, fontSize: 9, bold: true, color: C.red, charSpacing: 2 })
    }
    s.addText(t[0], { x: x + 0.3, y: y + (featured ? 0.5 : 0.32), w: cw - 0.6, h: 0.5, fontFace: FONT, fontSize: 24, bold: true, color: featured ? C.red : C.white })
    s.addText(t[1], { x: x + 0.3, y: y + (featured ? 1.05 : 0.85), w: cw - 0.6, h: 0.35, fontFace: MONO, fontSize: 10, color: C.gray, charSpacing: 1 })
    s.addShape('rect', { x: x + 0.3, y: y + (featured ? 1.5 : 1.3), w: cw - 0.6, h: 0.015, fill: { color: C.stroke } })
    t[2].forEach((f, j) => {
      const fy = y + (featured ? 1.75 : 1.55) + j * 0.52
      s.addText('\u2713', { x: x + 0.3, y: fy, w: 0.3, h: 0.35, fontFace: FONT, fontSize: 13, bold: true, color: C.green })
      s.addText(f, { x: x + 0.6, y: fy, w: cw - 0.85, h: 0.5, fontFace: FONT, fontSize: 11.5, color: C.gray, lineSpacingMultiple: 1.05 })
    })
  })

  s.addText('Land free with students \u2192 expand into paid Pro & Classroom seats. Low marginal cost \u2014 no hardware to ship.', {
    x: MX,
    y: 6.35,
    w: W - MX * 2,
    h: 0.35,
    fontFace: MONO,
    fontSize: 11,
    color: C.grayDim,
    charSpacing: 1,
    align: 'center',
  })
}

/* ======================================================================== */
/* 12 — SCALABILITY & FEASIBILITY                                           */
/* ======================================================================== */
{
  const s = newSlide()
  heading(s, 'SCALABILITY & FEASIBILITY', 'Ready today, built to grow')

  const cardW = (W - MX * 2 - 0.5) / 2

  // left: why it scales
  card(s, { x: MX, y: 2.6, w: cardW, h: 3.6 })
  s.addText('WHY IT SCALES', { x: MX + 0.3, y: 2.85, w: cardW - 0.6, h: 0.35, fontFace: MONO, fontSize: 13, bold: true, color: C.red, charSpacing: 2 })
  const scale = [
    ['Client-side compute', 'The 3D lab and circuit engine run in the user\u2019s browser \u2014 adding users costs us almost nothing.'],
    ['Edge-hosted & serverless', 'Next.js on Vercel scales automatically with demand, from 10 users to 100,000.'],
    ['Content, not code', 'New components and projects are data-driven \u2014 the library grows without re-engineering.'],
  ]
  scale.forEach((it, i) => {
    const y = 3.35 + i * 0.95
    s.addShape('ellipse', { x: MX + 0.3, y: y + 0.05, w: 0.16, h: 0.16, fill: { color: C.green } })
    s.addText(it[0], { x: MX + 0.62, y, w: cardW - 0.9, h: 0.3, fontFace: FONT, fontSize: 15, bold: true, color: C.white })
    s.addText(it[1], { x: MX + 0.62, y: y + 0.32, w: cardW - 0.9, h: 0.6, fontFace: FONT, fontSize: 12, color: C.gray, lineSpacingMultiple: 1.1 })
  })

  // right: feasibility / proof
  const rx = MX + cardW + 0.5
  card(s, { x: rx, y: 2.6, w: cardW, h: 3.6 })
  s.addText('FEASIBILITY \u2014 ALREADY REAL', { x: rx + 0.3, y: 2.85, w: cardW - 0.6, h: 0.35, fontFace: MONO, fontSize: 13, bold: true, color: C.red, charSpacing: 2 })
  const proof = [
    'Working platform \u2014 not a mockup',
    'Live 3D lab, circuit engine & AI tutor ship today',
    'Built on proven, production-grade web tech',
    'No supply chain, inventory, or hardware logistics',
    'Instant global distribution via a URL',
  ]
  proof.forEach((p, i) => {
    const y = 3.4 + i * 0.55
    s.addText('\u2713', { x: rx + 0.3, y, w: 0.3, h: 0.35, fontFace: FONT, fontSize: 14, bold: true, color: C.green })
    s.addText(p, { x: rx + 0.62, y, w: cardW - 0.9, h: 0.45, fontFace: FONT, fontSize: 13.5, color: C.white, valign: 'top' })
  })
}

/* ======================================================================== */
/* 13 — ROADMAP + ASK / THANK YOU                                          */
/* ======================================================================== */
{
  const s = newSlide()
  heading(s, 'WHAT\u2019S NEXT', 'Roadmap & the ask')

  s.addText('ROADMAP', { x: MX, y: 2.45, w: 6, h: 0.35, fontFace: MONO, fontSize: 13, bold: true, color: C.red, charSpacing: 2 })
  const road = [
    'More components: op-amps, logic gates, motors',
    'Multiplayer labs & classroom mode for teachers',
    'Shareable circuits and a community project gallery',
    'Export designs to real PCB layouts',
  ]
  road.forEach((r, i) => {
    const y = 2.95 + i * 0.62
    s.addText('\u25B8', { x: MX, y, w: 0.3, h: 0.35, fontFace: FONT, fontSize: 14, color: C.copper })
    s.addText(r, { x: MX + 0.35, y, w: 5.6, h: 0.4, fontFace: FONT, fontSize: 14.5, color: C.white })
  })

  // the ask panel
  const rx = MX + 6.4
  const rw = W - rx - MX
  card(s, { x: rx, y: 2.4, w: rw, h: 3.0, fill: C.panel2 })
  s.addText('THE ASK', { x: rx + 0.35, y: 2.65, w: rw - 0.7, h: 0.35, fontFace: MONO, fontSize: 13, bold: true, color: C.red, charSpacing: 2 })
  s.addText(
    'We built a working platform that makes electronics visible, safe, and fun to learn. We\u2019re looking for feedback, early users, and mentors to take YANTRAA from hackathon to classroom.',
    { x: rx + 0.35, y: 3.1, w: rw - 0.7, h: 1.5, fontFace: FONT, fontSize: 15, color: C.gray, lineSpacingMultiple: 1.25 },
  )
  s.addText('Try it live in the browser \u2014 no install required.', { x: rx + 0.35, y: 4.7, w: rw - 0.7, h: 0.4, fontFace: MONO, fontSize: 11, color: C.hot, charSpacing: 1 })

  s.addText('Thank you.', { x: MX, y: 5.9, w: 8, h: 0.6, fontFace: FONT, fontSize: 30, bold: true, color: C.white })
}

/* ---- Save --------------------------------------------------------------- */
const outFile = resolve(OUT_DIR, 'yantraa-hackathon-deck.pptx')
await pptx.writeFile({ fileName: outFile })
console.log('[v0] Deck written to', outFile)
