/* Страница «Видео», вкладка «Онлайн». Два пути.
   Новый ролик: шаблон промта одним полем, «Скопировать для чата» и «Скачать файлом» вместе с инструкцией,
   ответ ИИ открывается в плеере.
   Свой ролик: HTML, который сохранил плеер, открывается в плеере сайта.
   Плеер сайта это Плеер.html пакета «Ролик из HTML» (в папке лежит ссылкой на файл пакета).
   В него ставим код сцен, кладём страницу в хранилище браузера по адресу f/Ролик/<имя>.html
   и открываем. Отдаёт её помощник sw.js, как файлы на странице «Презентация». В сеть ничего не уходит */
;(() => {
'use strict'
const $ = s => document.querySelector(s)
const $$ = s => [...document.querySelectorAll(s)]
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const mem = {
  get(k) { try { return localStorage.getItem(k) } catch (e) { return null } },
  set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v) } catch (e) { /* без памяти тоже работает */ } },
}

/* ---------- Два пути: «Новый ролик» и «У меня уже есть ролик» ---------- */
function showWay(id) {
  $$('.paths [data-way-btn]').forEach(b => {
    b.classList.toggle('on', b.dataset.wayBtn === id)
    b.setAttribute('aria-pressed', b.dataset.wayBtn === id)
  })
  $$('[data-way]').forEach(p => { p.hidden = p.dataset.way !== id })
  if (id === 'new') grow()
}
$('.paths').addEventListener('click', e => {
  const b = e.target.closest('[data-way-btn]')
  if (b) showWay(b.dataset.wayBtn)
})

/* ---------- Шаблон промта одним полем ----------
   Текст берём из «Шаблона промта» пакета, блок в ```. Что человек вписал, помнит этот браузер */
const tpl = $('#tpl'), resetBtn = $('[data-reset]')
const DRAFT = 'rolik-shablon'
let TEMPLATE = '', GUIDE = '', mine = null
function grow() {
  if (!tpl.offsetParent) return
  tpl.style.height = 'auto'
  tpl.style.height = tpl.scrollHeight + 2 + 'px'
}
function paintReset() {
  const changed = !!TEMPLATE && tpl.value.trim() !== TEMPLATE
  resetBtn.hidden = !changed && mine == null
  resetBtn.textContent = changed ? 'Вернуть шаблон' : 'Вернуть мой текст'
}
fetch('Шаблон промта (ролик).md').then(r => r.ok ? r.text() : '').catch(() => '').then(md => {
  const m = md.match(/```[^\n]*\n([\s\S]*?)```/)
  TEMPLATE = m ? m[1].trim() : ''
  if (!TEMPLATE) tpl.placeholder = 'О чём ролик, сцены по порядку, шрифт и цвета, какое движение'
  tpl.value = mem.get(DRAFT) || TEMPLATE
  grow()
  paintReset()
})
// Инструкцию грузим заранее: Safari копирует только сразу по нажатию, без ожидания сети
const guideReady = fetch('Инструкция для ИИ (ролик).md').then(r => r.ok ? r.text() : '').catch(() => '').then(t => { GUIDE = t.trim() })

tpl.addEventListener('input', () => {
  mine = null
  mem.set(DRAFT, tpl.value.trim() === TEMPLATE ? null : tpl.value)
  grow()
  paintReset()
})
addEventListener('resize', grow)
resetBtn.addEventListener('click', () => {
  if (tpl.value.trim() !== TEMPLATE) { mine = tpl.value; tpl.value = TEMPLATE; mem.set(DRAFT, null) }
  else if (mine != null) { tpl.value = mine; mem.set(DRAFT, mine); mine = null }
  grow()
  paintReset()
})

// Одно сообщение для чата: инструкция, черта, шаблон. Как было у полей шаблона
const message = () => (GUIDE ? GUIDE + '\n\n────────\n\n' : '') + tpl.value.trim()

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true } catch (e) {
    const ta = Object.assign(document.createElement('textarea'), { value: text })
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0'
    document.body.append(ta)
    ta.select()
    let ok = false
    try { ok = document.execCommand('copy') } catch (e2) { ok = false }
    ta.remove()
    return ok
  }
}

$('[data-copy-brief]').addEventListener('click', async () => {
  if (!tpl.value.trim()) { toast('Опишите ролик в поле выше'); tpl.focus(); return }
  if (!GUIDE) await guideReady
  if (await copyText(message())) toast(GUIDE ? 'Скопировано: инструкция и ваш ролик. Вставьте в свой чат' : 'Скопирован ваш ролик, инструкция не нашлась')
  else toast('Браузер не дал скопировать. Скачайте файлом')
})

$('[data-download]').addEventListener('click', async () => {
  if (!tpl.value.trim()) { toast('Опишите ролик в поле выше'); tpl.focus(); return }
  if (!GUIDE) await guideReady
  const name = 'Бриф ролика.txt'
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([message() + '\n'], { type: 'text/plain;charset=utf-8' }))
  a.download = name
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  toast(`Файл «${name}» в папке загрузок`)
})

/* ---------- Ролик в плеер ---------- */
const CAN = 'serviceWorker' in navigator && window.isSecureContext && location.protocol !== 'file:'
const ready = CAN ? navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready) : null
const SCENES = /(<script type="text\/plain" id="reel-scenes">)([\s\S]*?)(<\/script>)/
const HAS_REEL = /\bscene\s*\(|\breel\s*\(/
const NO_SITE = 'Так открыть можно только с&nbsp;сайта: <a href="https://tomb-raider.github.io/rolik-i-pravki/Видео.html">tomb-raider.github.io/rolik-i-pravki</a>'
const LAST = 'rolik-poslednij'
const TYPES = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif',
  svg: 'image/svg+xml', mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', mp3: 'audio/mpeg', wav: 'audio/wav',
  m4a: 'audio/mp4', ogg: 'audio/ogg', woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf',
  css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8', json: 'application/json; charset=utf-8',
}
const encPath = p => p.split('/').map(encodeURIComponent).join('/')
const canon = p => { try { p = decodeURIComponent(p) } catch (e) { /* как есть */ } return encPath(p) }
const BASE = new URL('f/Ролик/', location.href).pathname
const urlOf = name => BASE + encPath(name)
const safe = s => String(s).replace(/[\\/:*?"<>|#%\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)

// Код сцен из того, что вставили, как у кнопки «Код» в плеере: блоки ``` из чата, теги script и style, файл ролика целиком
function reelCode(raw) {
  let s = String(raw).replace(/\r\n?/g, '\n').trim()
  const fences = [...s.matchAll(/```[^\n]*\n([\s\S]*?)```/g)]
  if (fences.length) s = fences.map(m => m[1]).join('\n\n')
  const block = s.match(/<script[^>]*id=["']reel-scenes["'][^>]*>([\s\S]*?)<\/script>/i)
  if (block) return block[1]
  if (/<script[\s>]|<style[\s>]/i.test(s)) {
    const css = [...s.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1]).join('\n')
    const js = [...s.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]).join('\n')
    s = (css.trim() ? `reel({ css: ${JSON.stringify(css)} })\n` : '') + js
  }
  return s
}
const titleOf = code => (code.match(/\breel\s*\(\s*\{[\s\S]*?\btitle\s*:\s*(['"`])([^'"`\n]{1,80})\1/) || [])[2] || ''

/* «Не сохранено». Плеер с сайта зажигает его сразу, если ролика нет в его списке reel-saved в памяти браузера:
   там ключи кода роликов, уже записанных в файл. Ролик из «У меня уже есть ролик» файл уже имеет,
   поэтому кладём в список ключ его кода. Ключ считаем так же, как плеер: splitChunks, codeOf и codeKey в Плеер.html.
   Ролик из «Новый ролик» файла ещё не имеет, его не отмечаем, и «Не сохранено» горит сразу */
const SAVED = 'reel-saved'
function codeKeyOf(text) {
  const list = []
  let label = 'основа', buf = []
  const push = () => { const code = buf.join('\n').replace(/^\s*\n/, '').replace(/\s+$/, ''); if (code.trim()) list.push({ label, code }) }
  for (const line of String(text).replace(/\r\n?/g, '\n').split('\n')) {
    const m = line.match(/^\/\/\/\/\s?(.*)$/)
    if (m) { push(); label = m[1].trim() || 'код'; buf = [] } else buf.push(line)
  }
  push()
  const code = list.length === 1 && list[0].label === 'основа' ? list[0].code : list.map(c => `//// ${c.label}\n${c.code}`).join('\n\n')
  const s = code.replace(/\s+/g, ' ').trim()
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return (h >>> 0).toString(36) + '.' + s.length
}
function markHasFile(text) {
  const k = codeKeyOf(text)
  let list = []
  try { list = JSON.parse(mem.get(SAVED) || '[]') } catch (e) { /* список с нуля */ }
  if (!Array.isArray(list)) list = []
  mem.set(SAVED, JSON.stringify(list.filter(x => x !== k).concat(k).slice(-40)))
}

// Плеер сайта с кодом сцен внутри, следом reel-player.js: он ведёт обратно на сайт и помнит изменения
async function openReel(code, name, extras = [], hasFile = false) {
  await ready
  const player = await fetch('Плеер.html', { cache: 'no-cache' }).then(r => r.ok ? r.text() : '')
  if (!SCENES.test(player)) throw new Error('нет плеера')
  const after = `\n<script src="${new URL('reel-player.js', location.href).href}"><\/script>\n`
  const body = code.replace(/<\/script/gi, '<\\/script')
  let page = player.replace(SCENES, (_, a, b, c) => `${a}\n${body}\n${c}`)
  const i = page.toLowerCase().lastIndexOf('</body')
  page = i < 0 ? page + after : page.slice(0, i) + after + page.slice(i)
  const cache = await caches.open('pravki-files')
  for (const e of extras) {
    const ext = (e.path.match(/\.([^./]+)$/) || [])[1]?.toLowerCase()
    await cache.put(location.origin + canon(BASE + encPath(e.path)), new Response(e.file, { headers: { 'content-type': TYPES[ext] || e.file.type || 'application/octet-stream' } }))
  }
  await cache.put(location.origin + canon(urlOf(name)), new Response(page, { headers: { 'content-type': 'text/html; charset=utf-8' } }))
  mem.set(LAST, name)
  if (hasFile) markHasFile(body)
  location.href = urlOf(name)
}

/* Новый ролик: ответ ИИ в плеер */
const answer = $('#answer'), answerMsg = $('#answerMsg')
const sayNew = html => { answerMsg.innerHTML = html }
answer.addEventListener('input', () => sayNew(''))
$('[data-play]').addEventListener('click', async () => {
  const code = reelCode(answer.value)
  if (!code.trim()) { sayNew('Вставьте ответ ИИ в&nbsp;поле выше'); answer.focus(); return }
  if (!HAS_REEL.test(code)) {
    sayNew('В&nbsp;ответе нет кода ролика. Попросите ИИ прислать код ролика по&nbsp;инструкции одним блоком')
    return
  }
  if (!CAN) { sayNew(NO_SITE); return }
  sayNew('Открываю…')
  try { await openReel(code, (safe(titleOf(code)) || 'Ролик') + '.html') } catch (e) { sayNew('Плеер не&nbsp;открылся. Обновите страницу и&nbsp;попробуйте ещё раз') }
})

/* Свой ролик: файл, который сохранил плеер. Картинки и шрифты рядом с ним можно выбрать вместе с ним */
const haveMsg = $('#haveMsg')
const sayHave = html => { haveMsg.innerHTML = html }
const isHTML = p => /\.html?$/i.test(p)
async function openFiles(entries) {
  const pages = entries.filter(e => isHTML(e.path))
  if (!pages.length) { sayHave('Нужен HTML-файл ролика'); return }
  if (!CAN) { sayHave(NO_SITE); return }
  for (const p of pages) {
    const text = await p.file.text()
    const block = text.match(SCENES)
    const code = block ? block[2] : reelCode(text)
    if (!HAS_REEL.test(code)) continue
    sayHave(`Открываю «${esc(p.path.split('/').pop())}»…`)
    // Файл, который сохранил плеер (в нём блок reel-scenes), уже хранит этот код. Страница от ИИ без блока ещё не файл ролика
    try { await openReel(code.replace(/^\n/, '').replace(/\n$/, ''), safe(p.path.split('/').pop()) || 'Ролик.html', entries.filter(e => !isHTML(e.path)), !!block) }
    catch (e) { sayHave('Плеер не&nbsp;открылся. Обновите страницу и&nbsp;попробуйте ещё раз') }
    return
  }
  sayHave(pages.length > 1 ? 'Ни&nbsp;в&nbsp;одном файле нет ролика. Нужен HTML, который сохранил плеер' : 'В&nbsp;этом файле нет ролика. Нужен HTML, который сохранил плеер')
}

const fileIn = $('#reelIn')
$('[data-pick]').addEventListener('click', () => fileIn.click())
fileIn.addEventListener('change', () => {
  const files = [...fileIn.files]
  fileIn.value = ''
  if (files.length) openFiles(files.map(f => ({ path: f.name, file: f })))
})

// Последний открытый ролик, если он ещё в хранилище браузера
const lastName = mem.get(LAST)
if (lastName && window.caches) {
  caches.match(location.origin + canon(urlOf(lastName))).then(hit => {
    if (!hit) return
    const a = $('#last a')
    a.href = urlOf(lastName)
    a.textContent = lastName.replace(/\.html?$/i, '')
    $('#last').hidden = false
  }).catch(() => {})
}

/* Перетаскивание файла ролика на страницу. Открывает «У меня уже есть ролик» */
const drop = $('#drop')
let depth = 0
const hasFiles = e => [...(e.dataTransfer?.types || [])].includes('Files')
addEventListener('dragenter', e => { if (hasFiles(e)) { depth++; drop.classList.add('on') } })
addEventListener('dragleave', e => { if (hasFiles(e) && --depth <= 0) { depth = 0; drop.classList.remove('on') } })
addEventListener('dragover', e => { if (hasFiles(e)) e.preventDefault() })
addEventListener('drop', async e => {
  if (!hasFiles(e)) return
  e.preventDefault()
  depth = 0
  drop.classList.remove('on')
  showPanel('online')
  showWay('have')
  const items = [...e.dataTransfer.items].map(i => i.webkitGetAsEntry && i.webkitGetAsEntry()).filter(Boolean)
  const files = []
  for (const it of items) {
    if (it.isDirectory) files.push(...await walk(it, ''))
    else files.push({ path: it.name, file: await new Promise((ok, no) => it.file(ok, no)) })
  }
  openFiles(files)
})
async function walk(dir, prefix) {
  const out = []
  const reader = dir.createReader()
  for (;;) {
    const batch = await new Promise((ok, no) => reader.readEntries(ok, no))
    if (!batch.length) break
    for (const it of batch) {
      if (/^\.|^node_modules$/.test(it.name)) continue
      const path = prefix + it.name
      if (it.isDirectory) out.push(...await walk(it, path + '/'))
      else out.push({ path, file: await new Promise((ok, no) => it.file(ok, no)) })
    }
  }
  return out
}

showWay('new')
})()
