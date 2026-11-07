// Phones: the OS screen in the scene is ~40% size on a phone, far too small to
// read or tap. So the scene stays (the desk is the context), but a tap zooms the
// camera into the monitor and, as the screen fills the view, crossfades to a
// second, full-size copy of the OS (/os/?phone) laid over everything. Its "DESK"
// button posts 'exit', which fades back out and zooms out again.
//
// A second iframe because moving the scene's iframe out of the CSS3D layer would
// reload it anyway. Both copies boot together, so the one you land in is ready.
const MSG_SOURCE = 'jonathan-os'
const FADE_IN_AFTER_MS = 650 // about when the zoom has filled the view
const FADE_OUT_MS = 250 // must match #phone-os's transition in style.css

export default class PhoneOS {
  constructor(experience) {
    this.experience = experience
    this.open = false
    this.hint = document.querySelector('#tap-hint')

    this.el = document.createElement('div')
    this.el.id = 'phone-os'
    this.iframe = document.createElement('iframe')
    this.iframe.src = '/os/?phone'
    this.iframe.title = 'Jonathan OS'
    this.iframe.addEventListener('load', experience.loader.track('phone-os'), { once: true })
    this.el.append(this.iframe)
    document.body.append(this.el)

    // A tap (not a drag, which pans the view) anywhere on the scene zooms in.
    // The scene's own iframe has pointer-events off on phones (see Screen.js),
    // so taps on the monitor land here too.
    let down = null
    addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY }))
    addEventListener('pointerup', (e) => {
      if (!down) return
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y)
      down = null
      if (moved < 10 && !e.target.closest('#hud, #loader')) this.enter()
    })

    addEventListener('message', (e) => {
      if (e.source !== this.iframe.contentWindow || e.data?.source !== MSG_SOURCE) return
      const audio = experience.audio
      const { type } = e.data
      if (type === 'pointerdown') audio.mouseDown()
      if (type === 'pointerup') audio.mouseUp()
      if (type === 'keydown') audio.keyClick(e.data.enter)
      if (type === 'exit') this.leave()
    })
  }

  powerOn() {
    this.iframe.contentWindow?.postMessage({ source: 'jonathan-3d', type: 'power-on' }, location.origin)
    this.hint.hidden = false
  }

  enter() {
    if (!this.experience.started || this.open) return
    this.open = true
    this.hint.hidden = true
    this.experience.camera.goTo('monitor', 3.5)
    this.experience.audio.setHum(true)
    clearTimeout(this.timer)
    this.timer = setTimeout(() => this.el.classList.add('open'), FADE_IN_AFTER_MS)
  }

  leave() {
    if (!this.open) return
    this.open = false
    clearTimeout(this.timer)
    this.el.classList.remove('open')
    if (document.activeElement === this.iframe) this.iframe.blur()
    // Zoom out once the overlay has faded, so you see the screen shrink back into the desk.
    this.timer = setTimeout(() => {
      this.experience.camera.goTo('desk', 3)
      this.experience.audio.setHum(false)
      this.hint.hidden = false
    }, FADE_OUT_MS)
  }
}
