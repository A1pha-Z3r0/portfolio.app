import * as THREE from 'three'
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js'

// The OS page is rendered at this fixed pixel size (4:3 like a CRT), then scaled
// down into world units. The OS layout never sees the 3D scene's window size.
export const IFRAME_W = 1024
export const IFRAME_H = 768

// Where the screen sits in world space. rotY = yaw, rotX = tilt back (radians).
// These defaults line up with the placeholder monitor (Computer.js builds the
// placeholder around them).
export const SCREEN = { x: 0, y: 0.55, z: 0.12, rotX: 0, rotY: 0, width: 0.6 }

// When the real model loads, SCREEN is auto-fitted to its glass mesh. If you tune
// it by hand with ?debug, click "log values" and paste the JSON here to pin it:
export const MODEL_SCREEN = null // e.g. { "x": 0, "y": 0.42, ... }

const MSG_SOURCE = 'jonathan-os' // os/os.js tags its postMessages with this

export default class Screen {
  constructor(experience) {
    this.experience = experience
    this.hovering = false
    this.held = false // mouse button is down inside the iframe

    this.createIframe()
    this.createPlanes()
    this.createGlow()
    this.listen()
    this.apply()
    if (experience.gui) this.setDebug(experience.gui)
  }

  createIframe() {
    this.wrapper = document.createElement('div')
    this.wrapper.className = 'screen-wrapper'
    Object.assign(this.wrapper.style, {
      width: `${IFRAME_W}px`,
      height: `${IFRAME_H}px`,
      background: '#000',
    })

    this.iframe = document.createElement('iframe')
    this.iframe.src = '/os/'
    this.iframe.title = 'Jonathan OS'
    Object.assign(this.iframe.style, { width: '100%', height: '100%', border: '0', display: 'block' })
    this.iframe.addEventListener('load', this.experience.loader.track('os'), { once: true })
    this.wrapper.appendChild(this.iframe)

    this.cssObject = new CSS3DObject(this.wrapper)
    this.experience.cssScene.add(this.cssObject)
  }

  createPlanes() {
    // Everything in this group is in "iframe pixels": a 1024×768 plane, with the
    // whole group scaled by SCREEN.width / IFRAME_W. That way the hole and the
    // CSS3DObject (whose DOM element is also 1024×768 px) share one transform
    // and can never drift apart.
    this.group = new THREE.Group()
    this.experience.scene.add(this.group)
    const plane = new THREE.PlaneGeometry(IFRAME_W, IFRAME_H)

    // The hole punch. NoBlending means "don't blend, overwrite the pixel", so this
    // writes rgba(0,0,0,0) straight into the canvas. Transparent pixels let the
    // iframe underneath show through. It still depth-tests like any mesh, so a
    // model part in front of the glass is drawn and hides the iframe.
    // (Black, not the default white: with a premultiplied-alpha canvas, rgb(1,1,1) at
    // alpha 0 would composite as a white glow.)
    this.hole = new THREE.Mesh(
      plane,
      new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 0, transparent: true, blending: THREE.NoBlending }),
    )
    this.hole.renderOrder = 1
    this.group.add(this.hole)

    // Glass layers drawn over the hole. Semi-transparent pixels here tint the
    // iframe below. This is Henry's createTextureLayers (MonitorScreen.ts), but
    // with textures painted on a <canvas> at runtime instead of his image files.
    const layer = (texture, blending, opacity, offsetPx, order) => {
      const mesh = new THREE.Mesh(
        plane,
        new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity, blending, depthWrite: false }),
      )
      mesh.position.z = offsetPx // "pixels" in front of the hole, along the screen normal
      mesh.renderOrder = order
      this.group.add(mesh)
      return mesh
    }
    this.shadowLayer = layer(makeInnerShadowTexture(), THREE.NormalBlending, 1, 1, 2)
    this.dimmer = layer(null, THREE.NormalBlending, 0, 2, 3) // Henry's createPerspectiveDimmer
    this.dimmer.material.color.set(0x000000)
    this.glare = layer(makeGlareTexture(), THREE.AdditiveBlending, 0.1, 3, 4)
  }

  createGlow() {
    // A dim light in front of the glass so the screen "lights" the keyboard.
    this.glow = new THREE.PointLight(0x5aa0ff, 0.12, 0, 2)
    this.glowBase = this.glow.intensity
    this.experience.scene.add(this.glow)
  }

  listen() {
    // Hover to zoom in, leave to zoom out.
    this.wrapper.addEventListener('mouseenter', () => {
      this.hovering = true
      this.enter()
    })
    this.wrapper.addEventListener('mouseleave', () => {
      this.hovering = false
      // Henry's trick (MonitorScreen.ts initializeScreenEvents): if you're mid-drag
      // inside the OS (holding a window) and the cursor slips off the screen, don't
      // zoom out yet. Wait for the mouse-up.
      if (!this.held) this.leave()
    })

    // The OS forwards pointer/key events via postMessage, because events inside
    // an iframe never reach the parent document.
    addEventListener('message', (e) => {
      if (e.source !== this.iframe.contentWindow || e.data?.source !== MSG_SOURCE) return
      const { type } = e.data
      const audio = this.experience.audio
      if (type === 'pointerdown') {
        this.held = true
        audio.mouseDown()
      }
      if (type === 'pointerup') {
        this.release()
        audio.mouseUp()
      }
      if (type === 'keydown') audio.keyClick(e.data.enter)
    })
    addEventListener('pointerup', () => this.release())
  }

  // The OS waits at "READY." until we tell it to boot (see os/os.js).
  powerOn() {
    this.iframe.contentWindow?.postMessage({ source: 'jonathan-3d', type: 'power-on' }, location.origin)
  }

  release() {
    const wasHeld = this.held
    this.held = false
    if (wasHeld && !this.hovering) this.leave()
  }

  enter() {
    if (!this.experience.started) return
    this.experience.camera.goTo('monitor', 3.5)
    // Keyboard input only reaches the OS if the iframe has focus. preventScroll stops
    // the browser from "scrolling it into view", which would misalign the CSS3D layer.
    this.iframe.focus({ preventScroll: true })
    this.experience.audio.setHum(true)
  }

  leave() {
    if (!this.experience.started) return
    this.experience.camera.goTo('desk', 3)
    // Taking focus away fires `blur` inside the iframe; Snake uses it to pause.
    if (document.activeElement === this.iframe) this.iframe.blur()
    this.experience.audio.setHum(false)
  }

  // Push SCREEN into the group, the CSS object, the glow light and the camera.
  apply() {
    const s = SCREEN
    this.group.position.set(s.x, s.y, s.z)
    // 'YXZ': yaw first, then tilt, which is how you'd physically angle a monitor.
    this.group.rotation.set(s.rotX, s.rotY, 0, 'YXZ')
    this.group.scale.setScalar(s.width / IFRAME_W) // 1 iframe px = this many world units

    this.cssObject.position.copy(this.group.position)
    this.cssObject.rotation.copy(this.group.rotation)
    this.cssObject.scale.copy(this.group.scale)

    const normal = new THREE.Vector3(0, 0, 1).applyEuler(this.group.rotation)
    const up = new THREE.Vector3(0, 1, 0).applyEuler(this.group.rotation)
    const height = (s.width * IFRAME_H) / IFRAME_W
    this.normal = normal
    this.glow.position.copy(this.group.position).addScaledVector(normal, s.width * 0.35)
    this.glow.distance = s.width * 4
    this.experience.camera.setScreen({ center: this.group.position.clone(), normal, up, width: s.width, height })
  }

  // Auto-place SCREEN on a glass mesh. Assumes the glass faces the mesh's local +Z
  // (true for the C64 monitor). The iframe goes at the front-most point of the
  // curved glass, sized to 4:3, and the bezel naturally hides the edges.
  fitToMesh(mesh, fill = 0.9) {
    mesh.updateWorldMatrix(true, false)
    mesh.geometry.computeBoundingBox()
    const b = mesh.geometry.boundingBox
    const scale = new THREE.Vector3()
    mesh.getWorldScale(scale)
    const glassW = (b.max.x - b.min.x) * scale.x
    const glassH = (b.max.y - b.min.y) * scale.y

    const center = mesh.localToWorld(new THREE.Vector3((b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2, b.max.z))
    const euler = new THREE.Euler().setFromQuaternion(mesh.getWorldQuaternion(new THREE.Quaternion()), 'YXZ')
    const normal = new THREE.Vector3(0, 0, 1).applyEuler(euler)
    center.addScaledVector(normal, glassW * 0.002) // sit a hair in front of the glass

    Object.assign(SCREEN, {
      x: center.x,
      y: center.y,
      z: center.z,
      rotX: euler.x,
      rotY: euler.y,
      width: Math.min(glassW, (glassH * IFRAME_W) / IFRAME_H) * fill,
    })
    this.apply()
  }

  set(values) {
    Object.assign(SCREEN, values)
    this.apply()
  }

  update(dt, elapsed) {
    // Henry's perspective dimmer: the screen darkens when seen at a grazing
    // angle or from far away, which sells the "glass in a box" look.
    const cam = this.experience.camera.instance.position
    const toCam = cam.clone().sub(this.group.position)
    const dist = toCam.length() / SCREEN.width
    const facing = toCam.normalize().dot(this.normal)
    const far = THREE.MathUtils.smoothstep(dist, 1.5, 9)
    this.dimmer.material.opacity = THREE.MathUtils.clamp((1 - facing) * 0.9 + far * 0.35, 0, 0.75)

    // Subtle glow flicker.
    this.glow.intensity = this.glowBase * (1 + Math.sin(elapsed * 40) * 0.03 + Math.sin(elapsed * 3.1) * 0.05)
  }

  setDebug(gui) {
    const folder = gui.addFolder('Screen')
    const onChange = () => this.apply()
    folder.add(SCREEN, 'x', -3, 3, 0.001).onChange(onChange).listen()
    folder.add(SCREEN, 'y', -1, 4, 0.001).onChange(onChange).listen()
    folder.add(SCREEN, 'z', -3, 3, 0.001).onChange(onChange).listen()
    folder.add(SCREEN, 'rotX', -Math.PI / 2, Math.PI / 2, 0.001).onChange(onChange).listen()
    folder.add(SCREEN, 'rotY', -Math.PI, Math.PI, 0.001).onChange(onChange).listen()
    folder.add(SCREEN, 'width', 0.05, 3, 0.001).onChange(onChange).listen()
    folder.add(this.glare.material, 'opacity', 0, 0.5, 0.01).name('glare')
    folder.add(this.shadowLayer.material, 'opacity', 0, 1, 0.01).name('inner shadow')
    folder.add(this, 'glowBase', 0, 1, 0.01).name('glow light')
    folder.add({ log: () => console.log(JSON.stringify(roundValues(SCREEN))) }, 'log').name('log values')
  }
}

function roundValues(obj) {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, Math.round(v * 10000) / 10000]))
}

function canvasTexture(draw) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 384
  draw(canvas.getContext('2d'), canvas.width, canvas.height)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

// Rounded CRT corners plus a soft dark falloff at the edges. Kept thin and light,
// because the OS desktop runs right to the edge (icons, taskbar).
function makeInnerShadowTexture() {
  return canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, w, h)
    // Punch out a feathered rounded rectangle.
    ctx.globalCompositeOperation = 'destination-out'
    ctx.filter = 'blur(3px)'
    ctx.beginPath()
    ctx.roundRect(4, 4, w - 8, h - 8, 12)
    ctx.fill()
    ctx.filter = 'none'
    ctx.globalCompositeOperation = 'source-over'
    // Edge darkening.
    ctx.save()
    ctx.translate(w / 2, h / 2)
    ctx.scale(1, h / w)
    const g = ctx.createRadialGradient(0, 0, w * 0.42, 0, 0, w * 0.65)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(1, 'rgba(0,0,0,0.25)')
    ctx.fillStyle = g
    ctx.fillRect(-w, -w, w * 2, w * 2)
    ctx.restore()
  })
}

// A soft highlight top-left and a faint diagonal sheen, like a lamp reflecting in the glass.
function makeGlareTexture() {
  return canvasTexture((ctx, w, h) => {
    const spot = ctx.createRadialGradient(w * 0.22, h * 0.18, 0, w * 0.22, h * 0.18, w * 0.45)
    spot.addColorStop(0, 'rgba(255,255,255,0.9)')
    spot.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = spot
    ctx.fillRect(0, 0, w, h)
    const sheen = ctx.createLinearGradient(0, 0, w, h)
    sheen.addColorStop(0.35, 'rgba(255,255,255,0)')
    sheen.addColorStop(0.45, 'rgba(255,255,255,0.35)')
    sheen.addColorStop(0.55, 'rgba(255,255,255,0)')
    ctx.fillStyle = sheen
    ctx.fillRect(0, 0, w, h)
  })
}
