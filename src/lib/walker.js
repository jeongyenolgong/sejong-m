// 캐릭터 — 눈높이 전신 뒷모습(CH-03 서한글 · CH-04 김세종). 지도·문 앞·알현이 같은 그림을 쓴다.
// 좌우로 갈 때도 뒷모습 그대로다. 발 자리(x, y)를 그림에 대한 %로 둔다.
// 걸음 그림은 뽑지 않는다 — 한 장을 몸 / 왼다리 / 오른다리로 나눠 다리를 번갈아 들고 몸이 살짝 기운다 (디8 · journey.css)
import { el, replay } from './dom.js';
import { imageUrl } from './assets.js';

export class Walker {
  constructor(charCfg, heightPct) {
    this.cfg = charCfg;
    const parts = charCfg.parts;
    const imgs = parts
      ? ['L', 'R', 'body'].map((k) => el(`img.part.${k}`, { src: imageUrl(parts[k]), alt: '', draggable: 'false' }))
      : [el('img.part', { src: imageUrl(charCfg.file), alt: '', draggable: 'false' })];
    this.img = el('div.walker', {}, [el('div.sway', {}, imgs)]);
    this.img.style.aspectRatio = `${charCfg.width} / ${charCfg.height}`;
    if (parts) this.img.style.setProperty('--yc', `${parts.yc}%`);
    this.setHeight(heightPct);
    this.x = 50; this.y = 90;
  }
  set(x, y) {
    this.x = x; this.y = y;
    this.img.style.left = `${x}%`;
    this.img.style.top = `${y}%`;
  }
  setHeight(pct) { this.h = pct; this.img.style.height = `${pct}%`; }
  walking(on) { this.img.classList.toggle('walking', on); }
  // 부딪힘 — 누르고 있는 동안 매 프레임 불려도 한 번씩만 튄다
  bump() {
    const now = performance.now();
    if (this.lastBump && now - this.lastBump < 320) return;
    this.lastBump = now;
    replay(this.img, 'bump');
  }
  hide(on) { this.img.classList.toggle('off', on); }
}

// 걷기 — 매 프레임 조작키를 읽어 캐릭터를 옮긴다. step(dt)가 'stop'을 돌려주면 멈춘다.
export function walkLoop(step) {
  return new Promise((resolve) => {
    let last = 0;
    function tick(ts) {
      const dt = last ? Math.min((ts - last) / 1000, 0.05) : 0;
      last = ts;
      const r = step(dt);
      if (r !== undefined && r !== null) { resolve(r); return; }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}
