// 문제판 — 문 한가운데 한 덩어리 판. 크기는 하나(가로 74 × 세로 38.5)이고 안의 것만 갈린다 (요소정의 5-2 · 5-2-1)
//   빗장 하나 = 자모 조합 → (막히면 실마리 → 지도로 나가 곳을 찾아가 힌트 퀴즈 → 자모 조합) → 한지 넘김 → 점검 퀴즈 → 「통과」 → 판이 걷힌다
// · 닫기 버튼이 없다 · 판 밖을 눌러도 닫히지 않는다(화면 자판만 내려간다)
// · 판이 떠 있는 동안 뒤는 늘 어둡다 — 세 판이 같다 · 밝아지는 때는 판이 걷힐 때 하나뿐 (10-4)
// · 곁길(힌트 퀴즈)만 본선과 가른다 — 판이 어긋나게 얹히고(2.8) 바탕이 다른 장의 종이가 된다 (10-4-1)
// · 화면 자판이 올라오면 꼭 보여야 할 줄의 아래끝이 자판 위끝에서 두 뼘(1.8) 위에 오도록 판을 밀어 올린다 (8-2)
// · 실마리를 누르면 판을 두고 지도로 나간다 — 힌트 퀴즈는 지도에서 곳에 닿았을 때 뜬다(기2 · hintBoard) ·
//   마치면 이 판으로 바로 돌아온다 · 맞혔으면 실마리 조각이 제 칸에 앉는다
import { el, wait } from '../lib/dom.js';
import { config, imageUrl } from '../lib/assets.js';
import { DeviceKeyboard } from '../lib/devicekb.js';
import { t } from '../lib/text.js';
import { T, reduced } from '../lib/timing.js';
import { JamoPanel } from './jamo.js';
import { HintPanel } from './hint.js';
import { CheckPanel } from './check.js';
import { turnPage } from './pageturn.js';
import jamoData from '../data/jamo.json';
import hintData from '../data/hint.json';
import checkData from '../data/check.json';

async function papers() {
  const [main, side] = await Promise.all([config('el_hanji_main'), config('el_hanji_side')]);
  return [imageUrl(main.file), imageUrl(side.file)];
}

// 이 낱말의 힌트 퀴즈 — 걸음 차례
export const hintsOf = (word) => hintData.filter((h) => h.word === word).sort((a, b) => a.step - b.step);

export class Board {
  constructor(layer, dim) {
    this.layer = layer;
    this.dim = dim;
  }

  // item — 자모 조합 문장(jamo.json 한 줄 · 연습 판은 practice.json)
  // counter — 판 왼쪽 위 「k / n」 (이 문의 몇 번째 판 · 기5)
  // seekHint(q, k, n) — 실마리를 눌렀을 때: 지도로 나가 곳을 찾아가 힌트 퀴즈를 풀고 돌아온다 → 'right' | 'back'
  //   (k = 이 판의 몇 번째 실마리 · n = 이 판의 실마리 수) · 판은 그동안 그대로 두고 문 앞 화면이 다시 붙으면 이어진다
  // practice — 튜토리얼 연습 판: 실마리가 반짝이고 누르기 전에는 조각이 움직이지 않는다 · 실마리는 한 번 · 점검 퀴즈 대신 설명 (기1)
  // onLift — 판이 걷히기 시작할 때 부른다(캐릭터·조작키를 다시 보이게 한다)
  async run(item, { onLift, counter, seekHint, practice = null, hints = null, onHintUsed } = {}) {
    const qs = hints || hintsOf(item.word);
    const [paperMain, paperSide] = await papers();
    this.paperMain = paperMain;
    this.paperSide = paperSide;

    // ── 판 세우기 ──
    this.under = el('div.underboard.paper', { style: { backgroundImage: `url("${this.paperMain}")` } });
    this.board = el('div.board.paper', { style: { backgroundImage: `url("${this.paperMain}")` } });
    this.frame = el('div.board-frame', {}, [this.under, this.board]);
    this.layer.append(this.frame);
    this.keyboard = new DeviceKeyboard(this.layer);
    this.keyboard.onHeight = () => this.fitKeyboard();
    // 기기 자판의 내리기 키로 내려가도 커서가 사라진다 (8-2)
    this.keyboard.onClose = () => {
      if (this.panel && this.panel.markCursor) { this.panel.cursorOn = false; this.panel.markCursor(); }
      if (this.panel && this.panel.drawCells) this.panel.drawCells();
    };

    // 판 밖(빈 곳)을 누르면 자판만 내려간다
    this.onOutside = (e) => {
      if (!this.keyboard.isOpen) return;
      if (e.target.closest('.syl-box, .piece, .cells, .btn, .option')) return;
      this.keyboard.close();
      if (this.panel && this.panel.markCursor) { this.panel.cursorOn = false; this.panel.markCursor(); }
      if (this.panel && this.panel.drawCells) this.panel.drawCells();
    };
    this.layer.addEventListener('pointerdown', this.onOutside);
    this.dim.addEventListener('pointerdown', this.onOutside);

    // ① 자모 조합
    let busy = false;
    const jamo = new JamoPanel(item, {
      keyboard: this.keyboard,
      counter,
      practice: !!practice,
      maxHints: practice ? 1 : item.syllables.length,
      onHint: async () => {
        if (busy || jamo.solved || jamo.busy || jamo.hLeft <= 0) return;
        busy = true;
        jamo.unlock();                                 // 연습 판 — 실마리를 누른 순간 조각이 풀린다
        this.keyboard.close();
        jamo.cursorOn = false;
        jamo.markCursor();
        const k = jamo.hintsUsed;
        const result = await seekHint(qs[Math.min(k, qs.length - 1)], k + 1, practice ? 2 : item.syllables.length);
        if (result === 'right') { if (onHintUsed) onHintUsed(); await jamo.giveHint(this.board); }
        busy = false;
      },
    });
    this.show(jamo);
    this.dim.classList.add('on');
    this.frame.classList.add('on');
    await wait(reduced() ? 0 : T.noticeFade);

    await jamo.done;
    jamo.destroy();

    // ② 한지가 넘어가 점검 퀴즈로(연습 판은 점검 퀴즈 설명으로) — 자판은 내려간다
    this.keyboard.close();
    const next = practice
      ? new ExplainPanel(practice)
      : new CheckPanel(checkData.find((c) => c.word === item.word), checkData, { keyboard: this.keyboard, shakeTarget: () => this.board });
    const jamoEl = jamo.el;
    this.show(next);
    if (next.measure) next.measure();
    this.board.append(jamoEl);                  // 넘어가는 장의 모습을 떠 두려고 잠깐 붙인다
    const turning = turnPage(this.board, jamoEl, 'fwd', this.paperMain, this.frame);
    jamoEl.remove();
    await turning;

    // ③ 맞히면 낙관 → 판이 걷힌다(0.9초 · 옅어지며 조금 올라간다) · 뒤의 어둠도 함께 걷힌다 · 연습 판은 [닫기]로 낙관 없이 걷힌다
    await next.correct;
    if (next.destroy) next.destroy();
    await this.lift(onLift);
  }

  async lift(onLift) {
    this.frame.classList.add('lifting');
    this.dim.classList.remove('on');
    if (onLift) onLift();
    await wait(reduced() ? 0 : T.boardLift);
    this.keyboard.destroy();
    this.layer.removeEventListener('pointerdown', this.onOutside);
    this.dim.removeEventListener('pointerdown', this.onOutside);
    this.frame.remove();
  }

  show(panel) {
    this.panel = panel;
    this.board.replaceChildren(panel.el);
  }

  // 화면 자판이 올라오면 판을 밀어 올린다
  fitKeyboard() {
    const kb = this.keyboard.height();
    if (!kb || !this.panel || !this.panel.mustSeeBottom) { this.frame.style.removeProperty('--lift'); this.frame.classList.remove('kb'); return; }
    const u = this.frame.offsetWidth / 74;
    const kbTop = window.innerHeight - kb;
    // 지금 밀려 올라간 만큼을 되돌려 원래 자리의 아래끝을 구한다
    const original = this.panel.mustSeeBottom() + (parseFloat(this.frame.style.getPropertyValue('--lift')) || 0);
    const lift = Math.max(0, original - (kbTop - 1.8 * u));
    this.frame.classList.add('kb');
    this.frame.style.setProperty('--lift', `${lift}px`);
  }
}

// 힌트 퀴즈 판(곁길) — 지도에서 곳에 닿아 인물의 말을 누르면 뜬다 (기2 · 10-1 · 10-4-1)
//   판은 본선 판과 같은 자리 · 어긋나게 얹힌 곁길 종이 · 왼쪽 위 「k / n」 · 맞히면 1.4초 뒤 · 「돌아가기」면 바로 걷힌다
//   seal — 근정전 마지막 문제를 맞히면 판 한가운데 「통과」 낙관(점검 퀴즈와 같음 · 기6)
//   → 'right' | 'back'
export async function hintBoard(layer, dim, q, counter, { seal = false } = {}) {
  const [paperMain, paperSide] = await papers();
  const under = el('div.underboard.paper', { style: { backgroundImage: `url("${paperMain}")` } });
  const board = el('div.board.paper', { style: { backgroundImage: `url("${paperSide}")` } });
  const frame = el('div.board-frame.aside', {}, [under, board]);
  const hint = new HintPanel(q, { shakeTarget: () => board, counter });
  board.append(hint.el);
  layer.append(frame);
  dim.classList.add('on');
  await wait(20);
  frame.classList.add('on');
  const result = await hint.result;
  if (result === 'right' && seal) {
    const s = el('span.seal', { text: t('L-01'), 'aria-hidden': 'true' });
    board.append(s);
    await wait(20);
    s.classList.add('on');
    await wait(reduced() ? 600 : T.sealStamp + T.sealHold);
  }
  frame.classList.add('lifting');
  dim.classList.remove('on');
  await wait(reduced() ? 0 : T.boardLift);
  frame.remove();
  return result;
}

// 연습 판 — 점검 퀴즈 자리의 설명 (기1 · U-04) · [닫기]로 판이 걷힌다(낙관 없이)
//   pics.tablet — 태블릿 틀 안의 실제 점검 퀴즈 화면 · pics.poster — 실제 포스터 한 장(두 줄이 모두 오답인 장) · 학년대로
class ExplainPanel {
  constructor(pics) {
    this.correct = new Promise((r) => { this.resolve = r; });
    const close = el('button.btn.notice-close', { type: 'button', text: t('B-08'), onclick: () => this.resolve() });
    this.el = el('div.panel.panel-explain', {}, [
      el('p.lead', { text: t('U-04') }),
      el('div.pics', {}, [
        el('div.tablet', {}, [el('img', { src: imageUrl(pics.tablet), alt: '' })]),
        el('img.poster', { src: imageUrl(pics.poster), alt: '' }),
      ]),
      close,
    ]);
  }
}
