# Jonathan: 3D retro-computer portfolio

A Commodore 64-style computer on a desk (Three.js). Its monitor shows a live web
page, **JONATHAN OS** (`/os/`), with About / Projects / Credits and two games.
The OS is only reachable through the 3D scene: opening `/os/` directly redirects to `/`.
Adapted from [Henry Heffernan's portfolio](https://henryheffernan.com).

```bash
npm install
npm run dev       # http://localhost:5173   (add ?debug for sliders)
npm run build     # static site in dist/ (both pages)
npm run preview   # serve dist/ locally
```

## Where to edit things

| What | File |
| --- | --- |
| About page: name, tagline, intro, sections (origin, experience, education, writings), links | the constants at the top of `os/apps/about.js` (CV is at `public/resume/Resume.pdf`) |
| Papers / PDFs linked from the site | `public/papers/` |
| About portrait photo | `PORTRAIT` in `os/apps/about.js` (photo in `public/images/`; drawn in A/C/G/T letters by `os/apps/dna-portrait.js`) |
| Projects (Projects app + the About page's sticky notes) | the `PROJECTS` array in `os/apps/projects.js` (`claude: true` = built with Claude) |
| The pre/post-Claude switch (spring physics, googly eyes) | `os/apps/era-switch.js` |
| Credits | `os/apps/credits.js` |
| Boot text | `BOOT_LINES` in `os/os.js` |
| Colors / fonts / window look | the variables at the top of `os/os.css` |
| Screen placement | `SCREEN` / `MODEL_SCREEN` in `src/world/Screen.js` |
| Model path, size, rotation | `MODEL` in `src/world/Computer.js` |
| Sounds, music + volumes | `SOUND_FILES` / `MUSIC_VOLUME` in `src/world/Audio.js` |

## How it works (short version)

- `src/world/Renderer.js`: a transparent `WebGLRenderer` sits on top of a
  `CSS3DRenderer`. The iframe (`/os/`) lives in the CSS3D layer.
- `src/world/Screen.js`: an invisible plane using `NoBlending` "punches a hole" in the
  WebGL canvas where the glass is, so the iframe shows through, and still
  depth-tests, so things in front of the screen hide it. Canvas-painted glare,
  inner-shadow and dimmer layers sit on top.
- `src/world/Camera.js`: named views (`intro`, `desk`, `monitor`), all computed
  from the screen's position/normal/size, with frame-rate-independent easing.
- The OS forwards `pointerdown/up` and `keydown` to the parent with `postMessage`
  (key click sounds; "don't zoom out mid-drag").

## Tuning the screen

The screen auto-fits to the model's glass mesh (material `monitor_screen`).
To adjust by hand: open `/?debug`, use the **Screen** sliders, click **log values**,
and paste the printed JSON into `MODEL_SCREEN` in `src/world/Screen.js`.
With `?debug` the console also prints a table of all mesh names.

## The 3D model

"Commodore 64 || Computer (Full Pack)" by dark_igorek, CC-BY-4.0 (credited in the
Credits app and LICENSE.md). The original download is ~100 MB (4K PNG textures),
so `public/models/c64/scene.glb` is a compressed copy (~4 MB), made with:

```bash
npx @gltf-transform/cli optimize commodore_64__computer_full_pack/scene.gltf \
  public/models/c64/scene.glb \
  --texture-compress webp --texture-size 2048 --compress meshopt \
  --flatten false --join false --palette false --simplify false --instance false
```

The `false` flags keep meshes and materials separate, so the glass mesh can still be
found by name. Meshopt needs a decoder, already wired up in `src/world/Loader.js`
(`MeshoptDecoder` ships with three). Use `--texture-size 1024` for ~2.4 MB.
If the model fails to load, a box placeholder monitor is shown instead.

## Word list

`os/apps/words.js` (~7.6k words) is generated from `scripts/wordlist-base.txt`,
checked against, and expanded with inflections from, the public-domain
[ENABLE](https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt) list:

```bash
curl -LO https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt
node scripts/make-wordlist.mjs scripts/wordlist-base.txt --dict enable1.txt
```

**Bigger list:** `node scripts/make-wordlist.mjs enable1.txt` uses all of ENABLE
(~52k words of 2–7 letters, ~125 kB gzipped). Any whitespace-separated word
file works.

## Sounds

Background music (`assets/audio/music/lofi-jazz-coffee-shop.mp3`, "Lofi Jazz Retro Coffee Shop" by Alex Morgan) starts
on the start click, fades in over ~3 s and loops forever at `MUSIC_VOLUME` (0.07, well
under the clicks and typing). The mute button silences it along with everything else.

Clicks and typing come from the Mixkit files in `assets/audio/sfx/` (listed in `SOUND_FILES`):

- Typing: the 10 s typing recording is cut into its ~46 separate keystrokes when it
  loads (`findClicks` in `src/world/Audio.js`). Each key press plays a random one,
  slightly re-pitched, so it never sounds like a loop.
- Enter plays the typewriter click.
- Mouse: the click file holds a press and a release; they play on mouse-down and
  mouse-up, only for clicks on the monitor (the OS forwards them, see `Screen.js`).
- Every slice is evened out to the same loudness (`CLICK_LEVEL`), well above the music.
  `CLICK_VOLUME` (0.8) turns all clicks and typing up or down together.

The CRT hum is synthesized with Web Audio. Nothing plays before the start click.

## Small screens

There is no non-3D fallback: every screen size gets the 3D scene.

## Credits & license

MIT, see `LICENSE.md` (Henry Heffernan's original notice + mine). Third-party
assets (model, VT323 font, music, sound effects) keep their own licenses.
