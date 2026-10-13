import * as THREE from 'three'
import { CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js'

// Two renderers drawing the same camera view, stacked:
//   bottom: CSS3DRenderer  -> real DOM (the iframe), transformed with CSS matrix3d()
//   top:    WebGLRenderer  -> the 3D scene, on a transparent canvas
// Where WebGL draws nothing (or draws the "hole" in Screen.js) you see the DOM below.
export default class Renderer {
  constructor(experience) {
    this.experience = experience
    const { sizes } = experience

    // alpha: true gives the canvas a transparent background, so the CSS layer and
    // the page gradient show through anywhere we don't draw.
    this.instance = new THREE.WebGLRenderer({
      canvas: experience.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    this.instance.setClearColor(0x000000, 0)
    this.instance.toneMapping = THREE.ACESFilmicToneMapping
    this.instance.toneMappingExposure = 1.0
    this.instance.shadowMap.enabled = true
    this.instance.shadowMap.type = THREE.PCFShadowMap
    this.instance.localClippingEnabled = true // per-material clipping planes (Computer.hideLooseCables)

    this.css = new CSS3DRenderer()
    experience.cssRoot.appendChild(this.css.domElement)

    this.resize()

    if (experience.gui) {
      const folder = experience.gui.addFolder('Renderer').close()
      folder.add(this.instance, 'toneMappingExposure', 0.2, 3, 0.01).name('exposure')
    }
  }

  resize() {
    const { width, height, pixelRatio } = this.experience.sizes
    this.instance.setSize(width, height)
    this.instance.setPixelRatio(pixelRatio)
    this.css.setSize(width, height)
  }

  render() {
    const { scene, cssScene, camera } = this.experience
    this.instance.render(scene, camera.instance)
    this.css.render(cssScene, camera.instance)
  }
}
