// 점검 퀴즈 판 — 답은 오프라인 포스터에서 찾아 세 자리 코드로 넣는다 (요소정의 10-2 · 10-2-2 · 10-2-3 · 10-3-1)
//   판 맨 위 Q-04 머리 안내 · 판 오른쪽 위는 비운다
//   가운데 물음(③ 1.85) → 해설 자리(물음과 입력칸 사이 · 가장 긴 해설 높이만큼 미리 비워 둔다 · ⑤ 1.4)
//   → 숫자 세 칸 + 「확인」(B-07 · 칸 바로 옆 · 세 자리가 차야 눌린다)
// · 눌러야 판정한다(Enter도 같다) · 숫자는 기기 자판(숫자 자판)으로 친다 · 칸을 눌러야 올라온다
// · 틀리면 판이 흔들리고 → 고른 포스터 문장(인용선 + 뒤에 ✕) · 그 아래 해설이 떠오른다(디4-7) · 틀린 코드는 칸에 남았다가 칸을 누르거나 숫자를 치면 비워진다
// · 이 물음의 오답 코드 → 고른 문장 + 그 해설 · 같은 학년 다른 문항 코드 → Q-06 · 그 밖의 숫자 → Q-05 (고른 문장 없이 가운데 정렬)
// · 해설 자리는 「가장 긴 고른 문장 + 해설」 높이로 미리 비운다(이 학년 전체에서 잰다)
// · 맞히면 「통과」 낙관(L-01)이 판 한가운데 크게 1.2초에 걸쳐 찍히고 1.2초 머문다
import { el, wait, replay } from '../lib/dom.js';
import { t } from '../lib/text.js';
import { T, reduced } from '../lib/timing.js';

export class CheckPanel {
  constructor(item, allItems, { keyboard, shakeTarget }) {
    this.item = item;
    this.keyboard = keyboard;
    this.shakeTarget = shakeTarget;
    this.value = '';
    this.stale = false;
    this.busy = false;
    this.correct = new Promise((r) => { this.resolve = r; });
    // 이 학년 포스터에 있는 코드 전부
    this.codes = new Map();
    for (const it of allItems) it.options.forEach((o, i) => this.codes.set(o.code, { it, i }));
    this.allExplains = [...allItems.flatMap((it) => it.options.filter((o) => o.explain).map((o) => [o.text, o.explain])), [null, t('Q-05')], [null, t('Q-06')]];

    this.cells = [0, 1, 2].map(() => el('span.cell'));
    this.cellRow = el('span.cells', { role: 'textbox', 'aria-label': '세 자리 숫자', tabindex: '0', onclick: () => this.tapCells() }, this.cells);
    this.button = el('button.btn.confirm', { type: 'button', text: t('B-07'), disabled: true, onclick: () => this.submit() });
    this.explain = el('p.explain', { 'aria-live': 'polite' });
    this.sizer = el('p.explain.sizer', { 'aria-hidden': 'true' });
    this.row = el('div.code-row', {}, [this.cellRow, this.button]);
    this.seal = el('span.seal', { text: t('L-01'), 'aria-hidden': 'true' });
    this.el = el('div.panel.panel-check', {}, [
      el('p.head', { text: t('Q-04') }),
      el('p.question', { text: item.question }),
      this.explain, this.sizer, this.row, this.seal,
    ]);
    this.onDocKey = (e) => {
      if (!this.el.isConnected || this.keyboard.isOpen || this.busy) return;
      if (/^[0-9]$/.test(e.key)) { e.preventDefault(); this.type(e.key); }
      else if (e.key === 'Backspace') { e.preventDefault(); this.del(); }
      else if (e.key === 'Enter') { e.preventDefault(); this.submit(); }
    };
    document.addEventListener('keydown', this.onDocKey);
    this.drawCells();
  }

  destroy() { document.removeEventListener('keydown', this.onDocKey); }

  // 해설 자리 — 이 학년의 해설 가운데 가장 긴 것의 높이만큼 미리 비워 둔다
  measure() {
    let h = 0;
    for (const [picked, msg] of this.allExplains) { fill(this.sizer, picked, msg); h = Math.max(h, this.sizer.offsetHeight); }
    this.sizer.textContent = '';
    this.explain.style.minHeight = `${h}px`;
  }

  drawCells() {
    this.cells.forEach((c, i) => {
      c.textContent = this.value.charAt(i);
      c.classList.toggle('cursor', this.keyboard.isOpen && !this.stale && !this.busy && i === this.value.length);
    });
    this.cellRow.classList.toggle('stale', this.stale);
    this.button.disabled = this.value.length < 3 || this.busy;
  }
  fresh() { if (this.stale) { this.value = ''; this.stale = false; } }
  type(d) { if (this.busy) return; this.fresh(); if (this.value.length < 3) this.value += d; this.drawCells(); }
  del() { if (this.busy) return; if (this.stale) this.fresh(); else this.value = this.value.slice(0, -1); this.drawCells(); }

  tapCells() {
    if (this.busy) return;
    this.fresh();
    this.keyboard.onDigit = (d) => this.type(d);
    this.keyboard.onBackspace = () => this.del();
    this.keyboard.onEnter = () => this.submit();
    this.keyboard.onAtom = null;
    this.keyboard.open('numeric');
    this.drawCells();
  }

  async submit() {
    if (this.busy || this.value.length < 3) return;
    this.explain.classList.remove('on');              // 확인을 누르는 순간 앞 해설이 사라진다
    this.keyboard.close();                            // 자판이 내려간다 — 판이 제자리로 와 물음·해설이 다 보인다
    const hit = this.codes.get(Number(this.value));
    if (hit && hit.it === this.item && hit.i + 1 === this.item.answer) { await this.right(); return; }
    const own = hit && hit.it === this.item;
    const msg = !hit ? t('Q-05') : !own ? t('Q-06') : hit.it.options[hit.i].explain;
    this.stale = true;
    this.busy = true;
    this.drawCells();
    replay(this.shakeTarget(), 'shake');               // 흔들림 → 해설 (틀렸다는 글은 없다)
    await wait(reduced() ? 0 : T.boardShake);
    fill(this.explain, own ? hit.it.options[hit.i].text : null, msg);
    this.explain.classList.toggle('center', !own);
    void this.explain.offsetWidth;
    this.explain.classList.add('on');
    this.busy = false;
    this.drawCells();
  }

  async right() {
    this.busy = true;
    this.drawCells();
    this.seal.classList.add('on');
    await wait(reduced() ? 600 : T.sealStamp + T.sealHold);
    this.resolve();
  }

  mustSeeBottom() { return this.row.getBoundingClientRect().bottom; }
}

// 해설 자리 채우기 — 고른 문장(인용선 + ✕)과 해설 · 고른 문장이 없으면 안내만
function fill(p, picked, msg) {
  p.replaceChildren(...(picked ? [el('span.picked', { text: picked }), el('span.why', { text: msg })] : [msg]));
}
