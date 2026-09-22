// ③ 프롤로그 — 컷 다섯 (화면텍스트 목록 1절 · 2026-09-22)
//   1 앉은 뒷모습(고른 캐릭터) · 자막 P-07      › 만
//   2 같은 그림 · 자막 P-04                    ‹ ›
//   3 엎드려 잠든 뒷모습 · 자막 없음 — 컷 2 자막의 글자가 위로 떠올라 자모로 흩어진다(코드 · 먹 처리)
//   4 곤룡포 뒷모습(먹빛 어둠) · 자막 P-08
//   5 육조거리(지도 1장째 그림) · 자막 P-06     › → 지도
// 넘기는 법 — 화면을 터치 · 좌우 끝에 ‹ ›(B-05 하드코딩) · 키보드 ← → · 자막은 한 번에 · 건너뛰기 없음
import { el, wait } from '../lib/dom.js';
import { t, HARD } from '../lib/text.js';
import { config } from '../lib/assets.js';
import { scene } from '../lib/scene.js';
import { mount } from '../lib/stage.js';
import { toAtoms } from '../lib/hangul.js';
import { T, reduced } from '../lib/timing.js';

// 컷 3 — 자막 글자가 떠올라 자모로 흩어진다. 먹 처리 셋: ① 먹빛 ② 가장자리 번짐 두 겹 ③ 조각마다 다른 속도·기울기·흔들림 (요소정의 8)
function shatter(screen, textStr) {
  const line = el('p.caption.shatter-line');
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
        timers.push(setTimeout(() => p.classList.add('go'), 40 + si * 55 + ji * 30));
      });
    });
  })();
  return () => { alive = false; timers.forEach(clearTimeout); };
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
    { bg: dream, caption: t('P-08'), dark: true },
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
      screen = el(`section.screen.prologue${cut.dark ? '.dark' : ''}`, {}, [
        scene(cut.bg), tap, left, right,
        cut.caption ? el('p.caption', { text: cut.caption }) : null,
      ]);
      mount(screen);
      if (cut.shatter) stop = shatter(screen, cut.shatter);
    }
    document.addEventListener('keydown', onKey);
    show(0);
  });
}
