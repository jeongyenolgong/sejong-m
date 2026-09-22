// 힌트 퀴즈 판(곁길) — 실마리를 누르면 한지가 앞으로 넘어가 이 판이 된다 (요소정의 10-1 · 10-1-1 · 10-4-1)
//   판 맨 위 Q-03 머리 안내(Q-01과 같은 자리) · 판 오른쪽 위 「돌아가기」(B-06 — 실마리 자리)
//   가운데 일화 문장(④ 1.6 · 없는 문항은 물음만) → 물음(③ 1.85) → 보기 한 줄(초등 3 · 중등 4 · ④ 1.6)
// · 틀리면 글 없이 판이 흔들리고 그 보기가 흐려지며 가로줄 · 다시 누를 수 없다
// · 맞히면 나머지 보기가 물러나고 고른 보기가 먹빛으로 차며 살짝 커졌다 내려앉는다 → 1.4초 → 뒤로 넘어간다
// · 해설이 없다(정답에도 오답에도) · 보기 차례는 섞는다(「차례대로」인 세 문항만 그대로)
import { el, wait, replay, shuffle } from '../lib/dom.js';
import { t } from '../lib/text.js';
import { T } from '../lib/timing.js';

export class HintPanel {
  constructor(q, { shakeTarget }) {
    this.result = new Promise((r) => { this.resolve = r; });
    const order = q.options.map((_, i) => i);
    if (q.shuffle) shuffle(order);
    this.busy = false;
    const opts = el('div.options', {}, order.map((i) => {
      const b = el('button.option', { type: 'button', text: q.options[i] });
      b.addEventListener('click', async () => {
        if (this.busy || b.disabled) return;
        if (i + 1 !== q.answer) {                       // 틀림 — 흔들림과 보기 지워짐뿐
          replay(shakeTarget(), 'shake');
          b.classList.add('gone');
          b.disabled = true;
          return;
        }
        this.busy = true;                               // 맞힘
        for (const o of opts.children) if (o !== b) { o.classList.add('away'); o.disabled = true; }
        b.classList.add('right');
        await wait(T.hintRightHold);
        this.resolve('right');
      });
      return b;
    }));
    this.el = el('div.panel.panel-hint', {}, [
      el('button.btn.corner', { type: 'button', text: t('B-06'), onclick: () => { if (!this.busy) { this.busy = true; this.resolve('back'); } } }),
      el('p.head', { text: t('Q-03') }),
      q.episode ? el('p.episode', { text: q.episode }) : null,
      el('p.question', { text: q.question }),
      opts,
    ]);
  }
}
