// ③ 프롤로그 — 컷 다섯 (화면텍스트 목록 1절 · 2026-09-22)
//   1 앉은 뒷모습(고른 캐릭터) · 자막 P-07      › 만
//   2 같은 그림 · 자막 P-04                    ‹ ›
//   3 엎드려 잠든 뒷모습 · 자막 없음 — 컷 2 자막의 글자가 위로 떠올라 자모로 흩어진다(코드 · 먹 처리)
//   4 구름 위 곤룡포 뒷모습과 일월오봉도 풍경(밝은 미색 바탕) · 자막 P-08 — 들어서면 구름이 양옆으로 걷히고, 남은 구름은 제자리에서 둥실둥실(그2)
//   5 육조거리(지도 1장째 그림) · 자막 P-06     › → 지도
// 넘기는 법 — 화면을 터치 · 좌우 끝에 ‹ ›(B-05 하드코딩) · 키보드 ← → · 자막은 한 번에 · 건너뛰기 없음
// 자막은 다섯 컷 모두 같은 먹색 자막이다(2026-09-26 — 옛 먹빛 어둠 그림에 맞춘 한지색 자막을 뺐다)
import { el, wait } from '../lib/dom.js';
import { t, HARD } from '../lib/text.js';
import { config, imageUrl } from '../lib/assets.js';
import { scene, place } from '../lib/scene.js';
import { mount } from '../lib/stage.js';
import { toAtoms } from '../lib/hangul.js';
import { T, reduced } from '../lib/timing.js';

// 컷 3 — 자막 글자가 떠올라 자모로 흩어진다. 먹 처리 셋: ① 먹빛 ② 가장자리 번짐 두 겹 ③ 조각마다 다른 속도·기울기·흔들림 (요소정의 8)
function shatter(screen, textStr) {
  const line = el('p.caption.shatter-line');
  line.style.setProperty('--rise-ms', `${T.shatterRise}ms`);
  const syllables = [];
  for (const ch of textStr) {
    const s = el('span.syl', { text: ch });
    syllables.push(s);
    line.append(s);
  }
  screen.append(line);
  const timers = [];
  let alive = true;
  (async () => {
    if (reduced()) { line.classList.add('risen'); return; }
    await wait(300);
    line.classList.add('risen');                         // 위로 떠오른다
    await wait(T.shatterRise);
    if (!alive) return;
    const box = screen.getBoundingClientRect();
    syllables.forEach((s, si) => {
      const pieces = toAtoms(s.textContent);
      if (!pieces.length) return;
      const r = s.getBoundingClientRect();
      s.classList.add('gone');
      pieces.forEach((ch, ji) => {
        const p = el('span.ink-piece', { text: ch });
        p.style.left = `${r.left - box.left + r.width * (0.14 + ji * 0.26)}px`;
        p.style.top = `${r.top - box.top + r.height * 0.1}px`;
        // 조각마다 방향·거리·기울기·빠르기를 달리한다
        const ang = ((si * 47 + ji * 113) % 360) * Math.PI / 180;
        const dist = box.width * (0.1 + ((si + ji) % 4) * 0.055);
        p.style.setProperty('--dx', `${(Math.cos(ang) * dist).toFixed(1)}px`);
        p.style.setProperty('--dy', `${(Math.sin(ang) * dist * 0.62).toFixed(1)}px`);
        p.style.setProperty('--rot', `${((si * 31 + ji * 17) % 80) - 40}deg`);
        p.style.setProperty('--ms', `${T.shatterFly * (0.75 + ((si * 7 + ji * 3) % 5) * 0.12)}ms`);
        screen.append(p);
        timers.push(setTimeout(() => p.classList.add('go'), (40 + si * 55 + ji * 30) * 1.5));   // 떠나는 간격도 1.5배 (디6)
      });
    });
  })();
  return () => { alive = false; timers.forEach(clearTimeout); };
}

// 컷 4 — 구름 (그2) · 걷히는 구름 두 장이 화면을 덮고 있다가 양옆으로 빠지고, 가장자리 구름 조각은 제자리에서 둥실둥실
//   둥실 빠르기는 시작 화면 구름과 같게(한 바퀴에 그림 폭만큼 · 90~170초) — 가로 0.8% 오가는 데 3.4초 남짓
function dreamClouds(sc, clouds) {
  if (!clouds) return;
  clouds.pieces.forEach((c, i) => {
    const img = place(el('img.dream-cloud', { src: imageUrl(c.file), alt: '' }), { x: c.x, y: c.y, w: c.w });
    sc.append(img);
    if (reduced()) return;
    const dx = 0.8 * 100 / c.w;                       // 그림 폭 0.8%를 조각 폭의 %로
    img.animate([{ transform: 'translate(0, 0)' }, { transform: `translate(${-dx * c.side}%, -1.5%)` }, { transform: 'translate(0, 0)' }],
      { duration: 3400 + i * 600, iterations: Infinity, easing: 'ease-in-out', delay: i * 300 });
  });
  if (reduced()) return;
  for (const [file, side] of [[clouds.curtain.left, -1], [clouds.curtain.right, 1]]) {
    const img = el('img.dream-curtain', { src: imageUrl(file), alt: '' });
    img.style.width = `${clouds.curtain.w}%`;
    img.style[side < 0 ? 'left' : 'right'] = '0';
    sc.append(img);
    const a = img.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${side * 100}%)` }],
      { duration: T.dreamPart, easing: 'ease-in-out', fill: 'forwards' });
    a.finished.then(() => img.remove()).catch(() => {});
  }
}

export async function prologue(character) {
  const f = character === 'f';
  const [sit, sleep, dream, yukjo] = await Promise.all([
    config(f ? 'bg_prologue_sit_f' : 'bg_prologue_sit_m'),
    config(f ? 'bg_prologue_sleep_f' : 'bg_prologue_sleep_m'),
    config('bg_dream'),
    config('bg_map_1_yukjo'),
  ]);
  const CUTS = [
    { bg: sit, caption: t('P-07') },
    { bg: sit, caption: t('P-04') },
    { bg: sleep, shatter: t('P-04') },
    { bg: dream, caption: t('P-08'), clouds: dream.clouds },
    { bg: yukjo, caption: t('P-06') },
  ];

  return new Promise((resolve) => {
    let at = 0;
    let stop = null;
    let screen = null;
    const next = () => { if (at === CUTS.length - 1) finish(); else show(at + 1); };
    const prev = () => { if (at > 0) show(at - 1); };
    function onKey(e) {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    }
    function finish() {
      document.removeEventListener('keydown', onKey);
      if (stop) stop();
      resolve();
    }
    function show(i) {
      if (stop) { stop(); stop = null; }
      at = i;
      const cut = CUTS[i];
      const tap = el('button.tapzone', { type: 'button', 'aria-label': HARD['B-05'].next, onclick: next });
      const left = i > 0 ? el('button.side.l', { type: 'button', text: HARD['B-05'].prev, 'aria-label': '앞 컷',
        onclick: (e) => { e.stopPropagation(); prev(); } }) : null;
      const right = el('button.side.r', { type: 'button', text: HARD['B-05'].next, 'aria-label': '다음 컷',
        onclick: (e) => { e.stopPropagation(); next(); } });
      const sc = scene(cut.bg);
      dreamClouds(sc, cut.clouds);
      screen = el('section.screen.prologue', {}, [
        sc, tap, left, right,
        cut.caption ? el('p.caption', { text: cut.caption }) : null,
      ]);
      mount(screen);
      if (cut.shatter) stop = shatter(screen, cut.shatter);
    }
    document.addEventListener('keydown', onKey);
    show(0);
  });
}
