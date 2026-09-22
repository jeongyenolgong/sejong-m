// ① 시작 화면 — 제목(T-01) · 부제(T-02) · 「시작」(B-01) 하나뿐 (화면텍스트 목록 0절)
// 배경은 중심축 부감(BG-01). 그림에서 오려 낸 구름만 흐른다 — 새는 그림에 그대로 있고 움직이지 않는다(요소정의 12절 「2026-09-23 맞추기」 결정 5).
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

export async function startScreen(savedGame) {
  const cfg = await config('bg_start');
  const sc = scene(cfg);
  for (const c of cfg.clouds || []) sc.append(drifter(c));

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
  return savedGame;
}
