import { createWindow, getWindow, onWindowsChange, toggleFromTaskbar } from './window.js'
import { icon } from './icons.js'
import about from './apps/about.js'
import projects from './apps/projects.js'
import cv from './apps/cv.js'
import wordgame from './apps/wordgame.js'
import snake from './apps/snake.js'
import credits from './apps/credits.js'

// Each app: { id, title, icon, width, height, create(win) => HTMLElement }
const APPS = [about, cv, projects, wordgame, snake, credits]

const $ = (sel) => document.querySelector(sel)
const embedded = window.parent !== window
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches

// ---------------------------------------------------------------------------
// Bridge to the 3D page. Events inside an iframe never reach the parent, so we
// forward the few it needs (Henry does the same in portfolio-inner-site's
// public/index.html). Tagged with a `source` and sent only to our own origin.
// ---------------------------------------------------------------------------
function post(type, extra) {
  if (embedded) parent.postMessage({ source: 'jonathan-os', type, ...extra }, location.origin)
}
addEventListener('pointerdown', () => post('pointerdown'), true)
addEventListener('pointerup', () => post('pointerup'), true)
addEventListener('pointercancel', () => post('pointerup'), true)
addEventListener('keydown', (e) => !e.repeat && post('keydown', { enter: e.key === 'Enter' }), true)
addEventListener('message', (e) => {
  if (e.origin !== location.origin || e.data?.source !== 'jonathan-3d') return
  if (e.data.type === 'power-on') boot()
})

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
const BOOT_LINES = [
  ['    **** JONATHAN OS V1.0 ****', 80],
  ['', 0],
  [' 64K RAM · 23 CHROMOSOME PAIRS · 0 BUGS FOUND', 120],
  ['', 0],
  ['READY.', 80],
  ['LOAD "DESKTOP",8,1', 150],
  ['', 0],
  ['SEARCHING FOR DESKTOP', 100],
  ['LOADING', 150],
  ['READY.', 60],
  ['RUN', 100],
]
const CHAR_MS = 7

// Precompute when each character appears (CHAR_MS apart, plus each line's pause).
// Rendering then shows "everything due by now", so slow timers can't stretch the
// boot past its ~2 s (chaining setTimeout(7) calls actually takes ~2x longer).
const FULL_TEXT = BOOT_LINES.map(([line]) => line).join('\n')
const REVEAL_AT = []
let t = 0
BOOT_LINES.forEach(([line, pause], i) => {
  for (let c = 0; c < line.length; c++) REVEAL_AT.push((t += CHAR_MS))
  if (i < BOOT_LINES.length - 1) REVEAL_AT.push((t += pause)) // the '\n'
})
const BOOT_MS = t + 250

let booted = false
let skip = null // ends the current boot early

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function boot() {
  if (booted) return
  booted = true
  const out = $('#boot-text')
  let skipped = false
  skip = () => (skipped = true)

  const start = performance.now()
  while (!skipped && !reducedMotion) {
    const elapsed = performance.now() - start
    if (elapsed >= BOOT_MS) break
    let n = 0
    while (n < REVEAL_AT.length && REVEAL_AT[n] <= elapsed) n++
    out.textContent = FULL_TEXT.slice(0, n)
    await sleep(16)
  }
  out.textContent = FULL_TEXT
  if (reducedMotion) await sleep(300)
  showDesktop()
}

// Click or any key skips the boot (and starts it, when waiting for power-on).
$('#boot').addEventListener('click', () => (booted ? skip?.() : boot()))
addEventListener('keydown', () => {
  if (!$('#boot').hidden) booted ? skip?.() : boot()
})

// ---------------------------------------------------------------------------
// Desktop
// ---------------------------------------------------------------------------
function showDesktop() {
  $('#boot').hidden = true
  $('#desktop').hidden = false
}

function openApp(app) {
  const existing = getWindow(app.id)
  if (existing) return existing.minimized ? existing.restore() : existing.focus()
  createWindow({ id: app.id, title: app.title, width: app.width, height: app.height, maximized: app.maximized, content: (win) => app.create(win) })
}

// Icons: select on click, open on double click (on touch screens a single tap opens).
// A manual double-click timer (like Henry's DesktopShortcut.tsx) works on touch too,
// where the native dblclick event is unreliable.
const coarse = matchMedia('(pointer: coarse)').matches
let lastTap = { app: null, time: 0 }
for (const app of APPS) {
  const button = document.createElement('button')
  button.className = 'icon'
  button.innerHTML = `${icon(app.icon)}<span></span>`
  button.querySelector('span').textContent = app.title
  button.addEventListener('click', () => {
    document.querySelectorAll('.icon.selected').forEach((el) => el.classList.remove('selected'))
    button.classList.add('selected')
    const now = performance.now()
    if (coarse || (lastTap.app === app && now - lastTap.time < 400)) {
      openApp(app)
      lastTap = { app: null, time: 0 }
    } else {
      lastTap = { app, time: now }
    }
  })
  button.addEventListener('keydown', (e) => e.key === 'Enter' && (e.preventDefault(), openApp(app)))
  $('#icons').append(button)
}
// Clicking empty desktop clears the selection.
$('#desktop').addEventListener('pointerdown', (e) => {
  if (!e.target.closest('.icon')) document.querySelectorAll('.icon.selected').forEach((el) => el.classList.remove('selected'))
  if (!e.target.closest('#start-menu, #start')) toggleStartMenu(false)
})

// ---------------------------------------------------------------------------
// Taskbar
// ---------------------------------------------------------------------------
onWindowsChange((wins, focused) => {
  const tasks = $('#tasks')
  tasks.replaceChildren(
    ...wins.map((win) => {
      const b = document.createElement('button')
      b.textContent = win.title
      b.title = win.title
      b.classList.toggle('active', win === focused)
      b.classList.toggle('minimized', win.minimized)
      b.addEventListener('click', () => toggleFromTaskbar(win))
      return b
    }),
  )
})

function toggleStartMenu(open = $('#start-menu').hidden) {
  $('#start-menu').hidden = !open
  $('#start').setAttribute('aria-expanded', String(open))
}
$('#start').addEventListener('click', () => toggleStartMenu())

const menu = $('#start-menu')
menu.setAttribute('role', 'menu')
for (const app of APPS) {
  const b = document.createElement('button')
  b.setAttribute('role', 'menuitem')
  b.textContent = app.title
  b.addEventListener('click', () => (toggleStartMenu(false), openApp(app)))
  menu.append(b)
}
menu.append(document.createElement('hr'))
const restart = document.createElement('button')
restart.setAttribute('role', 'menuitem')
restart.textContent = 'RESTART...'
restart.addEventListener('click', () => {
  toggleStartMenu(false)
  document.querySelectorAll('.window .win-btn[data-action="close"]').forEach((b) => b.click())
  $('#desktop').hidden = true
  $('#boot').hidden = false
  booted = false
  boot()
})
menu.append(restart)

// Clock
function tickClock() {
  $('#clock').textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}
tickClock()
setInterval(tickClock, 1000)

// ---------------------------------------------------------------------------
// Start: standalone boots right away. Inside the 3D scene we wait at "READY."
// until the visitor clicks start (the parent sends 'power-on'), so they actually
// get to see the boot.
// ---------------------------------------------------------------------------
if (embedded) $('#boot-text').textContent = 'READY.\n'
else boot()
