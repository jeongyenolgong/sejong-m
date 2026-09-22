// 무대 — 화면 하나를 갈아 끼우고, 넘어갈 때 막(어두움 · 빛)을 씌운다
import { el, animate } from './dom.js';
import { reduced } from './timing.js';

const game = () => document.getElementById('game');
let current = null;
let veilEl = null;

export function mount(screen) {
  if (current) current.remove();
  current = screen;
  game().insertBefore(screen, veilEl);
  return screen;
}

function veil() {
  if (!veilEl) { veilEl = el('div.veil'); game().append(veilEl); }
  return veilEl;
}

// 막을 ms 동안 씌운다(to: 0 → 1) 또는 걷는다(1 → 0)
export async function cover(kind, ms, to) {
  const v = veil();
  v.classList.toggle('light', kind === 'light');
  const from = Number(v.style.opacity || 0);
  if (reduced()) { v.style.opacity = String(to); return; }
  await animate(ms, (p) => { v.style.opacity = String(from + (to - from) * p); });
}

// 막을 씌우고 → 화면을 갈고 → 막을 걷는다
export async function through(kind, ms, swap) {
  await cover(kind, ms, 1);
  await swap();
  await cover(kind, ms, 0);
}

export const currentScreen = () => current;
