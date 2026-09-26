// 힌트 퀴즈 판(곁길) — 지도에서 실마리 곳에 닿아 인물의 말을 누르면 뜬다 (기2 · 요소정의 10-1 · 10-4-1)
//   판 맨 위 Q-03 머리 안내(Q-01과 같은 자리) · 판 오른쪽 위 「돌아가기」(B-06 — 실마리 자리)
//   판 왼쪽 위 「2 / 3」 — 이 자모 판의 실마리 가운데 몇 번째(근정전은 여기서 풀 문제 가운데 몇 번째 · 기6)
//   가운데 일화 문장(④ 1.6 · 없는 문항은 물음만) → 물음(③ 1.85) → 보기 한 줄(초등 3 · 중등 4 · ④ 1.6)
// · 틀리면 글 없이 판이 흔들리고 그 보기가 흐려지며 가로줄 · 다시 누를 수 없다
// · 맞히면 나머지 보기가 물러나고 고른 보기가 먹빛으로 차며 살짝 커졌다 내려앉는다 → 1.4초 → 뒤로 넘어간다
// · 해설이 없다(정답에도 오답에도) · 보기 차례는 섞는다(「차례대로」인 세 문항만 그대로)
import { el, wait, replay, shuffle } from '../lib/dom.js';
import { t } from '../lib/text.js';
import { T } from '../lib/timing.js';

export class HintPanel {
  constructor(q, { shakeTarget, counter, head = 'Q-03', back = true }) {
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
      // 근정전에서는 「돌아가기」가 없다 — 다 풀어야 지나가고 돌아가서 풀 자모 판이 없다 (2026-09-26)
      back ? el('button.btn.corner', { type: 'button', text: t('B-06'), onclick: () => { if (!this.busy) { this.busy = true; this.resolve('back'); } } }) : null,
      counter ? el('p.count', { text: `${counter[0]} / ${counter[1]}`, 'aria-label': `${counter[1]}개 가운데 ${counter[0]}번째` }) : null,
      // 근정전은 Q-07(맞혀도 자모가 채워지지 않는다) · 문장마다 한 줄
      el('p.head', {}, t(head).split(/(?<=[.!?]) /).map((l) => el('span.line', { text: l }))),
      q.episode ? el('p.episode', { text: q.episode }) : null,
      el('p.question', { text: q.question }),
      opts,
    ]);
  }
}
