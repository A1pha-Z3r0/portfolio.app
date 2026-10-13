import { resolve } from 'node:path'
import { defineConfig } from 'vite'

// Two HTML entry points: the 3D scene at "/" and the inner OS at "/os/".
// The OS is a real standalone page; the 3D scene just shows it in an iframe.
export default defineConfig({
  build: {
    // three.js alone is ~660 kB minified (~170 kB gzipped); that's expected, not a problem.
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        os: resolve(import.meta.dirname, 'os/index.html'),
      },
    },
  },
})
