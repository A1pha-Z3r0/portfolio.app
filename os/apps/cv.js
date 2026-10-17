// CV: the resume PDF in a window, with download and new-tab buttons
// (mobile Safari shows only the first page of an embedded PDF).
const PDF = '/resume/Resume.pdf'

export default {
  id: 'cv',
  title: 'CV.pdf',
  icon: 'cv',
  width: 680,
  height: 760,
  create(win) {
    win.body.classList.add('flush')
    const el = document.createElement('div')
    el.className = 'cv'
    el.innerHTML = `
      <div class="cv-bar">
        <a class="cv-button" href="${PDF}" target="_blank" rel="noopener">OPEN IN NEW TAB</a>
        <a class="cv-button" href="${PDF}" download>DOWNLOAD</a>
      </div>
      <iframe class="cv-pdf" src="${PDF}" title="CV"></iframe>`
    return el
  },
}
