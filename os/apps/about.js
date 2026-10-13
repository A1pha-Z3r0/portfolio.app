// ABOUT: a profile page drawn inside the About window (maximize it for the full
// effect). Edit the text in the arrays below; the text
// fields are plain HTML inside template strings (write &amp; for "&", and don't
// use backticks inside them).
import { dnaPortrait } from './dna-portrait.js'
import { PROJECTS } from './projects.js'
import { eraSwitch } from './era-switch.js'

// Your photo, drawn in DNA letters behind your name. It needs the background
// removed (bright pixels become bright letters), so make it with:
//   swift scripts/cutout-portrait.swift <your photo> public/images/portrait.png
// null = placeholder silhouette.
const PORTRAIT = '/images/portrait.png'

const NAME = 'JONATHAN'
const TAGLINE = 'ML ENGINEERING INTERN @ NEB · AI × BIOLOGY'

// The short "about me" right under the hero, before the index.
const INTRO = {
  quote: 'A jack of all trades is a master of none, but oftentimes better than a master of one.',
  text: `
    I don’t know who said it, but I try to live up to it. I want to be a jack of all
    trades: from studying biology, to teaching myself programming, to building small
    proofs of concept on Arduinos (like an asset management system), to computer vision
    for microbial detection in fruits, to interpretability research, to stability
    prediction today. I’ve followed wherever my curiosity took me. But now I decided a place to stay,
    AI × Biology, because the biggest and most important dataset we have is biology itself.`,
}

// The page's sections, in order. Each one gets a row in the profile.sys index
// (`status` is its [ OK ] mark: 'ok' | 'warn' | 'busy'; `note` is the right-hand
// column, placeholder for now). Long `text` is cut short with a "continue reading".
// Optional on any section: `meta`, `text`, `tags`, `image` (+ `caption`).
// Special kinds: `entries` (jobs, schools), `projects`, `writings`, `links`.
const SECTIONS = [
  {
    id: 'origin',
    title: 'Origin',
    status: 'ok',
    note: 'tbd',
    text: `
      In 7th grade, a friend showed me a basic calculator they’d written in C++. My reaction:
      what’s the point of programming if all it does is add and subtract numbers? We
      already have calculators. Fast forward 5–7 years: in an undergrad entrepreneurship
      class, my friends built the world’s shittiest UI for a pill dispensary (basically a
      PDF that turned pages when you clicked buttons). I thought, I could do a better job
      than this. So I started learning Python and Tkinter, and tinkered together an app
      where you could select medications, go to a checkout, and get a generated bill.
      That’s how I got hooked on coding, and from there all hell broke loose.`,
    // Earlier draft, kept for reference:
    // I started out in biotech as a research intern at Caplin Point Laboratories. I learned
    // a lot about drug equivalence, ADMET testing, and the humans behind it. But my most
    // satisfying moment was the technology around the lab and how people interacted with
    // it, especially scientists. I believe technology in the right hands yields far greater
    // output than technology in just any hands. I want each one of us to use tech in ways
    // that directly impact the people around us. This was also when I took my first
    // introductory Python class in undergrad.
  },
  {
    id: 'experience',
    title: 'Experience',
    status: 'ok',
    note: 'tbd',
    entries: [
      {
        role: 'Machine Learning Engineering Intern',
        org: 'New England Biolabs (NEB)',
        place: 'Boston (on-site)',
        text: `
          I’ve been at NEB for 7 months. An amazing team and company gave me the chance to
          work on protein engineering and stability prediction: improving existing stability
          prediction systems, working on real projects, and collaborating with scientists.
          They gave me immense freedom and mentorship, which led me to build a protein
          engineering suite from scratch.`,
        tags: ['protein engineering', 'stability prediction'],
      },
      {
        role: 'Artificial Intelligence Researcher (Interpretability)',
        org: 'Algoverse',
        place: 'California (remote)',
        text: `
          I led the team from formulating the research idea, to implementing it, to getting
          the data to understand how models think purely from their internal circuits. We
          wanted to prune good thoughts from bad ones using attribution patching. Shout out
          to my mentor <a href="https://www.linkedin.com/in/alanwsun/" target="_blank" rel="noopener">Alan Sun</a>,
          whose work laid the foundation for ours.`,
        // To add once the link is found: we had initial results but it eventually died
        // down; some folks at FB later published the same findings (and beat us to it).
        tags: ['interpretability', 'circuits', 'attribution patching'],
        links: [
          { label: 'READ THE PROPOSAL (PDF)', href: '/papers/circuit-stability-proposal.pdf' },
          { label: 'CODE (GITHUB)', href: 'https://github.com/A1pha-Z3r0/Algoverse_AI_Research' },
        ],
      },
    ],
  },
  {
    id: 'projects',
    title: 'Projects',
    status: 'busy',
    note: 'tbd',
    projects: true, // the sticky-note slider, filled from PROJECTS in projects.js
  },
  {
    id: 'education',
    title: 'Education',
    status: 'ok',
    note: 'tbd',
    entries: [
      { role: 'MS Bioinformatics', org: 'Northeastern University', place: 'Boston, MA', when: '2024–2026' },
      { role: 'B.Tech Biotechnology', org: 'Vellore Institute of Technology (VIT)', place: 'Vellore, TN', when: '2020–2024' },
    ],
    compact: true, // two short lines per entry
  },
  {
    id: 'writings',
    title: 'Writings',
    status: 'busy',
    note: 'tbd',
    writings: true, // filled from WRITINGS below
  },
  {
    id: 'contact',
    title: 'Contact',
    status: 'ok',
    note: 'tbd',
    meta: 'LINKS · EMAIL · CV',
    links: true, // shows the LINKS buttons
  },
]

// Your writing. Newest first. `link` and `date` are optional.
// e.g. { title: 'Why biology is the biggest dataset', date: '2026-10', blurb: '...', link: 'https://...' }
const WRITINGS = []

const LINKS = [
  { label: 'GITHUB', href: 'https://github.com/A1pha-Z3r0' },
  { label: 'EMAIL', href: 'mailto:jonathanallwinraj@gmail.com' },
  { label: 'CV (PDF)', href: '/cv.pdf' }, // put your CV at public/cv.pdf
]

const pad = (n) => String(n).padStart(2, '0')
const MARK = { ok: 'OK', warn: '!!', busy: '..' }

// Long text is clamped; "continue reading" shows up only if it actually overflows.
const prose = (text) =>
  `<div class="about-more"><p class="about-text">${text}</p><button class="about-more-btn" hidden>continue reading ▾</button></div>`

const tags = (list) => (list ? `<p class="about-tags">${list.map((t) => `<span>${t}</span>`).join('')}</p>` : '')

function entries(s) {
  if (s.compact) {
    return `<ul class="about-compact">${s.entries
      .map((e) => `<li><p><b>${e.role}</b><span class="about-dim">${e.when}</span></p><p class="about-dim">${e.org}, ${e.place}</p></li>`)
      .join('')}</ul>`
  }
  return s.entries
    .map(
      (e) => `
        <article class="about-entry">
          <h3 class="about-role">${e.role}</h3>
          <p class="about-meta">${e.org} · ${e.place}${e.when ? ` · ${e.when}` : ''}</p>
          ${e.text ? prose(e.text) : ''}
          ${tags(e.tags)}
          ${e.links ? `<p class="about-links">${e.links.map((l) => `<a class="about-link" href="${l.href}" target="_blank" rel="noopener">${l.label}</a>`).join('')}</p>` : ''}
        </article>`,
    )
    .join('')
}

// The spark on projects built with Claude (drawn in the page's amber).
const claudeMark = (cls) => `<svg class="${cls}" viewBox="0 0 24 24" role="img" aria-label="Built with Claude"><title>Built with Claude</title><path d="M12.0 9.0L12.0 2.0M13.5 9.4L16.0 5.1M14.6 10.5L20.7 7.0M15.0 12.0L19.0 12.0M14.6 13.5L19.8 16.5M13.5 14.6L16.0 18.9M12.0 15.0L12.0 22.0M10.5 14.6L8.5 18.1M9.4 13.5L4.2 16.5M9.0 12.0L4.0 12.0M9.4 10.5L3.3 7.0M10.5 9.4L8.5 5.9" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/></svg>`

function notes() {
  const items = PROJECTS.map((p) => {
    const era = p.claude ? 'post' : 'pre'
    const inner = `${p.claude ? claudeMark('about-note-claude') : ''}<span class="about-note-title">${p.title}</span><span class="about-note-blurb">${p.blurb}</span><span class="about-note-tags">${p.tags.join(' · ')}</span>`
    return p.link
      ? `<a class="about-note" data-era="${era}" href="${p.link}" target="_blank" rel="noopener">${inner}<span class="about-note-open">open →</span></a>`
      : `<div class="about-note" data-era="${era}">${inner}</div>`
  }).join('')
  // The pre/post-Claude switch is built in create() (see era-switch.js).
  return `
    <div class="about-era"></div>
    <div class="about-slider">
      <button class="about-slide" data-slide="-1" aria-label="Previous project">◀</button>
      <div class="about-notes">${items}</div>
      <button class="about-slide" data-slide="1" aria-label="Next project">▶</button>
    </div>`
}

function writings() {
  if (!WRITINGS.length) return '<p class="about-text about-dim">First piece in progress.</p>'
  return `<ul class="about-writings">${WRITINGS.map((w) => {
    const title = w.link ? `<a href="${w.link}" target="_blank" rel="noopener">${w.title}</a>` : w.title
    return `<li><p class="about-writing-title">${title}${w.date ? ` <span class="about-dim">${w.date}</span>` : ''}</p>${w.blurb ? prose(w.blurb) : ''}</li>`
  }).join('')}</ul>`
}

function html() {
  // The hero's menu: a column on the left, one row per section.
  const menu = SECTIONS.map(
    (s, i) => `<button data-goto="${s.id}"><span class="about-num">${pad(i + 1)}</span> ${s.title}</button>`,
  ).join('')

  const index = SECTIONS.map(
    (s, i) =>
      `<li class="${s.status}"><button data-goto="${s.id}"><span class="about-mark">[ ${MARK[s.status]} ]</span> <span class="about-dots"><span class="about-index-link">${pad(i + 1)} ${s.title.toLowerCase()}</span></span> <span>${s.note}</span></button></li>`,
  ).join('')

  const sections = SECTIONS.map(
    (s, i) => `
      <section class="about-section" data-section="${s.id}">
        <p class="about-crumbline"><span class="about-num">${pad(i + 1)}</span></p>
        <h2 class="about-headline">${s.title}</h2>
        ${s.meta ? `<p class="about-meta">${s.meta}</p>` : ''}
        ${s.text ? prose(s.text) : ''}
        ${s.image ? `<figure class="about-photo"><img src="${s.image}" alt="${s.caption ?? ''}">${s.caption ? `<figcaption>${s.caption}</figcaption>` : ''}</figure>` : ''}
        ${tags(s.tags)}
        ${s.entries ? entries(s) : ''}
        ${s.projects ? notes() : ''}
        ${s.writings ? writings() : ''}
        ${s.links ? '<p class="about-links"></p>' : ''}
      </section>`,
  ).join('')

  return `
    <header class="about-bar">
      <span><span class="about-dim">~/desktop /</span> about.txt</span>
      <span class="about-dim">${SECTIONS.length} sections</span>
    </header>
    <div class="about-scroll">
      <div class="about-hero">
        <canvas class="about-portrait" aria-hidden="true"></canvas>
        <nav class="about-menu">${menu}</nav>
        <div class="about-title">
          <p class="about-tagline">${TAGLINE}</p>
          <h1 class="about-name">${NAME}</h1>
        </div>
      </div>
      <section class="about-section about-intro">
        <blockquote class="about-quote">“${INTRO.quote}”</blockquote>
        ${prose(INTRO.text)}
      </section>
      <section class="about-section">
        <p class="about-crumbline">profile.sys</p>
        <ul class="about-status">${index}</ul>
      </section>
      ${sections}
    </div>`
}

export default {
  id: 'about',
  title: 'About',
  icon: 'about',
  width: 760,
  height: 620,
  create(win) {
    win.body.classList.add('flush') // the page fills the window edge to edge
    const el = document.createElement('div')
    el.className = 'about'
    el.innerHTML = html()

    const links = el.querySelector('.about-section > .about-links')
    for (const { label, href } of LINKS) {
      const a = document.createElement('a')
      a.className = 'about-link'
      a.href = href
      a.textContent = label
      // Links open in a new tab, so visitors don't lose the 3D scene.
      if (!href.startsWith('mailto:')) Object.assign(a, { target: '_blank', rel: 'noopener' })
      links?.append(a)
    }

    const scroller = el.querySelector('.about-scroll')
    el.addEventListener('click', (e) => {
      const goto = e.target.closest('[data-goto]')
      if (goto) {
        const target = el.querySelector(`[data-section="${goto.dataset.goto}"]`)
        scroller.scrollTo({ top: target.offsetTop, behavior: 'smooth' })
      }
      const slide = e.target.closest('[data-slide]')
      if (slide) {
        const track = slide.parentElement.querySelector('.about-notes')
        const step = track.querySelector('.about-note')?.offsetWidth ?? track.clientWidth
        track.scrollBy({ left: slide.dataset.slide * (step + 16), behavior: 'smooth' })
      }
      const more = e.target.closest('.about-more-btn')
      if (more) {
        const open = more.parentElement.classList.toggle('open')
        more.textContent = open ? 'show less ▴' : 'continue reading ▾'
      }
    })

    // Projects filter. Filtered-in notes deal back in, one after another.
    const notes = [...el.querySelectorAll('.about-note')]
    const counts = { all: notes.length, pre: 0, post: 0 }
    for (const n of notes) counts[n.dataset.era]++
    const era = eraSwitch(el.querySelector('.about-era'), {
      mark: claudeMark('era-spark'),
      counts,
      onChange(pick) {
        el.querySelector('.about-notes').scrollTo({ left: 0, behavior: 'smooth' })
        const motion = !matchMedia('(prefers-reduced-motion: reduce)').matches
        let i = 0
        for (const n of notes) {
          n.hidden = pick !== 'all' && n.dataset.era !== pick
          if (n.hidden || !motion) continue
          // `translate`/`scale`, not `transform`, so each note keeps its CSS tilt.
          n.animate(
            [
              { opacity: 0, translate: '0 18px', scale: '0.9' },
              { opacity: 1, translate: '0 0', scale: '1' },
            ],
            { duration: 420, delay: i++ * 70, easing: 'cubic-bezier(.2, .9, .3, 1.25)', fill: 'backwards' },
          )
        }
      },
    })

    // Show "continue reading" only where the clamped text overflows. Re-checked on
    // resize, since maximizing the window changes how much fits.
    const checkClamps = () => {
      for (const box of el.querySelectorAll('.about-more:not(.open)')) {
        const p = box.firstElementChild
        box.lastElementChild.hidden = p.scrollHeight <= p.clientHeight + 1
      }
    }
    const resize = new ResizeObserver(checkClamps)
    resize.observe(scroller)

    // Start the portrait once the element is on the page (it needs its size).
    requestAnimationFrame(() => {
      const portrait = dnaPortrait(el.querySelector('.about-portrait'), { src: PORTRAIT })
      win.on('close', () => (portrait.stop(), resize.disconnect(), era.destroy()))
    })
    return el
  },
}
