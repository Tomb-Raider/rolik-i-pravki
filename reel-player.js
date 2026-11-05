/* Плеер, открытый с сайта (страница «Видео»). reel.js дописывает этот скрипт после плеера,
   поэтому в файл, который сохраняет «Сохранить», он не попадает.
   Что делает: ведёт обратно на сайт и держит ролик в хранилище браузера свежим.
   Если перезагрузить страницу, откроется ролик со всеми вставками кода и длинами сцен */
;(() => {
  'use strict'
  const me = document.currentScript
  const player = window.reelPlayer
  if (!player) return

  // Обратно на сайт, тихой кнопкой в ряду кнопок плеера
  const back = document.createElement('a')
  back.className = 'p-btn'
  back.href = new URL('Видео.html', me.src).href
  back.textContent = 'На сайт'
  back.style.textDecoration = 'none'
  const bar = document.querySelector('.p-actions')
  if (bar) bar.append(back)

  // Тот же адрес и то же хранилище, что у помощника sw.js
  const canon = p => { try { p = decodeURIComponent(p) } catch (e) { /* как есть */ } return p.split('/').map(encodeURIComponent).join('/') }
  const KEY = location.origin + canon(location.pathname)
  const TAG = '\n' + me.outerHTML + '\n'
  const inject = html => {
    const i = html.toLowerCase().lastIndexOf('</body')
    return i < 0 ? html + TAG : html.slice(0, i) + TAG + html.slice(i)
  }
  if (!window.caches) return
  let last = player.fileHTML()
  async function keep() {
    const html = player.fileHTML()
    if (html === last) return
    last = html
    try {
      const cache = await caches.open('pravki-files')
      await cache.put(KEY, new Response(inject(html), { headers: { 'content-type': 'text/html; charset=utf-8' } }))
    } catch (e) { /* без хранилища ролик живёт до перезагрузки, как в обычном плеере */ }
  }
  setInterval(keep, 1500)
  addEventListener('pagehide', keep)
})()
