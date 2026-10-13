import * as THREE from 'three'

const _goalPos = new THREE.Vector3()
const _goalTarget = new THREE.Vector3()
const _right = new THREE.Vector3()

// Named views, all derived from the screen (center, normal, size), so they work
// for the placeholder and the real model alike, and re-fit when you tweak SCREEN.
//
// Henry (Camera.ts + CameraKeyframes.ts) hard-codes keyframes and tweens between
// them with a fixed duration and ease-in-out curve. We instead "chase" the goal
// every frame with exponential easing. It's interruptible for free: if you
// hover out halfway through a zoom, the camera just starts chasing the new goal
// with no snapping. Parallax falls out of the same code (the goal itself moves).
export default class Camera {
  constructor(experience) {
    this.experience = experience
    const { width, height } = experience.sizes

    this.instance = new THREE.PerspectiveCamera(40, width / height, 0.01, 100)
    experience.scene.add(this.instance)

    this.views = {
      intro: { position: new THREE.Vector3(), target: new THREE.Vector3() },
      desk: { position: new THREE.Vector3(), target: new THREE.Vector3() },
      monitor: { position: new THREE.Vector3(), target: new THREE.Vector3() },
    }
    this.view = 'intro'
    this.speed = 2 // higher = snappier; 1/speed is roughly the time constant in seconds
    this.current = { position: new THREE.Vector3(), target: new THREE.Vector3() }
    this.mouse = new THREE.Vector2() // -1..1, only updates while the cursor is outside the iframe
    this.elapsed = 0

    addEventListener('pointermove', (e) => {
      this.mouse.set((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1))
    })

    if (experience.gui) this.setDebug(experience.gui)
  }

  // Screen.js calls this whenever SCREEN changes.
  setScreen(info) {
    const first = !this.screenInfo
    this.screenInfo = info
    this.computeViews()
    if (first) this.snapTo(this.view)
  }

  computeViews() {
    if (!this.screenInfo) return
    const { center, normal, up, width, height } = this.screenInfo
    _right.crossVectors(up, normal).normalize()

    // Monitor: back off along the screen normal until the screen fits the viewport.
    // Visible height at distance d is 2·d·tan(fov/2); visible width is that × aspect.
    // Solve both for d and take the larger, so neither dimension overflows.
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(this.instance.fov) / 2)
    const fitHeight = height / 2 / tanHalf
    const fitWidth = width / 2 / (tanHalf * this.instance.aspect)
    const fit = Math.max(fitHeight, fitWidth) * 1.15 // a little margin, so you can move off the screen to leave
    this.views.monitor.position.copy(center).addScaledVector(normal, fit)
    this.views.monitor.target.copy(center)

    // Desk: further back and a bit above, looking slightly down at the keyboard.
    // On tall/narrow windows back off further (like Henry's aspect term in DeskKeyframe).
    const portrait = Math.max(0, 1 / this.instance.aspect - 0.6)
    const deskDist = width * (3.4 + 2.2 * portrait)
    this.views.desk.position.copy(center).addScaledVector(normal, deskDist).addScaledVector(up, height * 0.9)
    this.views.desk.target.copy(center).addScaledVector(up, -height * 0.55)

    // Intro: high, wide, off to one side.
    this.views.intro.position
      .copy(center)
      .addScaledVector(normal, width * 7)
      .addScaledVector(_right, -width * 6)
      .addScaledVector(up, width * 4.5)
    this.views.intro.target.copy(center).addScaledVector(up, -height * 1.2)
  }

  goTo(name, speed = 3) {
    this.view = name
    this.speed = speed
  }

  snapTo(name) {
    this.view = name
    this.current.position.copy(this.views[name].position)
    this.current.target.copy(this.views[name].target)
  }

  resize() {
    const { width, height } = this.experience.sizes
    this.instance.aspect = width / height
    this.instance.updateProjectionMatrix()
    this.computeViews() // the monitor fit depends on aspect
  }

  update(dt) {
    if (!this.screenInfo) return
    this.elapsed += dt
    const view = this.views[this.view]
    _goalPos.copy(view.position)
    _goalTarget.copy(view.target)

    const { width, height, up } = this.screenInfo
    if (this.view === 'desk') {
      // Parallax: the goal slides with the mouse, and easing smooths it.
      _goalPos.addScaledVector(_right, this.mouse.x * width * 0.45).addScaledVector(up, this.mouse.y * height * 0.3)
      _goalTarget.addScaledVector(_right, this.mouse.x * width * 0.05)
    } else if (this.view === 'intro') {
      // Slow idle drift behind the loading overlay (Henry's IdleKeyframe does a similar sine drift).
      _goalPos.addScaledVector(_right, Math.sin(this.elapsed * 0.3) * width * 0.6)
    }

    // Frame-rate independent easing: after t seconds the remaining distance is
    // exp(-speed·t) regardless of fps. A plain lerp(…, 0.1) would be twice as
    // fast on a 120 Hz screen as on a 60 Hz one.
    const k = 1 - Math.exp(-this.speed * dt)
    this.current.position.lerp(_goalPos, k)
    this.current.target.lerp(_goalTarget, k)

    this.instance.position.copy(this.current.position)
    this.instance.lookAt(this.current.target)
  }

  setDebug(gui) {
    const folder = gui.addFolder('Camera').close()
    folder.add(this, 'view', Object.keys(this.views)).listen()
    folder.add(this, 'speed', 0.5, 10, 0.1).listen()
    folder.add(this.instance, 'fov', 20, 80, 1).onChange(() => {
      this.instance.updateProjectionMatrix()
      this.computeViews()
    })
  }
}
