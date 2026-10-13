// WORD GAME: Scrabble-lite. Make words from a 7-tile rack before the clock runs out.
import { WORDS } from './words.js'

// Standard English Scrabble tile counts and values (blanks left out).
const TILES = {
  A: [9, 1], B: [2, 3], C: [2, 3], D: [4, 2], E: [12, 1], F: [2, 4], G: [3, 2], H: [2, 4], I: [9, 1],
  J: [1, 8], K: [1, 5], L: [4, 1], M: [2, 3], N: [6, 1], O: [8, 1], P: [2, 3], Q: [1, 10], R: [6, 1],
  S: [4, 1], T: [6, 1], U: [4, 1], V: [2, 4], W: [2, 4], X: [1, 8], Y: [2, 4], Z: [1, 10],
}
const VOWELS = new Set('AEIOU')
const RACK_SIZE = 7
const ROUND_SECONDS = 60
const BINGO_BONUS = 50 // using all 7 tiles, like in Scrabble

let best = 0 // kept in memory for this visit

// Draw from a full bag, so letters come out with Scrabble's frequencies
// (lots of E's, one Q). Redraw until the rack has at least 2 vowels.
function drawRack() {
  const bag = Object.entries(TILES).flatMap(([letter, [count]]) => Array(count).fill(letter))
  let rack
  do {
    rack = []
    const pool = [...bag]
    for (let i = 0; i < RACK_SIZE; i++) rack.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0])
  } while (rack.filter((l) => VOWELS.has(l)).length < 2)
  return rack
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

const scoreWord = (word) =>
  [...word].reduce((sum, l) => sum + TILES[l][1], 0) + (word.length === RACK_SIZE ? BINGO_BONUS : 0)

// Which rack tiles does `word` use? Returns an array of rack indices, or null if impossible.
function tilesFor(word, rack) {
  const free = rack.map((_, i) => i)
  const used = []
  for (const l of word) {
    const k = free.findIndex((i) => rack[i] === l)
    if (k === -1) return null
    used.push(free.splice(k, 1)[0])
  }
  return used
}

export default {
  id: 'wordgame',
  title: 'Word Game',
  icon: 'wordgame',
  width: 620,
  height: 560,
  create(win) {
    const el = document.createElement('div')
    el.className = 'wordgame'
    el.innerHTML = `
      <div class="wg-stats">
        <span>SCORE <b class="wg-score">0</b></span>
        <span class="wg-time">TIME <b>${ROUND_SECONDS}</b></span>
        <span>BEST <b class="wg-best">${best}</b></span>
      </div>
      <div class="wg-rack" aria-label="Your tiles"></div>
      <input class="wg-input" maxlength="${RACK_SIZE}" autocomplete="off" spellcheck="false"
             aria-label="Type a word" placeholder="PRESS START" disabled />
      <p class="wg-message">Make words from your tiles. ENTER submits, SPACE shuffles.</p>
      <div class="wg-controls">
        <button class="btn" data-action="start">START</button>
        <button class="btn" data-action="shuffle">SHUFFLE</button>
        <button class="btn" data-action="rack">NEW RACK</button>
      </div>
      <div class="wg-words" aria-label="Words found"></div>`

    const q = (s) => el.querySelector(s)
    const input = q('.wg-input')
    const state = { rack: drawRack(), score: 0, found: new Set(), running: false, deadline: 0, timer: null }

    const say = (text, kind = '') => {
      q('.wg-message').textContent = text
      q('.wg-message').className = `wg-message ${kind}`
    }

    function renderRack() {
      const used = new Set(tilesFor(input.value.toUpperCase(), state.rack) ?? [])
      q('.wg-rack').replaceChildren(
        ...state.rack.map((letter, i) => {
          const tile = document.createElement('div')
          tile.className = `tile${used.has(i) ? ' used' : ''}`
          tile.innerHTML = `${letter}<sub>${TILES[letter][1]}</sub>`
          return tile
        }),
      )
    }

    function renderStats() {
      q('.wg-score').textContent = state.score
      q('.wg-best').textContent = best
      const left = state.running ? Math.max(0, Math.ceil((state.deadline - Date.now()) / 1000)) : ROUND_SECONDS
      q('.wg-time b').textContent = left
      q('.wg-time').classList.toggle('low', state.running && left <= 10)
    }

    function start() {
      Object.assign(state, { rack: drawRack(), score: 0, found: new Set(), running: true })
      state.deadline = Date.now() + ROUND_SECONDS * 1000
      q('.wg-words').replaceChildren()
      input.disabled = false
      input.value = ''
      input.placeholder = 'TYPE A WORD'
      input.focus()
      q('[data-action="start"]').textContent = 'RESTART'
      say('GO!', 'good')
      clearInterval(state.timer)
      // Time comes from a deadline, not from counting ticks, so it stays accurate
      // even if the browser throttles the interval.
      state.timer = setInterval(() => {
        renderStats()
        if (Date.now() >= state.deadline) end()
      }, 200)
      renderRack()
      renderStats()
    }

    function end() {
      clearInterval(state.timer)
      state.running = false
      input.disabled = true
      input.value = ''
      input.placeholder = 'PRESS START'
      const record = state.score > best
      best = Math.max(best, state.score)
      say(`TIME! ${state.score} POINTS${record ? ', NEW BEST!' : '.'}`, record ? 'good' : '')
      q('[data-action="start"]').textContent = 'PLAY AGAIN'
      renderRack()
      renderStats()
    }

    function submit() {
      const word = input.value.toUpperCase()
      if (word.length < 2) return say('Words need at least 2 letters.', 'bad')
      if (state.found.has(word)) return say(`Already played ${word}.`, 'bad')
      if (!WORDS.has(word.toLowerCase())) return say(`${word} isn't in my dictionary.`, 'bad')
      const points = scoreWord(word)
      state.found.add(word)
      state.score += points
      const item = document.createElement('span')
      item.textContent = `${word} ${points}`
      q('.wg-words').prepend(item)
      say(word.length === RACK_SIZE ? `BINGO! +${points}` : `+${points}`, 'good')
      input.value = ''
      renderRack()
      renderStats()
    }

    // Only allow letters that are actually on the rack (respecting counts).
    input.addEventListener('input', () => {
      const typed = input.value.toUpperCase().replace(/[^A-Z]/g, '')
      let ok = ''
      for (const l of typed) {
        if (tilesFor(ok + l, state.rack)) ok += l
        else say(`No ${l} left on your rack.`, 'bad')
      }
      input.value = ok
      renderRack()
    })
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit()
      if (e.key === ' ') {
        e.preventDefault()
        shuffle(state.rack)
        renderRack()
      }
    })

    q('[data-action="start"]').addEventListener('click', start)
    q('[data-action="shuffle"]').addEventListener('click', () => {
      shuffle(state.rack)
      renderRack()
      if (state.running) input.focus()
    })
    q('[data-action="rack"]').addEventListener('click', () => {
      state.rack = drawRack()
      input.value = ''
      renderRack()
      if (state.running) input.focus()
    })

    win.on('focus', () => state.running && input.focus())
    win.on('close', () => clearInterval(state.timer))

    renderRack()
    return el
  },
}
