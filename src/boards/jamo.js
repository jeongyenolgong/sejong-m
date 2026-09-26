// 자모 조합 판 — 세 영역 (요소정의 5-2-3 · 6 · 7 · 8 · 8-1 · 8-2 · 9 · 10 · 11-1)
//   ① 머리  Q-01 할 일 안내(판 맨 위 · ④ 1.6 굵게)            판 오른쪽 위: 실마리 B-04 · 판 왼쪽 위: 「2 / 3」 이 문의 몇 번째 판(기5)
//   ② 문제  문장 + 빈칸(빈칸 길이는 낱말의 음절 수를 따른다 · 두 줄로 쪼개지지 않는다)
//   ③ 조합 영역(테두리 하나) — 음절 칸 · 그 아래 조각 한 줄 · 맨 아래 Q-02 넣는 법 안내
//
// · 조각은 그 낱말의 것만, 한 줄로, 차례만 난수 — 정답 차례와 같으면 다시 섞는다
// · 칸은 음절 수만 보인다(칸 안의 자모 배치는 조각을 놓아야 드러난다)
// · 한 음절 안에서는 차례를 안 지켜도 제자리에 앉는다 · 안 맞으면 조각은 돌아가고 그 칸이 흔들린다 · 글은 없다
// · 자판으로 친 자모는 커서가 있는 칸으로만 간다 · 커서는 칸을 누르거나 자판을 칠 때 첫 빈 칸에 · ← → 로 옮긴다
// · 연습 판(기1) — 실마리가 반짝이고, 실마리를 누르기 전에는 조각이 움직이지 않는다(끌어도 안 따라옴 · 자판도 안 들어감)
import { el, wait, replay, shuffle } from '../lib/dom.js';
import { t } from '../lib/text.js';
import { compose, layoutOf, atomsOf, join, keyToJamo } from '../lib/hangul.js';
import { T, reduced } from '../lib/timing.js';

// 한 번 누르면 나오는 자모 — 겹자모의 뒤 반쪽이 될 수 있는 것들
const SINGLE = [...'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎㅏㅐㅑㅓㅔㅕㅗㅜㅡㅣ'];

export class JamoPanel {
  constructor(item, { onHint, keyboard, counter, practice = false, maxHints }) {
    this.item = item;
    this.keyboard = keyboard;
    this.maxHints = maxHints ?? item.syllables.length;
    this.hLeft = this.maxHints;              // 실마리를 쓸 수 있는 수 = 음절 수 (버튼에 적지 않는다 · 연습 판은 한 번)
    this.locked = practice;
    this.cursorOn = false;
    this.sel = 0;
    this.pending = null;                     // 겹자모의 앞 반쪽(ㄹ → ㄼ 을 기다리는 중)
    this.solved = false;
    this.done = new Promise((r) => { this.resolveDone = r; });

    this.hintBtn = el(`button.btn.corner${practice ? '.glow' : ''}`, { type: 'button', text: t('B-04'), onclick: () => { this.hintBtn.classList.remove('glow'); onHint(); } });
    this.boxes = item.syllables.map((parts) => ({ parts, got: parts.map(() => null), node: null }));
    this.slots = el('div.slots', {}, this.boxes.map((b, i) => {
      b.node = el('span.syl-box', { 'data-t': layoutOf(b.parts), onclick: () => this.tapBox(i) });
      this.draw(b);
      return b.node;
    }));

    // 조각 — 한 줄로 늘어놓고 차례만 섞는다
    const answer = item.syllables.flat();
    let order;
    let tries = 0;
    do { order = shuffle(answer.slice()); tries++; } while (order.join('') === answer.join('') && tries < 30);
    this.pieces = order.map((ch) => {
      const p = el('span.piece', { text: ch });
      p.addEventListener('pointerdown', (e) => this.drag(e, p));
      return p;
    });
    this.pool = el('div.pool', {}, this.pieces);

    this.blank = el('span.blank', {}, [el('span.word', { text: item.word })]);
    this.work = el('div.work', {}, [this.slots, this.pool, el('p.howto', { text: t('Q-02') })]);
    this.el = el(`div.panel.panel-jamo${practice ? '.locked' : ''}`, {}, [
      this.hintBtn,
      counter ? el('p.count', { text: `${counter[0]} / ${counter[1]}`, 'aria-label': `${counter[1]}개 가운데 ${counter[0]}번째` }) : null,
      el('p.head', { text: t('Q-01') }),
      el('p.sentence', {}, [item.before, this.blank, item.after]),
      this.work,
    ]);

    this.onDocKey = (e) => this.docKey(e);
    document.addEventListener('keydown', this.onDocKey);
  }

  destroy() { document.removeEventListener('keydown', this.onDocKey); }
  unlock() { this.locked = false; this.el.classList.remove('locked'); }

  // ── 칸 그리기 ──
  draw(b) {
    const n = b.node;
    const full = b.got.every(Boolean);
    n.textContent = '';
    n.classList.toggle('done', full);
    n.classList.toggle('some', !full && b.got.some(Boolean));
    if (full) { n.textContent = compose(b.parts); return; }    // 음절이 다 차면 한 글자로 모인다
    const t3 = n.dataset.t;
    b.got.forEach((g, i) => {
      if (!g) return;
      const j = el(`span.j.j${i}`, { text: g });
      j.style.gridArea = t3 === 'v3' && i === 2 ? '2 / 1 / 3 / 3' : t3.startsWith('v') ? `1 / ${i + 1}` : `${i + 1} / 1`;
      n.append(j);
    });
  }
  markCursor() {
    this.boxes.forEach((b, i) => b.node.classList.toggle('cursor', this.cursorOn && i === this.sel && !b.got.every(Boolean)));
  }
  firstEmpty(from = -1) {
    for (let k = 1; k <= this.boxes.length; k++) {
      const i = (from + k + this.boxes.length) % this.boxes.length;
      if (!this.boxes[i].got.every(Boolean)) return i;
    }
    return -1;
  }

  // 조각 하나를 줄에서 빼 쓴다
  spend(ch) {
    const p = this.pieces.find((x) => x.textContent === ch && !x.classList.contains('used'));
    if (!p) return false;
    p.classList.add('used');
    return true;
  }

  // 이 칸의 빈 자리에 ch가 들어가면 넣는다
  fill(i, ch) {
    const b = this.boxes[i];
    if (!b) return false;
    const k = b.parts.findIndex((part, idx) => part === ch && !b.got[idx]);
    if (k < 0 || !this.spend(ch)) return false;
    b.got[k] = ch;
    this.draw(b);
    if (b.got.every(Boolean) && this.sel === i) { this.sel = this.firstEmpty(i); }
    this.markCursor();
    this.check();
    return true;
  }

  shakeBox(i) {
    const b = this.boxes[i];
    if (b) replay(b.node, 'shake');
  }

  // ── 끌어다 놓기 ──
  drag(e, p) {
    if (p.classList.contains('used') || this.solved || this.busy || this.locked) return;
    e.preventDefault();
    // 조각을 끌어당기는 순간 자판이 내려가고 커서도 사라진다
    this.keyboard.close();
    this.cursorOn = false;
    this.markCursor();
    const ghost = el('span.ghost-piece', { text: p.textContent });
    document.body.append(ghost);
    const size = parseFloat(getComputedStyle(p).fontSize);
    ghost.style.fontSize = `${size}px`;
    const move = (ev) => { ghost.style.left = `${ev.clientX}px`; ghost.style.top = `${ev.clientY}px`; };
    move(e);
    p.classList.add('lifted');
    const up = (ev) => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
      ghost.remove();
      p.classList.remove('lifted');
      const target = document.elementFromPoint(ev.clientX, ev.clientY);
      const box = target && target.closest ? target.closest('.syl-box') : null;
      if (!box) return;
      const i = this.boxes.findIndex((b) => b.node === box);
      if (!this.fill(i, p.textContent)) this.shakeBox(i);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
  }

  // ── 자판 ──
  tapBox() {
    if (this.solved || this.busy || this.locked) return;
    // 칸을 누르면 자판이 올라온다 — 커서는 누른 칸이 아니라 첫 빈 칸에
    this.cursorOn = true;
    this.sel = this.firstEmpty();
    this.markCursor();
    this.keyboard.onAtom = (a) => this.feed(a);
    this.keyboard.onEnter = null;
    this.keyboard.open('text');
  }

  docKey(e) {
    // 판을 두고 지도로 나가 있는 동안(문 앞 화면이 떨어져 있거나 · 튜토리얼에서 판을 치워 둔 동안)에는 화살표가 캐릭터 몫이다
    if (this.solved || this.busy || this.locked || this.keyboard.isOpen || !this.el.isConnected || this.el.closest('.away')) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {          // ← → 로 커서를 옆 빈 칸으로
      e.preventDefault();
      const d = e.key === 'ArrowLeft' ? -1 : 1;
      let i = this.cursorOn ? this.sel : -1;
      for (let n = 0; n < this.boxes.length; n++) {
        i = (i + d + this.boxes.length) % this.boxes.length;
        if (!this.boxes[i].got.every(Boolean)) { this.sel = i; this.cursorOn = true; this.markCursor(); break; }
      }
      return;
    }
    const ch = keyToJamo(e.key);
    if (!ch) return;
    e.preventDefault();
    for (const a of atomsOf(ch)) this.feed(a);
  }

  // 자판으로 들어온 자모 하나 — 커서가 있는 칸으로만 간다. 겹자모는 두 번 눌러야 한 조각이 된다
  feed(atom) {
    if (this.solved || this.busy) return;
    if (!this.cursorOn || this.sel < 0) { this.cursorOn = true; this.sel = this.firstEmpty(); this.markCursor(); }
    const i = this.sel;
    if (i < 0) return;
    const b = this.boxes[i];
    const empty = b.parts.filter((part, idx) => !b.got[idx]);
    if (this.pending) {
      const j = join(this.pending, atom);
      this.pending = null;
      if (j && empty.includes(j)) { this.fill(i, j); return; }
      this.shakeBox(i);
    }
    if (empty.includes(atom)) { this.fill(i, atom); return; }
    // 겹자모의 앞 반쪽이면 다음 자모를 기다린다(ㄹ 다음에 ㅂ이 오면 ㄼ · 천지인 등에서 ㅅ+ㅅ → ㅆ)
    if (empty.some((part) => part !== atom && SINGLE.some((x) => join(atom, x) === part))) {
      this.pending = atom;
      return;
    }
    this.shakeBox(i);
  }

  // ── 실마리가 넣는 조각 — 가장 앞 빈 첫소리 → 첫소리가 다 찼으면 가장 앞의 빈 모음·받침 (요소정의 10) ──
  target() {
    for (const b of this.boxes) if (!b.got[0]) return { b, k: 0 };
    for (const b of this.boxes) { const k = b.got.findIndex((g) => !g); if (k >= 0) return { b, k }; }
    return null;
  }
  get hintsUsed() { return this.maxHints - this.hLeft; }

  // 돌아와 잠깐 멈춤 → 조각 줄에서 그 조각이 짙어지며 떠오름 → 스스로 제 칸으로 날아가 앉음 → 칸 둘레에 먹이 번짐
  async giveHint(host) {
    const tg = this.target();
    if (!tg) return;
    const ch = tg.b.parts[tg.k];
    const p = this.pieces.find((x) => x.textContent === ch && !x.classList.contains('used'));
    if (!p) return;
    this.hLeft -= 1;
    this.hintBtn.disabled = this.hLeft <= 0;                 // 다 쓰면 「누를 수 없음」 — 남은 수는 버튼에 적지 않는다
    this.busy = true;
    const seat = () => { tg.b.got[tg.k] = ch; p.classList.remove('lift'); p.classList.add('used'); this.draw(tg.b); };
    if (reduced()) { seat(); this.busy = false; this.check(); return; }
    await wait(T.hintFillPause);
    p.classList.add('lift');
    await wait(T.hintFillLift);
    const hostBox = host.getBoundingClientRect();
    const from = p.getBoundingClientRect();
    seat();
    const node = tg.b.node.classList.contains('done') ? tg.b.node : tg.b.node.querySelector(`.j${tg.k}`);
    node.classList.add('wait');
    const to = node.getBoundingClientRect();
    const fly = el('span.flyer', { text: ch });
    fly.style.left = `${from.left - hostBox.left}px`;
    fly.style.top = `${from.top - hostBox.top}px`;
    fly.style.fontSize = getComputedStyle(p).fontSize;
    host.append(fly);
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      fly.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(1)`;
    }));
    await wait(T.hintFillFly + 20);
    fly.remove();
    node.classList.remove('wait');
    replay(tg.b.node, 'ink');
    await wait(T.hintFillInk);
    tg.b.node.classList.remove('ink');
    this.busy = false;
    this.check();
  }

  // ── 다 맞혔을 때 (11-1) ──
  //  ① 칸마다 한 글자로 모인다 · 본다 0.9 → ② 조합 영역이 옅어지며 걷히고 문장이 가운데로 0.9
  //  → ③ 빈칸에 단어가 천천히 떠오른다 1.6 → ④ 쉼 1.4 → (판이 점검 퀴즈로 넘어간다 — board.js)
  async check() {
    if (this.solved || !this.boxes.every((b) => b.got.every(Boolean))) return;
    this.solved = true;
    this.cursorOn = false;
    this.markCursor();
    this.keyboard.close();
    if (reduced()) { this.el.classList.add('cleared'); this.blank.classList.add('filled'); this.resolveDone(); return; }
    await wait(T.jamoSee);
    this.el.classList.add('cleared');                         // 걷힐 때 실마리 버튼도 함께 사라진다
    await wait(T.jamoClear);
    this.blank.classList.add('filled');
    await wait(T.jamoFill + T.jamoHold);
    this.resolveDone();
  }

  // 자판이 올라왔을 때 꼭 보여야 하는 것의 아래끝(px) — 조각 줄(그 위의 칸도 따라 올라온다)
  mustSeeBottom() {
    let bottom = 0;
    for (const p of this.pieces) if (!p.classList.contains('used')) bottom = Math.max(bottom, p.getBoundingClientRect().bottom);
    for (const b of this.boxes) bottom = Math.max(bottom, b.node.getBoundingClientRect().bottom);
    return bottom;
  }
}
