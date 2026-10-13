import musicUrl from '../../assets/audio/music/lofi-jazz-coffee-shop.mp3'
import typingUrl from '../../assets/audio/sfx/keyboard-typing.wav'
import enterUrl from '../../assets/audio/sfx/typewriter-click.wav'
import mouseUrl from '../../assets/audio/sfx/mouse-click.wav'

// Sound files live in assets/audio/ (Vite bundles them). Set any of them to null and a
// synthesized stand-in is used instead (the hum and key click), or nothing at all.
export const SOUND_FILES = {
  music: musicUrl, // loops for as long as the page is open
  typing: typingUrl, // a recording of continuous typing, cut into single keystrokes on load
  enter: enterUrl, // the Enter key
  mouse: mouseUrl, // two clicks: the first plays on mouse-down, the second on mouse-up
  hum: null, // e.g. '/audio/crt-hum.mp3' (should loop cleanly)
}

const HUM_VOLUME = 0.05
// Every cut-out sound is evened out to this loudness (RMS of its loudest 5 ms), so
// no keystroke jumps out. Measured on the output, keys peak ~7 dB above the music's
// loudest moments.
const CLICK_LEVEL = { key: 0.18, enter: 0.2, mouse: 0.15 }
// One knob for all clicks and typing together, on top of CLICK_LEVEL (0.8 = 20% quieter).
const CLICK_VOLUME = 0.8
// The track is mastered loud (about -11 dB average), so 0.07 puts it near -34 dB:
// a quiet bed under the clicks and typing.
const MUSIC_VOLUME = 0.07

export default class Audio {
  constructor() {
    this.muted = false
    this.button = document.querySelector('#mute-toggle')
    this.button.addEventListener('click', () => this.setMuted(!this.muted))
  }

  // Browsers only allow audio after a user gesture: this runs on the "CLICK TO START" click.
  // Nothing is created before that, so nothing can play before it either.
  unlock() {
    if (this.ctx) return
    this.ctx = new AudioContext()
    this.master = this.ctx.createGain()
    this.master.connect(this.ctx.destination)
    this.setMuted(this.muted)
    this.createMusic()
    this.createHum()
    this.clickGain = this.ctx.createGain()
    this.clickGain.gain.value = CLICK_VOLUME
    this.clickGain.connect(this.master)
    this.loadClicks()
    this.noise = this.makeNoiseBuffer(0.05)
  }

  // Loaded after the start click, so these ~3 MB never hold up the loading bar.
  // Until they arrive (or if one fails), keys use the synth click.
  async loadClicks() {
    const load = async (url) => {
      const buffer = url && (await this.loadBuffer(url))
      return buffer ? findClicks(buffer) : []
    }
    const [keys, enter, mouse] = await Promise.all([load(SOUND_FILES.typing), load(SOUND_FILES.enter), load(SOUND_FILES.mouse)])
    this.clicks = { keys, enter: enter[0], mouseDown: mouse[0], mouseUp: mouse[1] }
  }

  setMuted(muted) {
    this.muted = muted
    this.button.textContent = muted ? 'SOUND: OFF' : 'SOUND: ON'
    this.button.setAttribute('aria-pressed', String(muted))
    if (this.master) this.master.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.05)
  }

  // Streamed through an <audio> element instead of decoded into a buffer like the
  // clicks: two minutes of decoded audio would be ~50 MB of memory.
  // (`document.createElement`, because `new Audio()` in this file means this class.)
  createMusic() {
    if (!SOUND_FILES.music) return
    this.music = document.createElement('audio')
    this.music.src = SOUND_FILES.music
    this.music.loop = true // starts over from the beginning every time it ends

    // Routed through the same master gain as everything else, so the mute button covers it.
    this.musicGain = this.ctx.createGain()
    this.musicGain.gain.value = 0
    this.ctx.createMediaElementSource(this.music).connect(this.musicGain).connect(this.master)
    this.music.play().catch((e) => console.warn('[Audio] Could not play music', e))
    this.musicGain.gain.setTargetAtTime(MUSIC_VOLUME, this.ctx.currentTime, 1) // ~3 s fade in
  }

  async createHum() {
    this.humGain = this.ctx.createGain()
    this.humGain.gain.value = 0
    this.humGain.connect(this.master)

    const buffer = SOUND_FILES.hum && (await this.loadBuffer(SOUND_FILES.hum))
    if (buffer) {
      const src = this.ctx.createBufferSource()
      src.buffer = buffer
      src.loop = true
      src.connect(this.humGain)
      src.start()
      return
    }
    // Synth hum: mains buzz (60/120 Hz) plus a faint flyback whine near 15.7 kHz,
    // the pitch real CRTs sing at.
    for (const [freq, level, type] of [
      [60, 0.5, 'sine'],
      [120, 0.25, 'triangle'],
      [15734, 0.02, 'sine'],
    ]) {
      const osc = this.ctx.createOscillator()
      const g = this.ctx.createGain()
      osc.type = type
      osc.frequency.value = freq
      g.gain.value = level
      osc.connect(g).connect(this.humGain)
      osc.start()
    }
  }

  setHum(on) {
    if (!this.humGain) return
    this.humGain.gain.setTargetAtTime(on ? HUM_VOLUME : 0, this.ctx.currentTime, 0.25)
  }

  keyClick(enter = false) {
    if (!this.ctx || this.muted) return
    const keys = this.clicks?.keys
    if (enter && this.clicks?.enter) return this.playClick(this.clicks.enter, CLICK_LEVEL.enter)
    if (keys?.length) {
      const key = keys[Math.floor(Math.random() * keys.length)]
      return this.playClick(key, CLICK_LEVEL.key, (Math.random() - 0.5) * 300)
    }
    // Synth click: a 40 ms burst of noise through a band-pass, with a fast decay.
    const t = this.ctx.currentTime
    const src = this.ctx.createBufferSource()
    const gain = this.ctx.createGain()
    src.buffer = this.noise
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 1800 + Math.random() * 1600
    filter.Q.value = 1.2
    gain.gain.setValueAtTime(0.35, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04)
    src.connect(filter).connect(gain).connect(this.clickGain)
    src.start(t)
  }

  mouseDown() {
    if (this.ctx && !this.muted && this.clicks?.mouseDown) this.playClick(this.clicks.mouseDown, CLICK_LEVEL.mouse)
  }

  mouseUp() {
    if (this.ctx && !this.muted && this.clicks?.mouseUp) this.playClick(this.clicks.mouseUp, CLICK_LEVEL.mouse)
  }

  // Plays one slice from findClicks, scaled to `level`, with a 20 ms fade at the end
  // so cutting it off mid-sound doesn't pop. `detune` (cents) varies the pitch.
  // The volume is capped so no sample goes past 0.6, leaving room for the music (no clipping).
  playClick({ buffer, offset, duration, peak, max }, level, detune = 0) {
    const t = this.ctx.currentTime
    const volume = Math.min(level / peak, 0.6 / max)
    const src = this.ctx.createBufferSource()
    const gain = this.ctx.createGain()
    src.buffer = buffer
    src.detune.value = detune
    gain.gain.setValueAtTime(volume, t)
    gain.gain.setValueAtTime(volume, t + duration - 0.02)
    gain.gain.linearRampToValueAtTime(0, t + duration)
    src.connect(gain).connect(this.clickGain)
    src.start(t, offset, duration)
  }

  makeNoiseBuffer(seconds) {
    const buffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * seconds), this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    return buffer
  }

  async loadBuffer(url) {
    try {
      const res = await fetch(url)
      return await this.ctx.decodeAudioData(await res.arrayBuffer())
    } catch (e) {
      console.warn(`[Audio] Could not load ${url}`, e)
      return null
    }
  }
}

// Cuts a recording into its separate clicks. It measures loudness in 5 ms windows;
// a window above 12% of the loudest one, after at least 40 ms of near-silence (under
// 3%), starts a new click. Each click lasts until the next one, at most 120 ms.
// Returns [{ buffer, offset, duration, peak, max }], ready for playClick.
const WINDOW = 0.005
function findClicks(buffer) {
  const data = buffer.getChannelData(0)
  const size = Math.round(buffer.sampleRate * WINDOW)
  const rms = [] // loudness of each window
  const max = [] // its largest sample
  for (let i = 0; i + size <= data.length; i += size) {
    let sum = 0
    let m = 0
    for (let j = i; j < i + size; j++) {
      sum += data[j] * data[j]
      m = Math.max(m, Math.abs(data[j]))
    }
    rms.push(Math.sqrt(sum / size))
    max.push(m)
  }
  const loudest = Math.max(...rms)

  const starts = []
  let quiet = 8 // a click right at the start of the file counts
  rms.forEach((r, i) => {
    if (r > loudest * 0.12 && quiet >= 8) starts.push(i)
    if (r > loudest * 0.12) quiet = 0
    else if (r < loudest * 0.03) quiet++
  })

  return starts.map((start, n) => {
    const end = Math.min(starts[n + 1] ?? rms.length, start + 24)
    return {
      buffer,
      offset: Math.max(0, start - 1) * WINDOW, // 5 ms early, to keep the attack
      duration: (end - start) * WINDOW,
      peak: Math.max(...rms.slice(start, end)),
      max: Math.max(...max.slice(Math.max(0, start - 1), end)),
    }
  })
}
