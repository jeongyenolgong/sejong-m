// 기기 자판 — 우리가 자판을 그리지 않는다. 기기에 든 자판(두벌식 · 천지인 · 숫자)을 그대로 불러 쓴다 (요소정의 8-2)
//
// · 자판이 붙은 기기: 아무것도 누르지 않고 바로 친다 → 문서 전체의 keydown으로 받는다
// · 자판이 없는 기기: 음절 칸(숫자 칸)을 누르면 화면 자판이 올라온다 → 숨은 입력칸에 초점을 주어 부른다
// 화면 자판은 친 자모를 음절로 묶어 보낸다(ㅇ+ㅛ → 「요」). 받은 글을 자모로 풀어 순서대로 넘긴다.
import { toAtoms } from './hangul.js';

export class DeviceKeyboard {
  constructor(host) {
    // iOS가 확대하지 않도록 글자 크기 16px · 화면 밖에 두지 않고 투명하게(밖에 두면 화면이 따라 굴러간다)
    this.input = document.createElement('textarea');
    this.input.className = 'kb-input';
    this.input.setAttribute('autocapitalize', 'off');
    this.input.setAttribute('autocomplete', 'off');
    this.input.setAttribute('autocorrect', 'off');
    this.input.setAttribute('spellcheck', 'false');
    this.input.setAttribute('aria-hidden', 'true');
    this.input.tabIndex = -1;
    host.append(this.input);
    this.prev = [];
    this.onAtom = null;       // 자모 하나씩
    this.onDigit = null;      // 숫자 하나씩
    this.onBackspace = null;
    this.onEnter = null;
    this.onHeight = null;     // 화면 자판 높이가 바뀌면(px)
    this.mode = 'text';

    this.input.addEventListener('input', () => this.read());
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); this.onEnter && this.onEnter(); }
      if (e.key === 'Backspace' && this.input.value === '') { this.onBackspace && this.onBackspace(); }
    });
    this.input.addEventListener('blur', () => { this.reset(); this.report(); });

    this.vv = window.visualViewport;
    this.onResize = () => { window.scrollTo(0, 0); this.report(); };
    if (this.vv) { this.vv.addEventListener('resize', this.onResize); this.vv.addEventListener('scroll', this.onResize); }
  }

  read() {
    const v = this.input.value;
    if (this.mode === 'numeric') {
      for (const ch of v) if (/[0-9]/.test(ch)) this.onDigit && this.onDigit(ch);
      this.input.value = '';
      return;
    }
    // 앞서 넘긴 자모와 같은 데까지는 건너뛰고, 새로 붙은 것만 넘긴다(입력기가 음절을 고쳐 쓰는 중에도 차례가 지켜진다)
    const now = toAtoms(v);
    let k = 0;
    while (k < now.length && k < this.prev.length && now[k] === this.prev[k]) k++;
    const fresh = now.slice(k);
    this.prev = now;
    for (const a of fresh) this.onAtom && this.onAtom(a);
    if (v.length > 40) { this.input.value = ''; this.prev = []; }
  }

  reset() { this.input.value = ''; this.prev = []; }

  get isOpen() { return document.activeElement === this.input; }

  open(mode = 'text') {
    this.mode = mode;
    this.input.setAttribute('inputmode', mode === 'numeric' ? 'numeric' : 'text');
    if (mode === 'numeric') this.input.setAttribute('pattern', '[0-9]*'); else this.input.removeAttribute('pattern');
    this.reset();
    this.input.focus({ preventScroll: true });
    this.report();
  }

  close() {
    if (this.isOpen) this.input.blur();
    this.reset();
    this.report();
  }

  // 화면 자판이 덮는 높이 — 기기가 정하므로 그때그때 잰다
  height() {
    if (!this.vv || !this.isOpen) return 0;
    return Math.max(0, window.innerHeight - this.vv.height - this.vv.offsetTop);
  }
  report() { this.onHeight && this.onHeight(this.height()); }

  destroy() {
    this.close();
    if (this.vv) { this.vv.removeEventListener('resize', this.onResize); this.vv.removeEventListener('scroll', this.onResize); }
    this.input.remove();
  }
}
