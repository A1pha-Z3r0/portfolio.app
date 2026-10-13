// CREDITS

const link = (href, text) => `<a href="${href}" target="_blank" rel="noopener">${text}</a>`

const HTML = `
  <h1>CREDITS</h1>
  <dl class="credits">
    <dt>DESIGN &amp; CODE</dt>
    <dd>Jonathan</dd>

    <dt>ORIGINAL AUTHOR &amp; INSPIRATION</dt>
    <dd>
      Henry Heffernan: ${link('https://henryheffernan.com', 'henryheffernan.com')}
      <small>
        This site is adapted from his
        ${link('https://github.com/henryjeff/portfolio-website', 'portfolio-website')} (MIT License)
        and ${link('https://github.com/henryjeff/portfolio-inner-site', 'portfolio-inner-site')}
        (used with his permission). The CSS3D + WebGL "hole punch" technique, the screen
        layers, the camera ideas and the window-manager behaviour all come from his work.
      </small>
    </dd>

    <dt>3D MODEL</dt>
    <dd>
      "${link('https://sketchfab.com/3d-models/commodore-64-computer-full-pack-1f43612fa2d54041bbe2bdff8164c2cd', 'Commodore 64 || Computer (Full Pack)')}"
      by ${link('https://sketchfab.com/dark_igorek', 'dark_igorek')}
      <small>
        Licensed under ${link('http://creativecommons.org/licenses/by/4.0/', 'CC-BY-4.0')}.
        Modified: textures resized and recompressed, geometry compressed.
      </small>
    </dd>

    <dt>FONT</dt>
    <dd>
      VT323 by Peter Hull
      <small>${link('https://openfontlicense.org', 'SIL Open Font License 1.1')}</small>
    </dd>

    <dt>MUSIC</dt>
    <dd>
      "Lofi Jazz Retro Coffee Shop" by Alex Morgan
    </dd>

    <dt>SOUND EFFECTS</dt>
    <dd>
      Keyboard typing, typewriter click and mouse click from ${link('https://mixkit.co', 'Mixkit')}
    </dd>

    <dt>BUILT WITH</dt>
    <dd>
      ${link('https://threejs.org', 'three.js')} · ${link('https://lil-gui.georgealways.com', 'lil-gui')} ·
      ${link('https://vite.dev', 'Vite')}
      <small>All MIT licensed. The CRT hum is synthesized in the browser.</small>
    </dd>
  </dl>
`

export default {
  id: 'credits',
  title: 'Credits',
  icon: 'credits',
  width: 600,
  height: 560,
  create() {
    const el = document.createElement('div')
    el.innerHTML = HTML
    return el
  },
}
