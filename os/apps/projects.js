// PROJECTS: data-driven. Add, remove or reorder entries here; no markup to touch.
// The About page's sticky notes read `title`, `blurb`, `tags` and `claude`, so keep those short.
// Everything else feeds the detail view and is optional:
//   status    a short badge, e.g. 'IN DEVELOPMENT'
//   meta      one line: team, size, dates
//   summary   the problem, a paragraph
//   stack     list of strings
//   how       the pipeline, as ordered steps
//   decisions [{ title, text }] design choices worth explaining
//   results   list of strings (real numbers only)
//   next      what's planned
//   links     [{ label, href }]; `link` alone still works for a single GitHub button
// `claude: true` marks a project built with Claude (the About page's post-Claude filter).
export const PROJECTS = [
  {
    title: 'Algoverse: Tree of Thoughts, read from the inside',
    blurb: 'Research prototype: judge Tree-of-Thoughts reasoning branches by the stability of their internal circuits, not by asking the model to grade itself.',
    tags: ['Interpretability', 'EAP-IG', 'Tree of Thoughts'],
    status: 'RESEARCH · IN DEVELOPMENT',
    meta: 'Research team of 6+ · 40 of 62 commits mine · May 2025 – present',
    summary: 'Tree of Thoughts searches over reasoning steps, and at each step something must decide which branches are worth continuing. Usually the model grades its own thoughts, which is circular: the model that may be reasoning badly is also the judge. This project asks whether the shape of a thought’s internal circuit can serve as an independent signal of whether that step is stable.',
    stack: ['Python', 'PyTorch', 'EAP-IG circuit discovery', 'GPT-2', 'Llama-3.2-3B-Instruct'],
    how: [
      'Breadth-first Tree-of-Thoughts search proposes candidate thoughts and logs them as a JSON tree.',
      'For each thought, EAP-IG (Edge Attribution Patching with Integrated Gradients) runs with a KL-divergence metric and 5 integration steps, keeping the top 200 edges.',
      'Each run produces a circuit as JSON plus a rendered graph.',
      'Analysis computes the skewness of the edge-score distribution as a candidate stability signal.',
    ],
    decisions: [
      { title: 'A fixed corrupted baseline', text: 'Attribution patching compares a clean prompt against a corrupted one. Every thought is paired with the same deliberately malformed Game-of-24 prompt, so differences between circuits reflect the thought rather than a shifting baseline.' },
      { title: 'Tasks with checkable steps', text: 'Game of 24 and GSM8K were chosen because intermediate steps can be verified independently, so branch quality can be judged without leaning on final-answer accuracy.' },
    ],
    results: [
      'Circuit extraction runs end to end on a 42-layer model.',
      'Five circuits for one Game-of-24 thought: the top 200 of 720,658 scored edges, 113–124 of 716 nodes.',
      'Edge-score skewness of −7.90 vs 13.68 across two thoughts: the distributions differ sharply, which is the signal under study.',
    ],
    next: [
      'Feed circuit-stability scores back into ToT to drive branch pruning.',
      'An objective combining skewness with circuit similarity across branches.',
      'Backtracking and a stability database of previously seen circuits.',
      'Benchmark accuracy and pruning rate against standard self-evaluation ToT.',
    ],
    links: [
      { label: 'PROPOSAL (PDF)', href: '/papers/circuit-stability-proposal.pdf' },
      { label: 'GITHUB', href: 'https://github.com/A1pha-Z3r0/Algoverse_AI_Research' },
    ],
  },
  {
    title: 'De Vault: private clinical notes',
    blurb: 'Hackathon build: turns a recorded doctor visit into de-identified, structured clinical events. Everything runs locally.',
    tags: ['Whisper', 'Presidio', 'Gemma 3', 'Pydantic'],
    status: 'HACKATHON · IN DEVELOPMENT',
    meta: 'Hackathon team · Feb 2026',
    summary: 'Doctor–patient conversations hold the most useful clinical detail and the most sensitive data. De Vault turns a visit recording into de-identified, schema-validated JSON events on the user’s own machine, so patient audio never reaches a cloud API.',
    stack: ['faster-whisper (int8, CPU)', 'Gemma 3 4B on Ollama', 'LangChain LCEL', 'Microsoft Presidio', 'chonkie', 'Pydantic'],
    how: [
      'Whisper transcribes the conversation.',
      'Presidio strips personal identifiers.',
      'The transcript is split into 2,048-character chunks.',
      'A router LLM call tags each chunk with the clinical domains it touches, with a confidence score per domain.',
      'A specialised extractor runs for each selected domain, each with its own prompt and schema.',
      'Pydantic validates every event before it is accepted.',
    ],
    decisions: [
      { title: 'Route, then extract', text: 'One prompt that extracts everything asks too much of a small model. A multi-label router (accepting domains at confidence ≥ 6/10) hands each chunk to narrow, domain-specific extractors. Tighter prompts and schemas are what make a 4B model viable.' },
      { title: 'Every event cites its evidence', text: 'Each extracted event must include a verbatim quote from the transcript. A model that has to point at its source is much less likely to invent a diagnosis.' },
      { title: 'Schemas that check combinations', text: 'Lifestyle events use a discriminated union with a cross-field validator: which fields are required depends on the kind of event, and the validator enforces the combination.' },
      { title: 'Privacy by architecture', text: 'Whisper, Gemma and Presidio all run locally. There is no setting that sends audio to an API, because there is no API client.' },
    ],
    next: [
      'Live audio capture and speaker diarization (doctor vs patient).',
      'Custom de-identification rules on top of Presidio’s defaults.',
      'An encrypted, patient-owned store that syncs between devices: the “vault”.',
      'An evaluation set to measure extraction quality per domain.',
    ],
    link: 'https://github.com/A1pha-Z3r0/De-Vault---Decentralized-Vault',
    claude: true,
  },
  {
    title: 'BioRAG: local PDF Q&A',
    blurb: 'A privacy-first RAG bot for dense biomedical papers. Runs fully on your machine, no external APIs.',
    tags: ['Mistral', 'FAISS', 'RAG'],
    status: 'WORKING · ITERATING',
    meta: 'Solo · ~200 lines of Python · Mar – Jul 2025',
    summary: 'Question answering over biomedical PDFs, done fully locally so private documents never leave the machine. Deliberately minimal: every stage is a few readable lines and can be swapped out, with nothing hidden behind a framework.',
    stack: ['LangChain PyMuPDFLoader', 'sentence-transformers all-mpnet-base-v2 (768-d)', 'FAISS', 'Mistral via Ollama'],
    how: [
      'Load the PDF and split it into 350-character chunks with 50-character overlap.',
      'Clean and embed each chunk.',
      'Index the vectors in FAISS.',
      'Embed the question and retrieve the 5 nearest chunks.',
      'Prompt Mistral with the retrieved context to answer.',
    ],
    decisions: [
      { title: 'Chunk size set by the model, not guessed', text: 'all-mpnet-base-v2 reads at most 384 tokens. Anything longer is silently truncated, so part of a chunk never affects its own vector, and retrieval quietly degrades. 350-character chunks keep every chunk inside the window.' },
      { title: 'Readable over clever', text: 'Four small modules, end to end. The point is a RAG pipeline you can read in one sitting and modify.' },
    ],
    results: ['A 24-page paper indexed as 277 vectors of 768 dimensions.'],
    next: [
      'A persistent index, so documents are embedded once.',
      'Cited answers that point back to the source passage.',
      'Normalised embeddings for true cosine-similarity search.',
      'An interactive multi-question session and a retrieval-quality evaluation.',
    ],
    link: 'https://github.com/A1pha-Z3r0/BioRAG',
  },
  {
    title: 'Short-read genome assembler',
    blurb: 'De novo assembly of short sequencing reads into contigs with de Bruijn graphs, built to stop at ambiguity rather than guess.',
    tags: ['Bioinformatics', 'de Bruijn graphs', 'networkx'],
    status: 'IN DEVELOPMENT',
    meta: 'Solo · 467 lines of Python · Sep 2025',
    summary: 'Sequencers read DNA in short fragments, and an assembler has to stitch them back into longer sequences. This one builds a de Bruijn graph from the reads and walks it into contigs, preferring a shorter correct contig over a longer speculative one.',
    stack: ['Python', 'Biopython', 'networkx', 'matplotlib'],
    how: [
      'Count every k-mer across the reads (k set per run).',
      'Build a directed graph: nodes are (k−1)-mers, each k-mer an edge weighted by its count.',
      'Split the graph into weakly connected components.',
      'Walk Eulerian components into a single contig; otherwise emit unitigs, joining only on unique overlaps.',
      'Compute per-contig coverage from reads that place uniquely.',
      'Write FASTA with coverage in the headers, plus a coverage histogram per contig.',
    ],
    decisions: [
      { title: 'Safety over length', text: 'Where the graph branches ambiguously, the assembler stops instead of guessing. Joins happen only on unique overlaps, and coverage counts only uniquely placed reads.' },
      { title: 'Traceable decisions', text: 'Read multiplicity is carried as edge weight through the whole graph, so every join can be traced back to the evidence behind it.' },
    ],
    results: ['Sample run at k = 12: 24 contigs, 2,826 bp total, longest 170 bp, mean coverage ~18×.'],
    next: [
      'FASTA input alongside FASTQ.',
      'Error correction: tip removal and bubble popping.',
      'Reverse-complement handling.',
      'A full Hierholzer traversal for graphs with nested cycles.',
      'Validation against reference genomes.',
    ],
  },
  {
    title: 'Lab notebook digitization',
    blurb: 'An event-driven OCR backend for turning scanned chemistry and biochemistry lab pages into searchable text.',
    tags: ['FastAPI', 'Celery', 'Redis Streams', 'Ray', 'docTR'],
    status: 'PROTOTYPE · IN DEVELOPMENT',
    meta: 'Solo · Jul – Sep 2025',
    summary: 'Years of lab work live in handwritten and printed notebooks that no one can search. This is the backend for digitizing them: an upload service and an OCR pipeline, designed so that each part can fail or slow down without taking the others with it.',
    stack: ['FastAPI', 'MongoDB GridFS', 'Celery beat + RabbitMQ', 'Redis Streams', 'Ray', 'docTR (LinkNet-ResNet50 + MASTER)'],
    how: [
      'An upload is validated, hashed with SHA-256 and deduplicated.',
      'The scan is stored in GridFS, marked “Not Started”.',
      'A Celery beat job picks up pending files every minute, marks them “In Process” and publishes a Redis Stream event.',
      'A consumer hands each page to a Ray actor running docTR.',
    ],
    decisions: [
      { title: 'Idempotent uploads', text: 'Files are keyed by content hash, so uploading the same scan twice is a no-op, not a duplicate.' },
      { title: 'A status machine that rolls back', text: 'If a worker fails, the file returns to pending instead of being stuck “In Process” forever.' },
      { title: 'Resumable event stream', text: 'The Redis Streams consumer persists its position, so a restart picks up where it left off without replaying or dropping events.' },
      { title: 'Load the model once', text: 'Model loading dominates per-page cost, so a long-lived Ray actor holds docTR in memory and serves many documents.' },
      { title: 'Upload decoupled from OCR', text: 'A slow or failing OCR backend never makes uploads fail.' },
    ],
    next: [
      'Finish wiring the OCR stage end to end and persist results.',
      'Image preprocessing (deskew, denoise) ahead of recognition.',
      'Chemistry-aware recognition for formulas and structures.',
      'Fine-tuning on real notebook pages.',
    ],
  },
  {
    title: 'Bacterial infection detection in fruits',
    blurb: 'Two web apps that classify bacterial contamination in apples, tomatoes and strawberries from macroscopic or microscope images.',
    tags: ['VGG19 + ViT', 'Computer vision', 'Flask'],
    status: 'PROTOTYPE',
    meta: 'Solo · Sep 2024',
    summary: 'Two small web apps, one for ordinary photos and one for microscope images. They classify green apples, tomatoes and strawberries as healthy or contaminated by E. coli, Klebsiella, Pseudomonas, Staphylococcus or Streptococcus.',
    stack: ['Python', 'Flask', 'TensorFlow', 'OpenCV', 'ViT-B/32 (ImageNet-21k)', 'VGG19-style CNN'],
    how: [
      'Upload an image.',
      'Resize to 224×224 and scale to [0, 1].',
      'Classify into one of six classes.',
      'Return the label if the top score is at least 0.80, otherwise “Unknown”.',
    ],
    decisions: [
      { title: '“Unknown” is a rejection rule, not a class', text: 'You can’t collect training data for every contaminant that might appear. Instead of pretending to know, the app refuses anything below 80% confidence. In a lab setting, a confident wrong answer is worse than no answer.' },
      { title: 'One model per imaging modality', text: 'Photos and microscope images differ in scale, lighting and the features that separate classes, so each gets its own model rather than one compromising on both.' },
    ],
    next: [
      'Publish the training pipeline and evaluation metrics.',
      'Unify both apps behind one deployed service.',
    ],
    link: 'https://github.com/A1pha-Z3r0/FMD',
  },
  {
    title: 'This website',
    blurb: 'A 3D desk with a Commodore 64-style computer running a tiny web OS. Three.js, CSS3D and vanilla JS.',
    tags: ['Three.js', 'CSS3D', 'Vanilla JS'],
    status: 'LIVE',
    meta: 'Solo · 2026 · inspired by Henry Heffernan’s site',
    summary: 'You’re looking at it. A Three.js scene of a desk with a retro computer, whose screen is a real web page: a small operating system with windows, a taskbar and its own apps.',
    stack: ['Three.js', 'CSS3D', 'Vite', 'Vanilla JS', 'Cloudflare'],
    how: [
      'A Three.js scene renders the desk, the computer and the lighting.',
      'A CSS3D layer places a live web page exactly on the screen surface.',
      'That page is the OS: a window manager, taskbar and start menu written from scratch.',
      'Each app is a small module that returns its own DOM, opened in the standard window chrome.',
    ],
    decisions: [
      { title: 'No framework inside the OS', text: 'Window management, focus, dragging and the apps are plain JavaScript, so the whole OS stays small and every behaviour is explicit.' },
      { title: 'Data-driven content', text: 'Pages like this one are rendered from plain data arrays, so adding a project means adding an object, not markup.' },
    ],
    link: 'https://github.com/A1pha-Z3r0/portfolio.app',
    claude: true,
  },
]

const el = (tag, cls, text) => {
  const node = document.createElement(tag)
  if (cls) node.className = cls
  if (text) node.textContent = text
  return node
}

const linksOf = (p) => p.links || (p.link ? [{ label: 'GITHUB', href: p.link }] : [])

function section(title, body) {
  const s = el('section', 'project-section')
  s.append(el('h3', '', title), body)
  return s
}

function list(items, ordered) {
  const l = el(ordered ? 'ol' : 'ul')
  for (const i of items) l.append(el('li', '', i))
  return l
}

function tagRow(tags) {
  const row = el('div')
  for (const t of tags) row.append(el('span', 'tag', t))
  return row
}

function head(p) {
  const h = el('div', 'project-head')
  h.append(el('h2', '', p.title))
  if (p.status) h.append(el('span', 'project-status', p.status))
  return h
}

function detail(p, back) {
  const page = el('div', 'project-detail')
  const backBtn = el('button', 'project-back', '← ALL PROJECTS')
  backBtn.addEventListener('click', back)
  page.append(backBtn, head(p))
  if (p.meta) page.append(el('p', 'muted', p.meta))
  page.append(el('p', '', p.summary || p.blurb))
  if (p.stack) page.append(section('STACK', tagRow(p.stack)))
  if (p.how) page.append(section('HOW IT WORKS', list(p.how, true)))
  if (p.decisions) {
    const d = el('div')
    for (const { title, text } of p.decisions) {
      const item = el('div', 'project-decision')
      item.append(el('b', '', title), el('p', '', text))
      d.append(item)
    }
    page.append(section('DESIGN DECISIONS', d))
  }
  if (p.results) page.append(section('RESULTS', list(p.results)))
  if (p.next) page.append(section('WHAT’S NEXT', list(p.next)))
  const links = linksOf(p)
  if (links.length) {
    const row = el('div', 'project-links')
    for (const { label, href } of links) {
      const a = el('a', 'project-link', `${label} →`)
      Object.assign(a, { href, target: '_blank', rel: 'noopener' })
      row.append(a)
    }
    page.append(row)
  }
  return page
}

export default {
  id: 'projects',
  title: 'Projects',
  icon: 'projects',
  width: 680,
  height: 620,
  create(win) {
    const root = el('div')
    const show = (node) => {
      root.replaceChildren(node)
      win.body.scrollTop = 0
    }

    const index = el('div')
    index.innerHTML = `<h1>PROJECTS</h1><p class="muted">${PROJECTS.length} ENTRIES FOUND. SELECT ONE FOR DETAILS.</p>`
    for (const p of PROJECTS) {
      const item = el('button', 'project')
      item.append(head(p))
      if (p.meta) item.append(el('p', 'muted project-meta', p.meta))
      item.append(el('p', '', p.blurb), tagRow(p.tags))
      item.addEventListener('click', () => show(detail(p, () => show(index))))
      index.append(item)
    }

    show(index)
    return root
  },
}
