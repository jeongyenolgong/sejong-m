// ① 시작 화면 — 제목(T-01) · 부제(T-02) · 「시작」(B-01) 하나뿐 (화면텍스트 목록 0절)
// 배경은 중심축 부감(BG-01). 그림에서 오려 낸 구름 셋이 흐르고 학 넷이 난다(디2 · 2026-09-26) — 빈자리는 하늘 띠로 메웠다.
// 글자는 먹색 · 딤 없이 글자 둘레에만 한지빛 번짐(디1 · screens.css)
import { el } from '../lib/dom.js';
import { t } from '../lib/text.js';
import { config, imageUrl } from '../lib/assets.js';
import { scene, place } from '../lib/scene.js';
import { mount } from '../lib/stage.js';
import { T, reduced } from '../lib/timing.js';

// 구름 조각 — 오려 낸 자리에서 출발해 오른쪽으로 흐르고, 끝에 닿으면 왼쪽에서 다시 들어온다
function drifter(p) {
  const img = el('img.thing.cloud', { src: imageUrl(p.file), alt: '' });
  place(img, { x: p.x, y: p.y, w: p.w });
  if (!reduced()) {
    // 출발 자리에서 오른쪽 끝(100%)까지 간 뒤, 왼쪽 밖(-w)에서 다시 출발한다
    const travel = 100 + p.w;
    const startAt = (p.x + p.w) / travel;          // 한 바퀴 가운데 지금 자리
    img.animate(
      [{ transform: `translateX(${-(p.x + p.w) * 100 / p.w}%)` }, { transform: `translateX(${(100 - p.x) * 100 / p.w}%)` }],
      { duration: p.duration * 1000, iterations: Infinity, iterationStart: startAt, easing: 'linear' },
    );
  }
  return img;
}

// 학 — 날개를 편 그대로 머리 쪽으로 미끄러지며 살짝 오르내린다(위 22% · 아래 18% · 새 키 기준) · 끝에 닿으면 반대쪽 밖에서 다시 들어온다
function flyer(b, i) {
  const img = el('img', { src: imageUrl(b.file), alt: '' });
  const wrap = place(el('div.thing.bird', {}, [img]), { x: b.x, y: b.y, w: b.w });
  if (reduced()) return wrap;
  const w = b.w;
  const from = b.dir > 0 ? -(b.x + w) : (100 - b.x), to = b.dir > 0 ? (100 - b.x) : -(b.x + w);
  const startAt = b.dir > 0 ? (b.x + w) / (100 + w) : (100 - b.x) / (100 + w);
  wrap.animate([{ transform: `translateX(${from * 100 / w}%)` }, { transform: `translateX(${to * 100 / w}%)` }],
    { duration: b.duration * 1000, iterations: Infinity, iterationStart: startAt, easing: 'linear' });
  img.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-22%)' }, { transform: 'translateY(0)' }, { transform: 'translateY(18%)' }, { transform: 'translateY(0)' }],
    { duration: 5200 + i * 700, iterations: Infinity, easing: 'ease-in-out' });
  return wrap;
}

export async function startScreen() {
  const cfg = await config('bg_start');
  const sc = scene(cfg);
  for (const c of cfg.clouds || []) sc.append(drifter(c));
  (cfg.birds || []).forEach((b, i) => sc.append(flyer(b, i)));

  const button = el('button.cta', { type: 'button', text: t('B-01') });
  const screen = el('section.screen.start', {}, [
    sc,
    el('div.title-stack', {}, [
      el('h1.title', { text: t('T-01') }),
      el('p.subtitle', { text: t('T-02') }),
    ]),
    el('div.cta-row', {}, [button]),
  ]);
  mount(screen);
  if (!reduced()) {
    screen.animate([{ opacity: 0 }, { opacity: 1 }], { duration: T.startAppear, easing: 'ease' });
  }
  await new Promise((r) => button.addEventListener('click', r, { once: true }));
}
