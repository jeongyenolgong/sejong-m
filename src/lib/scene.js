// 장면 — 16:10 그림을 화면에 꽉 차게 깐다(남는 가장자리는 잘린다 · 빈 띠가 없다).
// 그림 안의 자리(캐릭터·문짝·빗장)는 이 장면 상자에 대한 백분율로 놓아, 그림과 함께 커지고 줄어든다.
import { el } from './dom.js';
import { imageUrl } from './assets.js';

export function scene(cfg, cls = '') {
  const box = el(`div.scene${cls ? '.' + cls : ''}`);
  box.append(el('img.scene-bg', { src: imageUrl(cfg.file), alt: '', draggable: 'false' }));
  return box;
}

// 장면 안에 놓는 요소 — x·y·w·h는 그림에 대한 %
export function place(node, { x, y, w, h }) {
  Object.assign(node.style, { left: `${x}%`, top: `${y}%` });
  if (w !== undefined) node.style.width = `${w}%`;
  if (h !== undefined) node.style.height = `${h}%`;
  return node;
}

// 지금 화면에 보이는 가로 범위(그림 가로의 %) — 세로로 들면 가운데만 보인다
export function visibleX(box) {
  const r = box.getBoundingClientRect();
  const vw = window.innerWidth;
  if (!r.width) return [0, 100];
  const a = ((0 - r.left) / r.width) * 100;
  const b = ((vw - r.left) / r.width) * 100;
  return [Math.max(0, a), Math.min(100, b)];
}
