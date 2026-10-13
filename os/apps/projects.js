// PROJECTS: data-driven. Add, remove or reorder entries here; no markup to touch.
// `link` is optional (leave it out or set it to '' for no button).
// `claude: true` marks a project built with Claude (the About page's post-Claude filter).
export const PROJECTS = [
  {
    title: 'De Vault: a decentralized vault for medical data',
    blurb: 'Hackathon build: turns recorded doctor visits into de-identified, structured health events streamed only to the patient’s device.',
    tags: ['Whisper', 'Presidio', 'Ollama', 'Pydantic'],
    link: 'https://github.com/A1pha-Z3r0/De-Vault---Decentralized-Vault',
    claude: true,
  },
  {
    title: 'BioRAG: local PDF Q&A',
    blurb: 'A privacy-first RAG bot for dense research papers and coursework. Runs fully on your machine, no external APIs.',
    tags: ['Mistral 7B', 'FAISS', 'RAG'],
    link: 'https://github.com/A1pha-Z3r0/BioRAG',
  },
  {
    title: 'Bacterial infection detection in fruits',
    blurb: 'Two web apps that classify bacterial infections in apples, tomatoes and strawberries from microscopic or macroscopic images.',
    tags: ['VGG19 + ViT', 'Computer vision', 'FastAPI'],
    link: 'https://github.com/A1pha-Z3r0/FMD',
  },
  {
    title: 'This website',
    blurb: 'A 3D desk with a Commodore 64-style computer running a tiny web OS. Three.js, CSS3D and vanilla JS.',
    tags: ['Three.js', 'CSS3D', 'Vanilla JS'],
    link: 'https://github.com/your-username/your-site',
    claude: true,
  },
]

export default {
  id: 'projects',
  title: 'Projects',
  icon: 'projects',
  width: 640,
  height: 580,
  create() {
    const el = document.createElement('div')
    el.innerHTML = `<h1>PROJECTS</h1><p class="muted">${PROJECTS.length} ENTRIES FOUND.</p>`
    for (const p of PROJECTS) {
      const item = document.createElement('article')
      item.className = 'project'
      const h = document.createElement('h2')
      h.textContent = p.title
      const blurb = document.createElement('p')
      blurb.textContent = p.blurb
      const tags = document.createElement('div')
      for (const t of p.tags) {
        const tag = document.createElement('span')
        tag.className = 'tag'
        tag.textContent = t
        tags.append(tag)
      }
      item.append(h, blurb, tags)
      if (p.link) {
        const a = document.createElement('a')
        Object.assign(a, { href: p.link, target: '_blank', rel: 'noopener', textContent: 'OPEN →' })
        a.style.display = 'inline-block'
        a.style.marginTop = '8px'
        item.append(a)
      }
      el.append(item)
    }
    return el
  },
}
