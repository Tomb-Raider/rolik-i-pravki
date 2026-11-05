/* Макет: кнопки, которые на настоящем сайте что-то делают, здесь показывают подсказку, что будет */
'use strict'
const toastEl = document.body.appendChild(Object.assign(document.createElement('div'), { className: 'toast' }))
let toastTimer
function toast(t) {
  toastEl.textContent = t
  toastEl.classList.add('on')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => toastEl.classList.remove('on'), 2600)
}

/* ---------- Пример ролика: пресет «Короткие фразы как в рекламе Apple» ----------
   Тот же расчёт, что в плеере пакета (final-apple.js): числа сняты покадрово с референса, не меняй их */
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const prog = (t, start, dur) => dur > 0 ? clamp((t - start) / dur) : (t >= start ? 1 : 0)
const snap = (t, fps = 24) => Math.floor(t * fps + 1e-6) / fps
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
  const fx = u => ((ax * u + bx) * u + cx) * u
  const fy = u => ((ay * u + by) * u + cy) * u
  return x => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let lo = 0, hi = 1, u = x
    for (let i = 0; i < 40; i++) { if (fx(u) < x) lo = u; else hi = u; u = (lo + hi) / 2 }
    return fy(u)
  }
}
const ease = { out: bezier(0, 0, 0.58, 1), inOutQuint: bezier(0.83, 0, 0.17, 1), enter: bezier(0.094, 0.656, 0.383, 1) }
const F = 1 / 24

function phraseAt(line, lt, { life = 1.2, first = 0.43, punch = true, enter = false, w = 1920 } = {}) {
  const add = line.lastElementChild, word = add.firstElementChild
  add.style.width = word.offsetWidth * ease.inOutQuint(prog(lt, first, 0.25)) + 'px'  // дописывание 250 мс
  add.style.overflow = lt >= first + 0.25 ? 'visible' : 'hidden'
  word.style.visibility = lt >= first + 0.167 ? 'visible' : 'hidden'  // слово возникает за 83 мс до остановки
  let s = 1 - 0.15 * Math.min(1, 1.2 / life) * lt                     // отъезд 15 % в секунду
  if (lt >= life - 2 * F) s -= lt >= life - F ? 0.03 : 0.01           // разгон перед склейкой
  if (punch) s *= 1 + 0.05 * (1 - ease.out(prog(lt, 0, 0.06)))        // удар +5 % на склейке
  const x = enter ? -0.15 * w * (1 - ease.enter(prog(lt, 0, 0.417))) : 0  // въезд слева
  line.style.transform = `translateX(${x}px) scale(${s})`
}

document.querySelectorAll('.ex-apple').forEach(box => {
  const lines = JSON.parse(box.dataset.lines), life = 1.2, dur = lines.length * life
  const els = lines.map(([a, b]) => {
    const line = document.createElement('div')
    line.className = 'line'
    line.innerHTML = `<span>${a}</span><span class="add"><span>&nbsp;${b}</span></span>`
    box.insertBefore(line, box.querySelector('.ex-bar'))
    return line
  })
  const bar = box.querySelector('.ex-bar')
  const head = box.parentElement.querySelector('.tl .head')
  // Длинную фразу уменьшаем, чтобы в конце дописывания она влезала в кадр
  const fit = () => els.forEach(line => {
    line.style.fontSize = ''
    line.style.transform = 'none'
    const add = line.lastElementChild
    add.style.width = 'auto'
    const full = line.firstElementChild.offsetWidth + add.firstElementChild.offsetWidth
    const k = Math.min(1, box.clientWidth * 0.84 / full)
    if (k < 1) line.style.fontSize = parseFloat(getComputedStyle(line).fontSize) * k + 'px'
  })
  fit()
  addEventListener('resize', fit)
  const t0 = performance.now()
  const frame = now => {
    const t = snap(((now - t0) / 1000) % dur)
    const k = Math.min(lines.length - 1, Math.floor(t / life))
    els.forEach((line, i) => {
      line.style.display = i === k ? '' : 'none'
      if (i === k) phraseAt(line, t - k * life, { life, punch: k > 0, enter: k === 0, w: box.clientWidth })
    })
    if (bar) bar.style.width = (t / dur * 100) + '%'
    if (head) head.style.left = (t / dur * 100) + '%'
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
})

/* ---------- Табы способов: «Онлайн», «Агент в папке», «Сайт в интернете». Адрес помнит выбранный ---------- */
function showPanel(id) {
  const tabs = document.querySelector('.tabs')
  if (!tabs || !document.querySelector(`[data-panel="${id}"]`)) return
  tabs.querySelectorAll('a').forEach(a => a.classList.toggle('on', a.hash === '#' + id))
  document.querySelectorAll('[data-panel]').forEach(p => p.classList.toggle('on', p.dataset.panel === id))
}
showPanel(location.hash.slice(1))
addEventListener('hashchange', () => showPanel(location.hash.slice(1)))

/* Шаблон ролика, «Скопировать для чата» и «Открыть в плеере» на странице «Видео» живут в reel.js */

document.addEventListener('click', e => {
  const tab = e.target.closest('.tabs a')
  if (tab) { e.preventDefault(); history.replaceState(null, '', tab.hash); showPanel(tab.hash.slice(1)); return }
  const el = e.target.closest('[data-toast], [data-copy]')
  if (!el) return
  e.preventDefault()
  const copy = (text, ok) => navigator.clipboard?.writeText(text).then(() => toast(ok), () => toast('Браузер не дал скопировать'))
  if (el.dataset.copy !== undefined) return copy(el.closest('.agent').querySelector('pre').textContent, 'Фраза скопирована')
  toast(el.dataset.toast)
})
