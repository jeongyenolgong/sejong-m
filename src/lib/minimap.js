// 미니맵 — 오른쪽 위에 떠 있는 상자 · 지도 화면에만 · 누를 수 없다 (요소정의 0-3)
// 자리 여덟을 다 세운다(D-01-1 ~ D-01-8). 지난 자리 ● · 지금 자리 붉은 ● · 아직 안 간 자리 ○
import { el } from './dom.js';
import { t } from './text.js';

export function minimap(now) {
  const rows = [];
  for (let i = 7; i >= 0; i--) {
    const state = i < now ? 'past' : i === now ? 'now' : 'future';
    rows.push(el(`div.mrow.${state}`, {}, [el('span.mdot'), el('span.mname', { text: t(`D-01-${i + 1}`) })]));
  }
  return el('div.minimap', { 'aria-hidden': 'true' }, rows);
}
