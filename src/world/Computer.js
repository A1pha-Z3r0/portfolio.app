import * as THREE from 'three'
import { SCREEN, MODEL_SCREEN } from './Screen.js'

export const MODEL = {
  url: '/models/c64/scene.glb',
  size: 2, // largest dimension after normalizing, in world units
  rotationY: 0,
  glassMaterial: 'monitor_screen', // material name of the CRT glass in the Sketchfab model
  screenFill: 0.9, // how much of the glass the iframe covers when auto-fitting
  cableMaterials: ['cable', 'connector'], // cut off behind the monitor (see hideLooseCables)
  cableCut: 0.05, // how far behind the monitor's back the cables stop
  // A second, slanted cut for the disk drive's cables (on the left): from 0.45
  // behind the desk's center line at the far left to just behind the monitor's
  // left corner. In world units, for this model.
  driveCut: { from: [-1, -0.45], to: [-0.34, -0.58] },
}

// Snapshot of the defaults before anything modifies SCREEN; the placeholder is built around them.
const PLACEHOLDER_SCREEN = { ...SCREEN }

export default class Computer {
  constructor(experience) {
    this.experience = experience
    this.pivot = new THREE.Group() // rotationY is applied here; the model inside is scaled/centered
    experience.scene.add(this.pivot)

    experience.loader.gltf.load(
      MODEL.url,
      (gltf) => this.onLoad(gltf),
      undefined,
      (error) => {
        console.warn(`[Computer] Could not load ${MODEL.url}, using the placeholder monitor.`, error)
        this.buildPlaceholder()
      },
    )
  }

  onLoad(gltf) {
    this.model = gltf.scene
    this.pivot.add(this.model)

    const meshes = []
    this.model.traverse((child) => {
      if (!child.isMesh) return
      child.castShadow = true
      child.receiveShadow = true
      meshes.push(child)
      if (child.material.name === MODEL.glassMaterial) this.glass = child
    })

    // The glass texture is light gray, which shows as a pale rim between the (flat,
    // 4:3) iframe and the (curved, wider) glass. Darken it so the gap reads as the
    // black border of a CRT, but keep it glossy for reflections.
    if (this.glass) {
      this.glass.material.color.setScalar(0.06)
      this.glass.material.roughness = 0.15
    }

    if (this.experience.gui) {
      // Helps you find the screen mesh in a different model.
      console.table(meshes.map((m) => ({ mesh: m.name, material: m.material.name, parent: m.parent?.name })))
      this.setDebug(this.experience.gui)
    }
    if (!this.glass) console.warn(`[Computer] No mesh with material "${MODEL.glassMaterial}", tune SCREEN by hand (?debug).`)

    this.normalize()
    this.hideLooseCables(meshes)
  }

  // Three cable ends in the model (two mains plugs and the disk drive's data plug)
  // lie on the desk behind the monitor, plugged into nothing. The cables are a
  // single mesh, so they can't be re-routed: instead everything of the cable and
  // plug meshes behind this plane is cut away (the camera never goes back there).
  hideLooseCables(meshes) {
    const box = new THREE.Box3()
    for (const m of meshes) if (m.material.name === 'monitor_black') box.expandByObject(m)
    // A little behind the monitor's back panel, in world space.
    const behindMonitor = new THREE.Plane(new THREE.Vector3(0, 0, 1), -(box.min.z - MODEL.cableCut))
    // Through the two driveCut points (on the desk, y = 0); keeps the side toward the viewer.
    const [x1, z1] = MODEL.driveCut.from
    const [x2, z2] = MODEL.driveCut.to
    const behindDrive = new THREE.Plane().setFromCoplanarPoints(
      new THREE.Vector3(x1, 0, z1),
      new THREE.Vector3(x2, 0, z2),
      new THREE.Vector3(x1, 1, z1),
    )
    if (behindDrive.normal.z < 0) behindDrive.negate()
    // Anything behind either plane is cut.
    this.cablePlanes = [behindMonitor, behindDrive]
    for (const m of meshes) {
      if (!MODEL.cableMaterials.includes(m.material.name)) continue
      m.material.clippingPlanes = this.cablePlanes
      m.material.clipShadows = true // or the cut-off plugs still cast shadows
    }
  }

  // Scale the largest dimension to MODEL.size, center on x/z, and sit it on y = 0.
  // Works for any model regardless of its original units (cm, m, inches...).
  normalize() {
    const { model, pivot } = this
    model.position.set(0, 0, 0)
    model.scale.setScalar(1)
    pivot.position.set(0, 0, 0)
    pivot.rotation.y = MODEL.rotationY

    const box = new THREE.Box3().setFromObject(model)
    const size = box.getSize(new THREE.Vector3())
    model.scale.setScalar(MODEL.size / Math.max(size.x, size.y, size.z))

    box.setFromObject(model)
    const center = box.getCenter(new THREE.Vector3())
    pivot.position.set(-center.x, -box.min.y, -center.z)
    pivot.updateMatrixWorld(true)

    this.fitScreen()
  }

  fitScreen() {
    const { screen } = this.experience
    if (MODEL_SCREEN) screen.set(MODEL_SCREEN)
    else if (this.glass) screen.fitToMesh(this.glass, MODEL.screenFill)
  }

  // Fallback when the model is missing: a boxy monitor + keyboard built around the
  // default SCREEN values, so the iframe lines up without any tuning.
  buildPlaceholder() {
    const s = PLACEHOLDER_SCREEN
    const w = s.width
    const h = (w * 3) / 4
    const t = 0.05 // bezel thickness
    const depth = 0.5
    const beige = new THREE.MeshStandardMaterial({ color: 0xd8cfb8, roughness: 0.6 })
    const dark = new THREE.MeshStandardMaterial({ color: 0x2b2a28, roughness: 0.8 })
    const group = new THREE.Group()
    group.position.set(s.x, s.y, s.z)
    group.rotation.set(s.rotX, s.rotY, 0, 'YXZ')

    const box = (sx, sy, sz, x, y, z, material) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material)
      mesh.position.set(x, y, z)
      mesh.castShadow = mesh.receiveShadow = true
      group.add(mesh)
    }

    // Bezel: four bars around the opening, sticking out 2 cm in front of the screen plane.
    box(w + 2 * t, t, 0.04, 0, h / 2 + t / 2, 0, beige)
    box(w + 2 * t, t, 0.04, 0, -h / 2 - t / 2, 0, beige)
    box(t, h, 0.04, -w / 2 - t / 2, 0, 0, beige)
    box(t, h, 0.04, w / 2 + t / 2, 0, 0, beige)
    // Casing behind. Its front face is 1 cm behind the screen plane, so it never z-fights with the hole.
    box(w + 2 * t, h + 2 * t, depth, 0, 0, -0.01 - depth / 2, beige)
    // Stand down to the desk (y = 0 in world space).
    const bottom = s.y - h / 2 - t
    box(0.25, bottom, 0.25, 0, -h / 2 - t - bottom / 2, -depth / 2, dark)
    // Keyboard on the desk in front.
    box(0.95, 0.06, 0.32, 0, -s.y + 0.03, 0.45, beige)
    box(0.85, 0.02, 0.22, 0, -s.y + 0.07, 0.43, dark)

    this.experience.scene.add(group)
    this.experience.screen.set(PLACEHOLDER_SCREEN)
  }

  setDebug(gui) {
    const folder = gui.addFolder('Model')
    folder.add(MODEL, 'rotationY', -Math.PI, Math.PI, 0.01).onChange(() => this.normalize())
    folder.add(MODEL, 'size', 0.5, 6, 0.01).onChange(() => this.normalize())
    folder.add(MODEL, 'screenFill', 0.5, 1.05, 0.005).name('screen fill').onChange(() => this.fitScreen())
    if (this.glass) folder.add(this.glass, 'visible').name('show glass mesh')
  }
}
