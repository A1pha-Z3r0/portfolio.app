import * as THREE from 'three'
import Renderer from './Renderer.js'
import Camera from './Camera.js'
import Environment from './Environment.js'
import Loader from './Loader.js'
import Computer from './Computer.js'
import Screen from './Screen.js'
import Audio from './Audio.js'

// The hub. Every module gets a reference to this object and reads what it needs
// from it (scenes, sizes, camera, gui). Same idea as Henry's Application.ts,
// but passed in explicitly instead of being a singleton.
export default class Experience {
  constructor({ canvas, cssRoot, gui }) {
    this.canvas = canvas
    this.cssRoot = cssRoot
    this.gui = gui // null unless ?debug

    // Two scenes, one camera. WebGL objects go in `scene`, the iframe goes in `cssScene`.
    this.scene = new THREE.Scene()
    this.cssScene = new THREE.Scene()

    this.sizes = { width: innerWidth, height: innerHeight, pixelRatio: Math.min(devicePixelRatio, 2) }
    this.timer = new THREE.Timer()
    this.timer.connect(document) // pauses delta while the tab is hidden

    this.renderer = new Renderer(this)
    this.camera = new Camera(this)
    this.environment = new Environment(this)
    this.audio = new Audio(this)
    this.loader = new Loader(this)
    this.screen = new Screen(this)
    this.computer = new Computer(this)

    addEventListener('resize', () => this.resize())
    this.renderer.instance.setAnimationLoop((t) => this.tick(t))
  }

  // Called by Loader when the visitor clicks "CLICK TO START".
  start() {
    this.started = true
    this.audio.unlock()
    this.camera.goTo('desk', 1.6)
    setTimeout(() => this.screen.powerOn(), 600) // boot the OS while the camera flies in
    document.querySelector('#hud').hidden = false
  }

  resize() {
    this.sizes.width = innerWidth
    this.sizes.height = innerHeight
    this.sizes.pixelRatio = Math.min(devicePixelRatio, 2)
    this.camera.resize()
    this.renderer.resize()
  }

  tick(timestamp) {
    this.timer.update(timestamp)
    const dt = Math.min(this.timer.getDelta(), 0.1) // clamp so a long frame doesn't teleport the camera
    const elapsed = this.timer.getElapsed()

    this.camera.update(dt)
    this.screen.update(dt, elapsed)
    this.renderer.render()
  }
}
