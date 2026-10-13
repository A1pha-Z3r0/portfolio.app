import Experience from './world/Experience.js'

const params = new URLSearchParams(location.search)

// lil-gui is only downloaded when ?debug is in the URL (Vite splits dynamic imports into their own chunk).
const gui = params.has('debug') ? new (await import('lil-gui')).default({ title: 'Debug' }) : null
window.experience = new Experience({
  canvas: document.querySelector('#webgl'),
  cssRoot: document.querySelector('#css-root'),
  gui,
})
