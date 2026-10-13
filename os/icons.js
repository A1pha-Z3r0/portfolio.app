// Tiny pixel-art icons drawn from text grids, so there are no image files to license.
// Each character is one pixel; '.' is transparent.
const COLORS = {
  w: '#ffffff', l: '#8fb8ec', b: '#1f4fa8', k: '#000000',
  c: '#67b6bd', y: '#d5df7c', o: '#9a6a34', r: '#b86962', g: '#8ed67a',
}

const GRIDS = {
  about: [
    '....kkkk....',
    '...kwwwwk...',
    '..kwwwwwwk..',
    '..kwkwwkwk..',
    '..kwwwwwwk..',
    '..kwkkkkwk..',
    '...kwwwwk...',
    '....kkkk....',
    '..kccccccck.',
    '.kccccccccck',
    '.kcccccccccc',
    '.kkkkkkkkkkk',
  ],
  projects: [
    '............',
    '.kkkk.......',
    'kyyyyk......',
    'kyyyyykkkkk.',
    'kyyyyyyyyyyk',
    'koooooooooyk',
    'kyyyyyyyyyyk',
    'kyyyyyyyyyyk',
    'kyyyyyyyyyyk',
    'kyyyyyyyyyyk',
    '.kkkkkkkkkk.',
    '............',
  ],
  wordgame: [
    'kkkkkkkkkkkk',
    'kyyyyyyyyyyk',
    'kykyyyyyykyk',
    'kykyyyyyykyk',
    'kykyykkyykyk',
    'kykykyykykyk',
    'kykkyyyykkyk',
    'kykyyyyyykyk',
    'kyyyyyyyyyyk',
    'kyyyyyyyykyk',
    'kyyyyyyyyyyk',
    'kkkkkkkkkkkk',
  ],
  snake: [
    '............',
    '..gggggggk..',
    '.gg.....ggk.',
    '.gg......k..',
    '.ggk........',
    '..gggggggk..',
    '........ggk.',
    '.........gg.',
    '..r.....ggk.',
    '.rr.ggggggk.',
    '..r.kkkkkk..',
    '............',
  ],
  credits: [
    '.....yy.....',
    '.....yy.....',
    '....yyyy....',
    'yyyyyyyyyyyy',
    '.yyyywwyyyy.',
    '..yyyyyyyy..',
    '...yyyyyy...',
    '..yyyyyyyy..',
    '..yyy..yyy..',
    '.yyy....yyy.',
    '.yy......yy.',
    '............',
  ],
}

export function icon(name) {
  const grid = GRIDS[name]
  let rects = ''
  grid.forEach((row, y) => {
    ;[...row].forEach((ch, x) => {
      const fill = COLORS[ch]
      if (fill) rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${fill}"/>`
    })
  })
  return `<svg viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`
}
