// Draws an image as a grid of DNA letters (A / C / G / T): the brighter the
// pixel, the brighter the letter. Every so often a few letters "mutate" into
// another base and flash. Transparent parts of the image stay empty, so use a
// photo with the background removed (scripts/cutout-portrait.swift does that).
//
//   const portrait = dnaPortrait(canvas, { src: '/images/me.jpg' })
//   portrait.stop() // when the canvas goes away
//
// With no `src` (or if it fails to load), a placeholder silhouette is drawn instead.

const BASES = 'ACGT'
const CELL_W = 4 // px per letter, horizontally (smaller = more detail, more letters)
const CELL_H = 6 // and vertically
// Bold monospace sized so each letter fits inside its cell (a monospace glyph is
// ~0.6em wide), so one cell can be redrawn without touching its neighbours.
// Thin pixel fonts (VT323) barely change brightness at this size: the face washes out.
const FONT = `bold ${(CELL_W / 0.6).toFixed(1)}px ui-monospace, Menlo, monospace`
const MUTATIONS_PER_TICK = 0.004 // share of letters that change every tick
const TICK_MS = 110
// Tone, so a face with dark hair and a bright shirt still reads: brightness is
// stretched across the range found inside the subject, never drops below FLOOR
// (black hair still shows as faint letters), and GAMMA bends the curve (< 1 lifts
// shadows but flattens the face; 1 keeps the features). Tuned on portrait.png.
const FLOOR = 0.08
const GAMMA = 1
const BLOCK = 0.45 // how strong the shading block behind each letter is (0 = letters only)

export function dnaPortrait(canvas, { src } = {}) {
  const ctx = canvas.getContext('2d')
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
  let cols = 0
  let rows = 0
  let letters = [] // one base per cell
  let levels = [] // brightness per cell, 0..1
  let flash = [] // >0 while a cell is lit up by a mutation
  const lit = new Set() // cells with a flash still fading
  let image = null
  let raf = 0
  let lastTick = 0
  let stopped = false

  const color = getComputedStyle(canvas).color // the letters use the canvas's CSS `color`
  const ink = (alpha) => color.replace(/^rgb\(([^)]+)\)$/, `rgba($1, ${alpha})`)

  function layout() {
    const { width, height } = canvas.getBoundingClientRect()
    if (!width || !height) return
    const dpr = Math.min(devicePixelRatio, 2)
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    cols = Math.floor(width / CELL_W)
    rows = Math.floor(height / CELL_H)
    letters = Array.from({ length: cols * rows }, () => BASES[(Math.random() * 4) | 0])
    flash = new Float32Array(cols * rows)
    lit.clear()
    sample()
    draw()
  }

  // Shrink the image to one pixel per cell (fitted to the canvas height, centered)
  // and read each cell's brightness.
  function sample() {
    const small = document.createElement('canvas')
    small.width = cols
    small.height = rows
    const sctx = small.getContext('2d', { willReadFrequently: true })
    sctx.imageSmoothingQuality = 'high' // a smoother shrink keeps more of the face
    const source = image ?? placeholder()
    const aspect = source.width / source.height
    // Cells are taller than wide, so stretch x to keep the picture's proportions.
    const h = rows
    const w = h * aspect * (CELL_H / CELL_W)
    sctx.drawImage(source, (cols - w) / 2, 0, w, h)
    const { data } = sctx.getImageData(0, 0, cols, rows)
    const luma = new Float32Array(cols * rows)
    const alpha = new Float32Array(cols * rows)
    for (let i = 0; i < luma.length; i++) {
      const [r, g, b, a] = data.subarray(i * 4, i * 4 + 4)
      luma[i] = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
      alpha[i] = a / 255
    }
    // The darkest and brightest of the subject (ignoring the 2% extremes at each end).
    const inside = [...luma].filter((_, i) => alpha[i] > 0.5).sort((x, y) => x - y)
    const lo = inside[Math.floor(inside.length * 0.02)] ?? 0
    const hi = inside[Math.floor(inside.length * 0.98)] ?? 1
    levels = new Float32Array(cols * rows)
    for (let i = 0; i < levels.length; i++) {
      const t = Math.min(1, Math.max(0, (luma[i] - lo) / (hi - lo || 1)))
      levels[i] = alpha[i] * (FLOOR + (1 - FLOOR) * t ** GAMMA)
    }
  }

  // Redraws the whole grid (on layout). Animation only redraws changed cells.
  function draw() {
    const { width, height } = canvas.getBoundingClientRect()
    ctx.clearRect(0, 0, width, height)
    ctx.font = FONT
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let i = 0; i < letters.length; i++) drawCell(i, false)
  }

  function drawCell(i, clear = true) {
    const x = (i % cols) * CELL_W
    const y = Math.floor(i / cols) * CELL_H
    if (clear) ctx.clearRect(x, y, CELL_W, CELL_H)
    const level = Math.min(1, levels[i] + flash[i])
    if (level < 0.06) return
    // A faint block behind each letter carries the photo's shading (letters alone are
    // too noisy: a T has less ink than a G); the letter on top adds the DNA texture.
    ctx.fillStyle = ink((level * BLOCK).toFixed(2))
    ctx.fillRect(x, y, CELL_W, CELL_H)
    ctx.fillStyle = ink(Math.min(1, level * 1.15).toFixed(2))
    ctx.fillText(letters[i], x + CELL_W / 2, y + CELL_H / 2)
  }

  function tick(now) {
    if (stopped) return
    raf = requestAnimationFrame(tick)
    if (now - lastTick < TICK_MS) return
    lastTick = now
    // Fade earlier mutations, redrawing just those cells.
    for (const i of lit) {
      flash[i] *= 0.7
      if (flash[i] < 0.01) {
        flash[i] = 0
        lit.delete(i)
      }
      drawCell(i)
    }
    const count = Math.ceil(letters.length * MUTATIONS_PER_TICK)
    for (let n = 0; n < count; n++) {
      const i = (Math.random() * letters.length) | 0
      if (levels[i] < 0.06) continue // only mutate letters you can see
      letters[i] = BASES[(BASES.indexOf(letters[i]) + 1 + ((Math.random() * 3) | 0)) % 4]
      flash[i] = 0.25
      lit.add(i)
      drawCell(i)
    }
  }

  const resize = new ResizeObserver(layout)
  resize.observe(canvas)

  if (src) {
    const img = new Image()
    img.onload = () => {
      image = img
      layout()
    }
    img.onerror = () => console.warn(`[dnaPortrait] Could not load ${src}, using the placeholder`)
    img.src = src
  }
  if (!reducedMotion) raf = requestAnimationFrame(tick)

  return {
    stop() {
      stopped = true
      cancelAnimationFrame(raf)
      resize.disconnect()
    },
  }
}

// A soft-lit head-and-shoulders silhouette, standing in until there's a real photo.
function placeholder() {
  const c = document.createElement('canvas')
  c.width = 300
  c.height = 400
  const g = c.getContext('2d')
  // Light coming from the top left.
  const light = (x0, y0, r) => {
    const grad = g.createRadialGradient(x0, y0, 0, x0, y0, r)
    grad.addColorStop(0, '#fff')
    grad.addColorStop(0.6, '#888')
    grad.addColorStop(1, '#222')
    return grad
  }
  // Shoulders
  g.fillStyle = light(110, 300, 230)
  g.beginPath()
  g.moveTo(20, 400)
  g.bezierCurveTo(25, 300, 90, 270, 150, 270)
  g.bezierCurveTo(210, 270, 275, 300, 280, 400)
  g.fill()
  // Neck
  g.fillRect(125, 220, 50, 60)
  // Head
  g.fillStyle = light(120, 110, 140)
  g.beginPath()
  g.ellipse(150, 150, 72, 92, 0, 0, Math.PI * 2)
  g.fill()
  return c
}
