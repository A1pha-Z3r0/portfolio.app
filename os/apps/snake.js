// SNAKE: canvas, arrow keys / WASD, speeds up as you grow, pauses when it loses focus.

const GRID = 20 // cells per side
const CELL = 18 // px per cell
const START_MS = 130 // time per step at the start
const MIN_MS = 60 // fastest it gets
const SPEEDUP_MS = 3 // faster by this much per food eaten

const COLORS = { bg: '#000000', grid: '#14213d', snake: '#8ed67a', head: '#d7ffcb', food: '#b86962', text: '#ffffff' }
const DIRS = {
  ArrowUp: [0, -1], w: [0, -1], W: [0, -1],
  ArrowDown: [0, 1], s: [0, 1], S: [0, 1],
  ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0],
  ArrowRight: [1, 0], d: [1, 0], D: [1, 0],
}

let best = 0 // kept in memory for this visit

export default {
  id: 'snake',
  title: 'Snake',
  icon: 'snake',
  width: 420,
  height: 520,
  create(win) {
    const el = document.createElement('div')
    el.className = 'snake'
    el.innerHTML = `
      <div class="snake-stats"><span>SCORE <b class="sn-score">0</b></span><span>BEST <b class="sn-best">${best}</b></span></div>
      <canvas width="${GRID * CELL}" height="${GRID * CELL}" aria-label="Snake game"></canvas>
      <p class="muted">ARROWS / WASD (OR SWIPE) · SPACE PAUSE</p>`
    const canvas = el.querySelector('canvas')
    const ctx = canvas.getContext('2d')

    let game
    function reset() {
      game = {
        snake: [
          { x: 8, y: 10 },
          { x: 7, y: 10 },
          { x: 6, y: 10 },
        ],
        dir: [1, 0],
        queue: [], // buffered turns, so two quick key presses in one step both count
        food: null,
        score: 0,
        state: 'ready', // ready | running | paused | over
        acc: 0,
      }
      game.food = placeFood()
      updateStats()
    }

    function placeFood() {
      const taken = new Set(game.snake.map((p) => `${p.x},${p.y}`))
      let spot
      do spot = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) }
      while (taken.has(`${spot.x},${spot.y}`))
      return spot
    }

    const stepMs = () => Math.max(MIN_MS, START_MS - game.score * SPEEDUP_MS)

    function step() {
      // Take the next buffered turn, ignoring 180° reversals (which would be instant death).
      while (game.queue.length) {
        const next = game.queue.shift()
        if (next[0] !== -game.dir[0] || next[1] !== -game.dir[1]) {
          game.dir = next
          break
        }
      }
      const head = { x: game.snake[0].x + game.dir[0], y: game.snake[0].y + game.dir[1] }
      const hitWall = head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID
      // The tail moves away this step, so it's fine to move into its current cell.
      const hitSelf = game.snake.slice(0, -1).some((p) => p.x === head.x && p.y === head.y)
      if (hitWall || hitSelf) {
        game.state = 'over'
        best = Math.max(best, game.score)
        updateStats()
        return
      }
      game.snake.unshift(head)
      if (head.x === game.food.x && head.y === game.food.y) {
        game.score++
        game.food = placeFood()
        updateStats()
      } else {
        game.snake.pop()
      }
    }

    function draw() {
      ctx.fillStyle = COLORS.bg
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = COLORS.grid
      for (let i = 1; i < GRID; i++) {
        ctx.fillRect(i * CELL, 0, 1, canvas.height)
        ctx.fillRect(0, i * CELL, canvas.width, 1)
      }
      ctx.fillStyle = COLORS.food
      ctx.fillRect(game.food.x * CELL + 3, game.food.y * CELL + 3, CELL - 6, CELL - 6)
      game.snake.forEach((p, i) => {
        ctx.fillStyle = i === 0 ? COLORS.head : COLORS.snake
        ctx.fillRect(p.x * CELL + 1, p.y * CELL + 1, CELL - 2, CELL - 2)
      })

      const message = {
        ready: ['SNAKE', 'PRESS SPACE OR AN ARROW'],
        paused: ['PAUSED', 'PRESS SPACE TO RESUME'],
        over: ['GAME OVER', `SCORE ${game.score} · SPACE TO RETRY`],
      }[game.state]
      if (message) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)'
        ctx.fillRect(0, canvas.height / 2 - 50, canvas.width, 100)
        ctx.fillStyle = COLORS.text
        ctx.textAlign = 'center'
        ctx.font = '40px VT323, monospace'
        ctx.fillText(message[0], canvas.width / 2, canvas.height / 2 - 6)
        ctx.font = '22px VT323, monospace'
        ctx.fillText(message[1], canvas.width / 2, canvas.height / 2 + 26)
      }
    }

    function updateStats() {
      el.querySelector('.sn-score').textContent = game.score
      el.querySelector('.sn-best').textContent = best
    }

    const pause = () => {
      if (game.state === 'running') game.state = 'paused'
    }

    // Fixed-timestep loop: rAF gives us time, and we step the game every stepMs().
    let last = performance.now()
    let frame = requestAnimationFrame(function loop(now) {
      const dt = Math.min(now - last, 250)
      last = now
      if (game.state === 'running') {
        game.acc += dt
        while (game.acc >= stepMs() && game.state === 'running') {
          game.acc -= stepMs()
          step()
        }
      }
      draw()
      frame = requestAnimationFrame(loop)
    })

    function onKey(e) {
      if (!win.focused || win.minimized) return
      const dir = DIRS[e.key]
      if (dir || e.key === ' ') e.preventDefault() // don't scroll the page
      if (e.key === ' ' || e.key === 'p' || e.key === 'P') {
        if (game.state === 'over') reset()
        game.state = game.state === 'running' ? 'paused' : 'running'
        return
      }
      if (!dir) return
      if (game.state === 'over') reset()
      if (game.state !== 'running') game.state = 'running'
      if (game.queue.length < 3) game.queue.push(dir)
    }
    addEventListener('keydown', onKey)

    // Touch: swipe on the board to turn, tap to pause/resume.
    let swipe = null
    canvas.addEventListener('pointerdown', (e) => (swipe = { x: e.clientX, y: e.clientY }))
    canvas.addEventListener('pointerup', (e) => {
      if (!swipe) return
      const dx = e.clientX - swipe.x
      const dy = e.clientY - swipe.y
      swipe = null
      if (Math.hypot(dx, dy) < 20) return onKey({ key: ' ', preventDefault() {} })
      const key = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft') : dy > 0 ? 'ArrowDown' : 'ArrowUp'
      onKey({ key, preventDefault() {} })
    })

    // Pause whenever the game stops being the thing you're looking at: another OS
    // window takes focus, it's minimized, the camera zooms out (the 3D page blurs
    // the iframe), or the tab is hidden.
    win.on('blur', pause)
    win.on('minimize', pause)
    addEventListener('blur', pause)
    document.addEventListener('visibilitychange', pause)

    win.on('close', () => {
      cancelAnimationFrame(frame)
      removeEventListener('keydown', onKey)
      removeEventListener('blur', pause)
      document.removeEventListener('visibilitychange', pause)
    })

    reset()
    return el
  },
}
