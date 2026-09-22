// 문제판 — 문 한가운데 한 덩어리 판. 크기는 하나(가로 74 × 세로 38.5)이고 안의 것만 갈린다 (요소정의 5-2 · 5-2-1)
//   빗장 하나 = 자모 조합 → (막히면 실마리 → 힌트 퀴즈 ↔ 자모 조합) → 한지 넘김 → 점검 퀴즈 → 「통과」 → 판이 걷힌다
// · 닫기 버튼이 없다 · 판 밖을 눌러도 닫히지 않는다(화면 자판만 내려간다)
// · 판이 떠 있는 동안 뒤는 늘 어둡다 — 세 판이 같다 · 밝아지는 때는 판이 걷힐 때 하나뿐 (10-4)
// · 곁길(힌트 퀴즈)만 본선과 가른다 — 판이 어긋나게 얹히고(2.8) 바탕이 다른 장의 종이가 된다 (10-4-1)
// · 화면 자판이 올라오면 꼭 보여야 할 줄의 아래끝이 자판 위끝에서 두 뼘(1.8) 위에 오도록 판을 밀어 올린다 (8-2)
import { el, wait } from '../lib/dom.js';
import { config, imageUrl } from '../lib/assets.js';
import { DeviceKeyboard } from '../lib/devicekb.js';
import { T, reduced } from '../lib/timing.js';
import { JamoPanel } from './jamo.js';
import { HintPanel } from './hint.js';
import { CheckPanel } from './check.js';
import { turnPage } from './pageturn.js';
import jamoData from '../data/jamo.json';
import hintData from '../data/hint.json';
import checkData from '../data/check.json';

export class Board {
  constructor(layer, dim) {
    this.layer = layer;
    this.dim = dim;
  }

  async run(jamoId) {
    const item = jamoData.find((j) => j.id === jamoId);
    const hints = hintData.filter((h) => h.word === item.word).sort((a, b) => a.step - b.step);
    const check = checkData.find((c) => c.word === item.word);
    const [main, side] = await Promise.all([config('el_hanji_main'), config('el_hanji_side')]);
    this.paperMain = imageUrl(main.file);
    this.paperSide = imageUrl(side.file);

    // ── 판 세우기 ──
    this.under = el('div.underboard.paper', { style: { backgroundImage: `url("${this.paperMain}")` } });
    this.board = el('div.board.paper', { style: { backgroundImage: `url("${this.paperMain}")` } });
    this.frame = el('div.board-frame', {}, [this.under, this.board]);
    this.layer.append(this.frame);
    this.keyboard = new DeviceKeyboard(this.layer);
    this.keyboard.onHeight = () => this.fitKeyboard();

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
      onHint: async () => {
        if (busy || jamo.solved || jamo.busy || jamo.hLeft <= 0) return;
        busy = true;
        await this.openHint(jamo, hints[Math.min(jamo.hintsUsed, hints.length - 1)]);
        busy = false;
      },
    });
    this.show(jamo);
    this.dim.classList.add('on');
    this.frame.classList.add('on');
    await wait(reduced() ? 0 : T.noticeFade);

    await jamo.done;
    jamo.destroy();

    // ② 한지가 넘어가 점검 퀴즈로 — 자판은 내려간다
    this.keyboard.close();
    const checkPanel = new CheckPanel(check, checkData, { keyboard: this.keyboard, shakeTarget: () => this.board });
    const jamoEl = jamo.el;
    this.show(checkPanel);
    checkPanel.measure();
    this.board.append(jamoEl);                  // 넘어가는 장의 모습을 떠 두려고 잠깐 붙인다
    const turning = turnPage(this.board, jamoEl, 'fwd', this.paperMain, this.frame);
    jamoEl.remove();
    await turning;

    // ③ 맞히면 낙관 → 판이 걷힌다(0.9초 · 옅어지며 조금 올라간다) · 뒤의 어둠도 함께 걷힌다
    await checkPanel.correct;
    checkPanel.destroy();
    this.frame.classList.add('lifting');
    this.dim.classList.remove('on');
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

  // 실마리 → 힌트 퀴즈 (한지가 앞으로 넘어간다) → 돌아가기 · 맞힘 (뒤로 넘어간다)
  async openHint(jamo, q) {
    this.keyboard.close();
    jamo.cursorOn = false;
    jamo.markCursor();
    const hint = new HintPanel(q, { shakeTarget: () => this.board });
    const jamoEl = jamo.el;
    // 앞으로 — 지금 장(자모 조합)이 넘어가며 곁길 판이 드러난다
    this.setSide(true);
    this.show(hint);
    this.board.append(jamoEl);
    const turning = turnPage(this.board, jamoEl, 'fwd', this.paperMain, this.frame);
    jamoEl.remove();
    await turning;

    const result = await hint.result;

    // 뒤로 — 떠날 때 그대로의 자모 조합 판이 되넘어와 덮는다
    await turnPage(this.board, jamoEl, 'back', this.paperMain, this.frame);
    this.setSide(false);
    this.show(jamo);
    if (result === 'right') await jamo.giveHint(this.board);
  }

  setSide(on) {
    this.frame.classList.toggle('aside', on);
    this.board.style.backgroundImage = `url("${on ? this.paperSide : this.paperMain}")`;
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
