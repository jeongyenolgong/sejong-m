// 알림창 — 도착하면 한가운데에 뜨고, 「닫기」(B-08)를 눌러야 조작키가 산다 (요소정의 5-3)
// 크기는 하나로 고정 — 가로 64 × 세로 33 · 이름 ② 2.4 · 본문 ④ 1.6 · 닫기 ④ 1.6
// 남는 틈은 본문과 「닫기」 사이 한 곳에 모인다(닫기가 창 바닥에 붙는다).
// 육조거리(Y-01 · Y-01b) · 문 다섯 · 근정전 — 모두 같은 창이다.
//
// 가운데 안내문 — 게임이 알려 주는 말(실마리 곳 · 근정전 관리 차례). 알림창과 같은 종이·폭 · 이름 없이 글 한 덩이 · 닫기.
// 인물의 말 — 자막 자리 한 줄 · 뒤는 딤 · 화면을 누르면 넘어간다(‹ › 없음). (기2 · 2026-09-23)
import { el, wait } from './dom.js';
import { t } from './text.js';
import { T, reduced } from './timing.js';

async function paperBox(layer, dim, box, close) {
  layer.append(box);
  dim.classList.add('on');
  await wait(20);
  box.classList.add('on');
  close.focus({ preventScroll: true });
  await new Promise((r) => close.addEventListener('click', r, { once: true }));
  box.classList.remove('on');
  dim.classList.remove('on');
  await wait(reduced() ? 0 : T.noticeFade);
  box.remove();
}

export function notice(layer, dim, titleText, bodies) {
  const close = el('button.btn.notice-close', { type: 'button', text: t('B-08') });
  const box = el('div.notice.paper', { role: 'dialog', 'aria-label': titleText }, [
    el('p.notice-name', { text: titleText }),
    ...bodies.filter(Boolean).map((b) => el('p.notice-body', { text: b })),
    el('div.notice-foot', {}, [close]),
  ]);
  return paperBox(layer, dim, box, close);
}

export function guide(layer, dim, text) {
  const close = el('button.btn.notice-close', { type: 'button', text: t('B-08') });
  const box = el('div.notice.guide.paper', { role: 'dialog', 'aria-label': text }, [
    el('p.notice-body', { text }),
    el('div.notice-foot', {}, [close]),
  ]);
  return paperBox(layer, dim, box, close);
}

// 인물의 말 — 화면을 누르면 풀린다 (Enter도 된다)
export async function say(screen, dim, text) {
  const cap = el('p.caption.say', { text });
  const tap = el('button.say-tap', { type: 'button', 'aria-label': text });
  screen.append(tap, cap);
  dim.classList.add('on');
  await wait(20);
  cap.classList.add('on');
  tap.focus({ preventScroll: true });
  await new Promise((r) => {
    // 걷던 화살표를 누른 채 닿아도 넘어가지 않게 — Enter · 빈칸만(누르고 있는 되풀이는 받지 않는다)
    const onKey = (e) => { if (!e.repeat && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); done(); } };
    const done = () => { document.removeEventListener('keydown', onKey); r(); };
    tap.addEventListener('click', done, { once: true });
    document.addEventListener('keydown', onKey);
  });
  cap.remove(); tap.remove();
}

// 조작키 바로 위 한 줄 — 단계가 끝나면 사라지고 다음 줄 (튜토리얼 U-01~U-03 · 근정전 U-11)
export class GuideLine {
  constructor(screen) { this.el = el('p.guide-line', { 'aria-live': 'polite' }); screen.append(this.el); }
  async show(text) {
    if (this.el.classList.contains('on')) { this.el.classList.remove('on'); await wait(reduced() ? 0 : T.noticeFade); }
    this.el.textContent = text;
    if (text) this.el.classList.add('on');
  }
  hide() { this.el.classList.remove('on'); }
}
