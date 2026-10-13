// ERA SWITCH: the pre-Claude / post-Claude filter on the About page. A three-way
// slide switch (pre · all · post), deliberately over-engineered:
//  - the knob rides a damped spring (it overshoots a little and settles), and
//    squashes, stretches and leans with its speed
//  - drag it or flick it: on release it carries its speed into the nearest stop
//  - a lit bar charges from the center out to the knob; the knob leaves a phosphor
//    afterglow on a canvas, and hitting an end stop throws sparks and flashes its LED
//  - the readout underneath decodes out of DNA letters (like the portrait)
//  - the knob has googly eyes: the pupils slosh with the knob's acceleration, look
//    at the cursor when it's still, blink now and then, and pull a face on impact
// Clicking a side's label toggles it: click the lit side again to go back to "all".
// With prefers-reduced-motion it just jumps, with no sparks or scramble.

const STOPS = [0, 0.5, 1] // knob position along the track for pre, all, post
const ERAS = ['pre', 'all', 'post']
const READOUT = { pre: 'pre-claude', all: 'all', post: 'post-claude' }

// The spring. Damping ratio 22 / (2·√420) ≈ 0.54: one soft overshoot, then still.
const STIFFNESS = 420
const DAMPING = 22
const STRETCH = 18 // px the knob can be pulled past either end
const FLICK = 0.12 // on release, how far (in seconds of travel) the knob's speed throws it

const AMBER = '255, 179, 64'

// Googly pupils: how far they can roll (px from the eye's center), and their physics.
const PUPIL_ROOM = 4.5
const PUPIL_GRAVITY = 700 // px/s², pulls them to the bottom of the eye
const PUPIL_SLOSH = 0.05 // how much of the knob's acceleration they feel
const PUPIL_DAMPING = 3 // low, so they swirl around the rim before settling
const PUPIL_LOOK = 260 // spring toward wherever the cursor is
const PUPIL_BOUNCE = 0.45 // how much speed survives hitting the rim

// `mark` is the Claude spark's SVG markup, shown after the post-Claude label.
// `counts` is { pre, all, post } (projects per era) for the readout.
// `onChange(era)` fires as soon as a new stop is chosen, before the knob arrives.
export function eraSwitch(root, { mark = '', counts = {}, onChange = () => {} }) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  root.classList.add('era')
  root.innerHTML = `
    <button class="era-label" data-stop="0" aria-pressed="false">pre-Claude</button>
    <div class="era-track">
      <span class="era-glass"></span>
      <span class="era-fill"></span>
      ${STOPS.map((s, i) => `<span class="era-tick" data-stop="${i}" style="left: ${s * 100}%"></span>`).join('')}
      <canvas class="era-fx" aria-hidden="true"></canvas>
      <span class="era-knob" role="slider" tabindex="0" aria-label="Filter projects by era"
        aria-valuemin="0" aria-valuemax="2" aria-valuenow="1" aria-valuetext="all"><span
        class="era-eye"><span class="era-pupil"></span></span><span
        class="era-eye"><span class="era-pupil"></span></span></span>
    </div>
    <button class="era-label" data-stop="2" aria-pressed="false">post-Claude ${mark}</button>
    <p class="era-readout" aria-live="polite"></p>`

  const track = root.querySelector('.era-track')
  const knob = root.querySelector('.era-knob')
  const fill = root.querySelector('.era-fill')
  const ticks = [...root.querySelectorAll('.era-tick')]
  const labels = [...root.querySelectorAll('.era-label')]
  const readout = root.querySelector('.era-readout')
  const canvas = root.querySelector('.era-fx')
  const ctx = canvas.getContext('2d')

  let stop = 1 // the chosen stop (index into STOPS)
  let x = STOPS[stop] // knob position, 0..1 along the track
  let v = 0 // knob speed, track-lengths per second
  let target = x
  let side = 0 // which side of its target the knob is on, to catch it crossing
  let drag = null
  let frame = 0
  let last = 0
  let afterglow = 0 // seconds the canvas keeps fading after the knob stops
  let travel = 0 // px the knob can move
  let knobW = 0
  let pad = 0 // the canvas's overhang around the track, px
  const sparks = []
  let lastV = 0 // the knob's speed last frame, for its acceleration
  // Each pupil: offset from its eye's center (px) and velocity. Slightly different
  // weights, so the two eyes never move quite in sync (that's what makes them googly).
  const pupils = [...knob.querySelectorAll('.era-pupil')].map((el, i) => ({ el, x: 0, y: PUPIL_ROOM, vx: 0, vy: 0, weight: i ? 1.15 : 0.9 }))
  const look = { x: 0, y: 0, pull: 0 } // where the cursor is, as a direction; pull 0..1

  function measure() {
    knobW = knob.offsetWidth
    travel = track.clientWidth - knobW
    pad = (canvas.offsetWidth - track.clientWidth) / 2
    const dpr = devicePixelRatio || 1
    canvas.width = Math.round(canvas.offsetWidth * dpr)
    canvas.height = Math.round(canvas.offsetHeight * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    render()
  }
  const resize = new ResizeObserver(measure)
  resize.observe(track)

  // ---- motion -------------------------------------------------------------

  function kick() {
    if (frame) return
    last = performance.now()
    frame = requestAnimationFrame(tick)
  }

  function tick(now) {
    const dt = Math.min(0.032, (now - last) / 1000) // clamp: a background tab can pause for seconds
    last = now
    if (!drag) {
      // Semi-implicit Euler in small steps keeps the stiff spring stable.
      const steps = 4
      const h = dt / steps
      for (let i = 0; i < steps; i++) {
        v += (-STIFFNESS * (x - target) - DAMPING * v) * h
        x += v * h
      }
      const at = Math.sign(x - target)
      if (at && side && at !== side) arrive(Math.abs(v))
      if (at) side = at
    }
    const moving = drag || Math.abs(x - target) > 1e-4 || Math.abs(v) > 1e-3
    if (!moving && !drag) (x = target), (v = 0)
    afterglow = moving ? 0.7 : afterglow - dt
    // The knob's acceleration in px/s², clamped: drag samples can spike.
    const accel = dt > 0 ? Math.max(-9000, Math.min(9000, ((v - lastV) / dt) * travel)) : 0
    lastV = v
    const rolling = wobble(dt, accel)
    step(dt)
    render()
    frame = moving || rolling || sparks.length || afterglow > 0 ? requestAnimationFrame(tick) : 0
  }

  // Googly physics, in the knob's frame: when the knob speeds up, the pupils are
  // flung the other way. They roll along the rim of the eye and settle at the
  // bottom (or toward the cursor). Returns whether they're still moving.
  function wobble(dt, accel) {
    let rolling = false
    for (const p of pupils) {
      const steps = 3
      const h = dt / steps
      for (let i = 0; i < steps; i++) {
        let ax = -accel * PUPIL_SLOSH * p.weight - PUPIL_DAMPING * p.vx
        let ay = PUPIL_GRAVITY * (1 - look.pull) - PUPIL_DAMPING * p.vy
        if (look.pull) {
          ax += PUPIL_LOOK * look.pull * (look.x * PUPIL_ROOM - p.x)
          ay += PUPIL_LOOK * look.pull * (look.y * PUPIL_ROOM - p.y)
        }
        p.vx += ax * h
        p.vy += ay * h
        p.x += p.vx * h
        p.y += p.vy * h
        // The rim: put the pupil back on it and bounce off what's left of its
        // outward speed. The speed along the rim is kept, so it rolls around.
        const r = Math.hypot(p.x, p.y)
        if (r > PUPIL_ROOM) {
          const nx = p.x / r
          const ny = p.y / r
          p.x = nx * PUPIL_ROOM
          p.y = ny * PUPIL_ROOM
          const out = p.vx * nx + p.vy * ny
          if (out > 0) (p.vx -= (1 + PUPIL_BOUNCE) * out * nx), (p.vy -= (1 + PUPIL_BOUNCE) * out * ny)
          p.vx *= 0.985 // a little friction against the rim
          p.vy *= 0.985
        }
      }
      if (Math.hypot(p.vx, p.vy) > 2) rolling = true
    }
    return rolling
  }

  // Faces: '' (normal), 'squint' (> <), 'dizzy' (spinning spirals).
  let faceTimer = 0
  function face(name, ms) {
    clearTimeout(faceTimer)
    knob.dataset.face = name
    if (ms) faceTimer = setTimeout(() => (knob.dataset.face = ''), ms)
  }

  // Blink every few seconds (unless it's busy pulling a face).
  let blinkTimer = 0
  function blink() {
    blinkTimer = setTimeout(() => {
      if (!knob.dataset.face) {
        knob.classList.remove('blink')
        void knob.offsetWidth
        knob.classList.add('blink')
      }
      blink()
    }, 2500 + Math.random() * 3500)
  }
  if (!reduce) blink()

  // The eyes follow the cursor while it's around (and the knob isn't being dragged).
  const doc = root.ownerDocument
  const watch = (e) => {
    if (drag) return
    const box = knob.getBoundingClientRect()
    const dx = e.clientX - (box.left + box.width / 2)
    const dy = e.clientY - (box.top + box.height / 2)
    const d = Math.hypot(dx, dy) || 1
    look.x = dx / d
    look.y = dy / d
    look.pull = d < 600 ? Math.min(1, d / 60) : 0 // too far away: lose interest
    kick()
  }
  const unwatch = () => ((look.pull = 0), kick())
  doc.addEventListener('pointermove', watch)
  doc.documentElement.addEventListener('pointerleave', unwatch)

  // The knob crossed its stop at `speed`: the first crossing is the "hit".
  function arrive(speed) {
    if (speed < 0.5) return
    if (!reduce && stop !== 1) speed > 3 ? face('dizzy', 1100) : face('squint', 380)
    const led = ticks[stop]
    led.classList.remove('flash')
    void led.offsetWidth // restart the animation
    led.classList.add('flash')
    if (reduce || stop === 1) return // sparks only at the ends, where there's a wall
    const cx = pad + knobW / 2 + target * travel + (stop === 0 ? -knobW / 2 : knobW / 2)
    const cy = pad + track.clientHeight / 2
    const n = Math.min(26, 6 + speed * 5)
    for (let i = 0; i < n; i++) {
      const away = stop === 0 ? -1 : 1 // fly off the wall the knob hit
      const a = (Math.random() - 0.5) * Math.PI * 0.9
      const s = 60 + Math.random() * 160 * Math.min(2, speed)
      sparks.push({ x: cx, y: cy, vx: Math.cos(a) * s * away, vy: Math.sin(a) * s - 40, life: 1, size: Math.random() < 0.3 ? 3 : 2 })
    }
  }

  function step(dt) {
    for (const p of sparks) {
      p.vy += 520 * dt // gravity
      p.vx *= 1 - 2 * dt // air
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.life -= dt * (1.6 + Math.random())
    }
    for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].life <= 0) sparks.splice(i, 1)
  }

  function render() {
    const heat = Math.min(1, Math.abs(v) / 3.5)
    // Squash and stretch: longer along the motion, flatter across it, leaning back.
    const s = Math.min(0.22, Math.abs(v) * 0.045)
    knob.style.transform = `translateX(${x * travel}px) skewX(${(-v * 2.4).toFixed(2)}deg) scale(${1 + s}, ${1 - s * 0.7})`
    root.style.setProperty('--heat', heat.toFixed(3))
    // The charge bar runs from the center stop to the knob.
    const from = Math.min(x, 0.5)
    fill.style.left = `${knobW / 2 + from * travel}px`
    fill.style.width = `${Math.abs(x - 0.5) * travel}px`
    // Each tick lights up as the knob nears it.
    ticks.forEach((t, i) => t.style.setProperty('--lit', Math.max(0, 1 - Math.abs(x - STOPS[i]) * 5).toFixed(3)))
    for (const p of pupils) p.el.style.translate = `${p.x.toFixed(2)}px ${p.y.toFixed(2)}px`

    // Phosphor: fade what's there a little, then draw the knob's glow on top. A fast
    // knob leaves a smear that dies away, like a CRT's afterimage.
    const w = canvas.offsetWidth
    const h = canvas.offsetHeight
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)'
    ctx.fillRect(0, 0, w, h)
    ctx.globalCompositeOperation = 'lighter'
    if (heat > 0.02) {
      const cx = pad + knobW / 2 + x * travel
      const cy = pad + track.clientHeight / 2
      const r = knobW * (0.6 + heat * 0.8)
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
      g.addColorStop(0, `rgba(${AMBER}, ${0.45 * heat})`)
      g.addColorStop(1, `rgba(${AMBER}, 0)`)
      ctx.fillStyle = g
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
    }
    for (const p of sparks) {
      ctx.fillStyle = `rgba(255, ${190 + Math.round(60 * p.life)}, ${120 + Math.round(100 * p.life)}, ${Math.max(0, p.life)})`
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size) // square, like pixels
    }
    ctx.globalCompositeOperation = 'source-over'
  }

  // ---- choosing a stop ------------------------------------------------------

  function choose(next) {
    next = Math.max(0, Math.min(2, next))
    target = STOPS[next]
    side = Math.sign(x - target)
    if (reduce) (x = target), (v = 0)
    if (next !== stop) {
      stop = next
      const era = ERAS[stop]
      knob.setAttribute('aria-valuenow', String(stop))
      knob.setAttribute('aria-valuetext', READOUT[era])
      labels.forEach((l) => l.setAttribute('aria-pressed', String(Number(l.dataset.stop) === stop)))
      root.dataset.era = era
      sweep()
      decode(`> filter: ${READOUT[era]} · ${counts[era] ?? 0} entries`)
      onChange(era)
    }
    kick()
  }

  // A band of light runs along the glass toward the new stop.
  function sweep() {
    if (reduce) return
    track.classList.remove('sweep-left', 'sweep-right')
    void track.offsetWidth
    track.classList.add(target < x ? 'sweep-left' : 'sweep-right')
  }

  // The readout resolves left to right out of random A/C/G/T letters.
  let decodeFrame = 0
  function decode(text) {
    cancelAnimationFrame(decodeFrame)
    if (reduce) return void (readout.textContent = text)
    const start = performance.now()
    const run = (now) => {
      const t = (now - start) / 420
      const front = t * (text.length + 8)
      readout.textContent = [...text]
        .map((ch, i) => (ch === ' ' || i < front - 8 ? ch : i < front ? 'ACGT'[(Math.random() * 4) | 0] : ''))
        .join('')
      if (t < 1) decodeFrame = requestAnimationFrame(run)
    }
    decodeFrame = requestAnimationFrame(run)
  }

  for (const l of labels) {
    // Toggle: the lit side switches back to "all".
    l.addEventListener('click', () => choose(Number(l.dataset.stop) === stop ? 1 : Number(l.dataset.stop)))
  }

  knob.addEventListener('keydown', (e) => {
    const keys = { ArrowLeft: stop - 1, ArrowDown: stop - 1, ArrowRight: stop + 1, ArrowUp: stop + 1, Home: 0, End: 2 }
    if (e.key in keys) e.preventDefault(), choose(keys[e.key])
  })

  // Drag (and flick) the knob, or click anywhere on the track to jump.
  track.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return
    track.setPointerCapture(e.pointerId)
    drag = { id: e.pointerId, x0: e.clientX, from: x, moved: false, samples: [[performance.now(), x]] }
    root.classList.add('dragging')
    if (e.target !== knob) knob.focus({ preventScroll: true })
    kick()
  })
  track.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return
    const dx = e.clientX - drag.x0
    if (Math.abs(dx) > 3) drag.moved = true
    if (!drag.moved) return
    let raw = drag.from + dx / travel
    // Past the ends it resists more the further you pull, and never goes beyond
    // STRETCH px: it gives a little, then it's like pulling against a wall.
    if (raw < 0) raw = -stretch(-raw)
    if (raw > 1) raw = 1 + stretch(raw - 1)
    const straining = raw < -0.02 || raw > 1.02
    if (straining && knob.dataset.face !== 'squint') face('squint')
    else if (!straining && knob.dataset.face === 'squint') face('')
    x = raw
    // Speed from the last ~80 ms of samples: smoother than from the last event alone.
    const t = performance.now()
    drag.samples.push([t, x])
    while (drag.samples.length > 2 && t - drag.samples[0][0] > 80) drag.samples.shift()
    const [t0, x0] = drag.samples[0]
    v = t > t0 ? (x - x0) / ((t - t0) / 1000) : 0
    kick()
  })
  const release = (e) => {
    if (!drag || e.pointerId !== drag.id) return
    const { moved } = drag
    drag = null
    root.classList.remove('dragging')
    if (knob.dataset.face === 'squint') face('')
    if (moved) {
      // Throw: where the knob is heading, not just where it was let go.
      const aim = x + v * FLICK
      choose(nearest(aim))
    } else {
      const box = track.getBoundingClientRect()
      const at = (e.clientX - box.left - knobW / 2) / travel
      const n = nearest(at)
      choose(n === stop && e.target === knob ? (stop === 1 ? 2 : 1) : n) // tapping the knob itself nudges it
    }
  }
  track.addEventListener('pointerup', release)
  track.addEventListener('pointercancel', release)

  // Rubber band (as on iOS): starts at 1:3, flattens out toward STRETCH px.
  function stretch(over) {
    const limit = STRETCH / travel
    return limit * (1 - 1 / ((over * 0.35) / limit + 1))
  }

  function nearest(at) {
    let best = 0
    STOPS.forEach((s, i) => Math.abs(s - at) < Math.abs(STOPS[best] - at) && (best = i))
    return best
  }

  readout.textContent = `> filter: all · ${counts.all ?? 0} entries`
  root.dataset.era = 'all'

  return {
    destroy() {
      cancelAnimationFrame(frame)
      cancelAnimationFrame(decodeFrame)
      clearTimeout(faceTimer)
      clearTimeout(blinkTimer)
      doc.removeEventListener('pointermove', watch)
      doc.documentElement.removeEventListener('pointerleave', unwatch)
      resize.disconnect()
    },
  }
}
