// 조작키 ◀ ▲ ▶ (B-03 하드코딩) — 화면 아래 가운데. 키보드 ← ↑ → 도 같은 일을 한다.
// 누르고 있는 동안 걷고, 떼면 선다. 뒤로(▼)는 없다. (요소정의 0-1-1)
import { el } from './dom.js';
import { HARD } from './text.js';

export class Controls {
  constructor() {
    this.held = { l: false, u: false, r: false };
    this.enabled = false;
    const keys = [['l', HARD['B-03'].left, '왼쪽'], ['u', HARD['B-03'].up, '앞으로'], ['r', HARD['B-03'].right, '오른쪽']];
    this.buttons = {};
    this.el = el('div.keys', {}, keys.map(([d, label, name]) => {
      const b = el('button.key', { type: 'button', text: label, 'aria-label': name });
      const on = (e) => { e.preventDefault(); if (!this.enabled) return; this.held[d] = true; b.classList.add('on'); };
      const off = () => { this.held[d] = false; b.classList.remove('on'); };
      b.addEventListener('pointerdown', on);
      for (const ev of ['pointerup', 'pointerleave', 'pointercancel', 'blur']) b.addEventListener(ev, off);
      b.addEventListener('contextmenu', (e) => e.preventDefault());
      this.buttons[d] = b;
      return b;
    }));
    this.onKeyDown = (e) => {
      const d = { ArrowLeft: 'l', ArrowUp: 'u', ArrowRight: 'r' }[e.key];
      if (!d || !this.enabled) return;
      e.preventDefault();
      this.held[d] = true;
      this.buttons[d].classList.add('on');
    };
    this.onKeyUp = (e) => {
      const d = { ArrowLeft: 'l', ArrowUp: 'u', ArrowRight: 'r' }[e.key];
      if (!d) return;
      this.held[d] = false;
      this.buttons[d].classList.remove('on');
    };
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    this.setEnabled(false);
  }
  // 알림창·판이 떠 있는 동안에는 안 먹고 보이지도 않는다 (⑤ 5번)
  setEnabled(on) {
    this.enabled = on;
    this.el.classList.toggle('off', !on);
    if (!on) this.release();
  }
  release() {
    for (const d of Object.keys(this.held)) { this.held[d] = false; this.buttons[d].classList.remove('on'); }
  }
  get moving() { return this.held.l || this.held.u || this.held.r; }
  destroy() {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
  }
}
