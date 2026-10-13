// The window manager. Every app window is made with createWindow().
//
// Behaviour follows Henry's portfolio-inner-site (Window.tsx / Desktop.tsx /
// Toolbar.tsx): focus on mousedown raises the z-index, minimized windows are
// hidden but stay in the taskbar, and a taskbar click toggles
// restore → focus → minimize. Here it's plain DOM instead of React state.

const layer = document.querySelector('#windows')
const windows = new Map() // id -> win
const listeners = new Set()
let topZ = 1
let focused = null
let cascade = 0

export function onWindowsChange(fn) {
  listeners.add(fn)
}
function changed() {
  for (const fn of listeners) fn([...windows.values()], focused)
}

export function getWindow(id) {
  return windows.get(id)
}

/**
 * createWindow({ id, title, content, width, height, maximized })
 *   content: an HTMLElement, or a function (win) => HTMLElement
 *   maximized: open filling the desktop (the maximize button / title-bar double
 *              click toggles it). The title bar and frame always stay.
 * Returns a `win` with focus(), close(), minimize(), restore(), toggleMaximize() and
 * on('focus' | 'blur' | 'minimize' | 'restore' | 'maximize' | 'close', fn).
 */
export function createWindow({ id = crypto.randomUUID(), title, content, width = 520, height = 400, maximized = false }) {
  const el = document.createElement('section')
  el.className = 'window'
  el.setAttribute('role', 'dialog')
  el.setAttribute('aria-label', title)
  el.innerHTML = `
    <header class="titlebar">
      <span class="title"></span>
      <button class="win-btn" data-action="minimize" aria-label="Minimize">_</button>
      <button class="win-btn" data-action="maximize" aria-label="Maximize"></button>
      <button class="win-btn" data-action="close" aria-label="Close">X</button>
    </header>
    <div class="window-body"></div>`
  el.querySelector('.title').textContent = title.toUpperCase()
  const body = el.querySelector('.window-body')

  const events = new EventTarget()
  const win = {
    id,
    title,
    el,
    body,
    minimized: false,
    get maximized() {
      return el.classList.contains('maximized')
    },
    get focused() {
      return focused === win
    },
    on: (type, fn) => events.addEventListener(type, fn),
    emit: (type) => events.dispatchEvent(new Event(type)),
    focus: () => focusWindow(win),
    close: () => closeWindow(win),
    minimize: () => minimizeWindow(win),
    restore: () => {
      win.minimized = false
      el.classList.remove('minimized')
      win.emit('restore')
      focusWindow(win)
    },
    // The .maximized CSS overrides the inline position/size, so restoring
    // brings the window back exactly where it was.
    toggleMaximize: () => {
      const on = el.classList.toggle('maximized')
      maxButton.setAttribute('aria-label', on ? 'Restore' : 'Maximize')
      win.emit('maximize')
    },
  }
  const maxButton = el.querySelector('[data-action="maximize"]')

  // Size: never bigger than the desktop.
  const bounds = layer.getBoundingClientRect()
  el.style.width = `${Math.min(width, bounds.width - 8)}px`
  el.style.height = `${Math.min(height, bounds.height - 8)}px`
  if (maximized) win.toggleMaximize()
  body.append(typeof content === 'function' ? content(win) : content)
  layer.append(el)
  windows.set(id, win)
  // Cascade new windows so they don't stack exactly on top of each other.
  const offset = (cascade++ % 6) * 28
  place(el, 130 + offset, 16 + offset)

  // Focus on any press inside the window (capture phase, so it happens before the app sees it).
  el.addEventListener('pointerdown', () => focusWindow(win), true)
  el.querySelector('[data-action="minimize"]').addEventListener('click', () => win.minimize())
  maxButton.addEventListener('click', () => win.toggleMaximize())
  el.querySelector('[data-action="close"]').addEventListener('click', () => win.close())
  const titlebar = el.querySelector('.titlebar')
  titlebar.addEventListener('dblclick', (e) => !e.target.closest('button') && win.toggleMaximize())
  makeDraggable(el, titlebar)

  focusWindow(win)
  return win
}

function focusWindow(win) {
  if (focused === win) return
  const previous = focused
  focused = win
  if (previous) {
    previous.el.classList.remove('active')
    previous.emit('blur')
  }
  if (win) {
    // Release keyboard focus held by another window (e.g. the word game's input),
    // so keys go to the window you just clicked.
    const active = document.activeElement
    if (active && active !== document.body && !win.el.contains(active)) active.blur()
    win.el.style.zIndex = ++topZ
    win.el.classList.add('active')
    win.emit('focus')
  }
  changed()
}

// Focus whatever visible window is on top (after close / minimize).
function focusTopmost() {
  const visible = [...windows.values()].filter((w) => !w.minimized)
  visible.sort((a, b) => b.el.style.zIndex - a.el.style.zIndex)
  focusWindow(visible[0] ?? null)
}

function minimizeWindow(win) {
  win.minimized = true
  win.el.classList.add('minimized')
  win.emit('minimize')
  if (focused === win) {
    focused = null
    win.el.classList.remove('active')
    win.emit('blur')
    focusTopmost()
  }
  changed()
}

function closeWindow(win) {
  if (focused === win) {
    focused = null
    win.emit('blur')
  }
  win.emit('close')
  win.el.remove()
  windows.delete(win.id)
  focusTopmost()
  changed()
}

// Taskbar click (Henry's toggleMinimize).
export function toggleFromTaskbar(win) {
  if (win.minimized) win.restore()
  else if (win.focused) win.minimize()
  else win.focus()
}

// Keep a window fully inside the desktop area.
function place(el, x, y) {
  const bounds = layer.getBoundingClientRect()
  const maxX = Math.max(0, bounds.width - el.offsetWidth)
  const maxY = Math.max(0, bounds.height - el.offsetHeight)
  el.style.left = `${Math.round(Math.min(Math.max(0, x), maxX))}px`
  el.style.top = `${Math.round(Math.min(Math.max(0, y), maxY))}px`
}

function makeDraggable(el, handle) {
  let start = null
  handle.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('button') || el.classList.contains('maximized')) return
    // Pointer capture keeps the drag going even if the cursor leaves the title bar
    // (or the window, or the whole iframe).
    handle.setPointerCapture(e.pointerId)
    start = { x: e.clientX, y: e.clientY, left: el.offsetLeft, top: el.offsetTop }
    e.preventDefault()
  })
  handle.addEventListener('pointermove', (e) => {
    if (!start) return
    place(el, start.left + e.clientX - start.x, start.top + e.clientY - start.y)
  })
  const end = () => (start = null)
  handle.addEventListener('pointerup', end)
  handle.addEventListener('pointercancel', end)
}

// Re-clamp every window if the OS viewport shrinks (standalone, browser resize).
addEventListener('resize', () => {
  for (const win of windows.values()) if (!win.maximized) place(win.el, win.el.offsetLeft, win.el.offsetTop)
})
