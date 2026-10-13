import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'

// One LoadingManager tracks everything (the model, its textures, and the OS
// iframe), so the progress bar only reaches 100% when it's all ready.
export default class Loader {
  constructor(experience) {
    this.experience = experience
    const root = document.querySelector('#loader')
    const fill = root.querySelector('.loader-fill')
    const status = root.querySelector('.loader-status')
    const button = root.querySelector('.loader-start')

    this.manager = new THREE.LoadingManager()
    this.manager.onProgress = (_url, loaded, total) => {
      const pct = Math.round((loaded / total) * 100)
      fill.style.width = `${pct}%`
      status.textContent = `LOADING ${pct}%`
    }
    // onLoad also fires after errors (a failed item still counts as "ended"),
    // which is what we want: Computer.js falls back to a placeholder.
    this.manager.onLoad = () => {
      fill.style.width = '100%'
      status.textContent = 'READY.'
      button.hidden = false
    }

    // The model is meshopt-compressed (see README), so GLTFLoader needs the decoder.
    // It ships with three, no extra dependency.
    this.gltf = new GLTFLoader(this.manager)
    this.gltf.setMeshoptDecoder(MeshoptDecoder)

    // The click is also the "user gesture" browsers require before audio can play.
    button.addEventListener('click', () => {
      root.classList.add('done')
      setTimeout(() => root.remove(), 800)
      experience.start()
    })
  }

  // Lets non-three things (the iframe) show up in the progress bar.
  track(name) {
    this.manager.itemStart(name)
    return () => this.manager.itemEnd(name)
  }
}
