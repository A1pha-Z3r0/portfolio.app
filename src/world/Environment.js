import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

// Must match --bg in style.css so the desk edge fades into the page background.
const BG = 0x0d0c14

export default class Environment {
  constructor(experience) {
    const { scene, renderer } = experience

    scene.fog = new THREE.Fog(BG, 3.5, 8.5)

    // A procedural "room" environment map (ships with three, no asset needed)
    // gives the plastic and the glass something to reflect.
    const pmrem = new THREE.PMREMGenerator(renderer.instance)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environmentIntensity = 0.35
    pmrem.dispose()

    this.hemi = new THREE.HemisphereLight(0xb9b4ff, 0x2a1d14, 0.6)
    scene.add(this.hemi)

    // Warm "desk lamp" key light from the upper left, casting soft shadows onto the desk.
    this.key = new THREE.DirectionalLight(0xffe2c0, 2.2)
    this.key.position.set(-2.5, 4, 3)
    this.key.castShadow = true
    this.key.shadow.mapSize.set(2048, 2048)
    this.key.shadow.camera.left = -2
    this.key.shadow.camera.right = 2
    this.key.shadow.camera.top = 2
    this.key.shadow.camera.bottom = -2
    this.key.shadow.camera.near = 0.5
    this.key.shadow.camera.far = 12
    this.key.shadow.bias = -0.0005
    this.key.shadow.normalBias = 0.01
    scene.add(this.key)

    // Desk: a big plane at y = 0 (Computer.js sits the model exactly on it).
    this.desk = new THREE.Mesh(
      new THREE.CircleGeometry(14, 64),
      new THREE.MeshStandardMaterial({ color: 0x3a2a20, roughness: 0.85, metalness: 0 }),
    )
    this.desk.rotation.x = -Math.PI / 2
    this.desk.receiveShadow = true
    scene.add(this.desk)

    if (experience.gui) {
      const folder = experience.gui.addFolder('Environment').close()
      folder.add(this.key, 'intensity', 0, 6, 0.01).name('key light')
      folder.add(this.hemi, 'intensity', 0, 3, 0.01).name('hemi light')
      folder.add(scene, 'environmentIntensity', 0, 2, 0.01).name('env reflections')
      folder.addColor(this.desk.material, 'color').name('desk color')
    }
  }
}
