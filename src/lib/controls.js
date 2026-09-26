// 조작키 ◀ ▲ ▶ (B-03 하드코딩) — 화면 아래 가운데. 키보드 ← ↑ → 도 같은 일을 한다.
// 누르고 있는 동안 걷고, 떼면 선다. 뒤로(▼)는 없다. (요소정의 0-1-1)
// 모양은 한지 정사각 · 먹색 삼각형을 그린다(글자 아님 · 디4-1). 튜토리얼은 키를 하나씩 켠다(기1 — 꺼 둔 키 = 누를 수 없음).
// 캐릭터나 곳이 키 뒤에 겹칠 때만 그 키가 옅어진다(눌리는 것은 그대로 · 2026-09-25).
import { el } from './dom.js';
import { HARD } from './text.js';

const DIRS = [['l', 'left', '왼쪽'], ['u', 'up', '앞으로'], ['r', 'right', '오른쪽']];
const KEYMAP = { ArrowLeft: 'l', ArrowUp: 'u', ArrowRight: 'r' };

export class Controls {
  constructor() {
    this.held = { l: false, u: false, r: false };
    this.allowed = { l: true, u: true, r: true };
    this.enabled = false;
    this.buttons = {};
    this.el = el('div.keys', {}, DIRS.map(([d, hard, name]) => {
      const b = el(`button.key.k-${d}`, { type: 'button', 'aria-label': `${HARD['B-03'][hard]} ${name}` });
      const on = (e) => { e.preventDefault(); if (!this.can(d)) return; this.held[d] = true; b.classList.add('on'); };
      const off = () => { this.held[d] = false; b.classList.remove('on'); };
      b.addEventListener('pointerdown', on);
      for (const ev of ['pointerup', 'pointerleave', 'pointercancel', 'blur']) b.addEventListener(ev, off);
      b.addEventListener('contextmenu', (e) => e.preventDefault());
      this.buttons[d] = b;
      return b;
    }));
    this.onKeyDown = (e) => {
      const d = KEYMAP[e.key];
      if (!d || !this.enabled) return;
      e.preventDefault();
      if (!this.allowed[d]) return;
      this.held[d] = true;
      this.buttons[d].classList.add('on');
    };
    this.onKeyUp = (e) => {
      const d = KEYMAP[e.key];
      if (!d) return;
      this.held[d] = false;
      this.buttons[d].classList.remove('on');
    };
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    this.setEnabled(false);
  }
  can(d) { return this.enabled && this.allowed[d]; }
  // 알림창·판이 떠 있는 동안에는 안 먹고 보이지도 않는다 (⑤ 5번)
  setEnabled(on) {
    this.enabled = on;
    this.el.classList.toggle('off', !on);
    if (!on) this.release();
  }
  // 튜토리얼 — 켤 키만 { l, u, r } · 꺼 둔 키는 「누를 수 없음」 모양
  allow(keys) {
    for (const [d] of DIRS) {
      this.allowed[d] = !!keys[d];
      this.buttons[d].disabled = !keys[d];
      if (!keys[d]) { this.held[d] = false; this.buttons[d].classList.remove('on'); }
    }
  }
  release() {
    for (const d of Object.keys(this.held)) { this.held[d] = false; this.buttons[d].classList.remove('on'); }
  }
  get moving() { return this.held.l || this.held.u || this.held.r; }
  // 겹침 — rects(화면 픽셀 네모)가 키 뒤에 들어오면 그 키만 옅게
  cover(rects) {
    for (const [d] of DIRS) {
      const b = this.buttons[d].getBoundingClientRect();
      const hit = rects.some((r) => r && r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top);
      this.buttons[d].classList.toggle('see', hit);
    }
  }
  destroy() {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
  }
}
