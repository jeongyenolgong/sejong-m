// 한지 한 장 넘김 — 판은 그대로, 판 안이 한 장 부드럽게 휘며 넘어간다 (요소정의 11-1 ⑤ · 10-1-1)
// · 3.2초 한 가지뿐 · 펼친 책으로 머무는 부분은 없다
// · 넘기는 동안 판이 줄고(0.63배) 책등(판 왼쪽 가장자리)이 화면 가운데로 간다
// · 앞면 = 판에 깔린 한지 그림 · 뒷면 = 같은 그림을 뒤집어 (2026-09-22)
// 한 장을 세로 띠 20개로 잘라 사슬처럼 잇고, 띠마다 기울기를 달리해 종이가 휜다.
import { el, animate, ease } from '../lib/dom.js';
import { T, reduced } from '../lib/timing.js';

const STRIPS = 20;

function buildSheet(frame, source, paperUrl) {
  const W = frame.offsetWidth, H = frame.offsetHeight, sw = W / STRIPS;
  const sheet = el('div.sheet');
  sheet.style.perspective = `${W * 2.4}px`;
  let parent = sheet;
  const strips = [];
  for (let i = 0; i < STRIPS; i++) {
    const st = el('div.strip', { style: { left: `${i === 0 ? 0 : sw}px`, width: `${sw + 0.6}px` } });
    const paper = { backgroundImage: `url("${paperUrl}")`, backgroundSize: `${W}px ${H}px`, backgroundPosition: `${-i * sw}px 0` };
    const front = el('div.face.front', { style: paper });
    const copy = el('div.page-copy', { style: { left: `${-i * sw}px`, width: `${W}px`, height: `${H}px` } });
    const c = source.cloneNode(true);
    c.removeAttribute('id');
    c.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
    copy.append(c);
    const shade = el('div.shade');
    front.append(copy, shade);
    // 뒷면 — 같은 한지를 뒤집어
    const back = el('div.face.back', { style: { ...paper, backgroundPosition: `${-(STRIPS - 1 - i) * sw}px 0` } });
    const bshade = el('div.shade');
    back.append(bshade);
    st.append(front, back);
    parent.append(st);
    parent = st;
    strips.push({ el: st, shade, bshade });
  }
  strips[0].el.firstChild.style.borderLeft = '1px solid rgba(31,28,23,.42)';
  frame.append(sheet);
  sheet.draw = (p) => {
    const e = ease(p);                                   // 천천히 들고, 천천히 내려놓는다
    const A = 180 * e;                                   // 장 전체가 도는 각
    const C = 70 * Math.sin(Math.PI * e);                // 넘기는 동안만 휜다
    let prev = 0;
    for (let i = 0; i < STRIPS; i++) {
      const f = i / (STRIPS - 1);
      const phi = Math.min(180, A + C * f * f);          // 들린 가장자리가 먼저 넘어간다
      strips[i].el.style.transform = `rotateY(${(-(phi - prev)).toFixed(3)}deg)`;
      prev = phi;
      const lit = Math.abs(Math.sin((phi * Math.PI) / 180));
      strips[i].shade.style.opacity = (lit * 0.22).toFixed(3);
      strips[i].bshade.style.opacity = (lit * 0.12).toFixed(3);
    }
  };
  return sheet;
}

// frame: 판 틀 · source: 넘어가는 장(앞으로 넘길 때 = 지금 장 · 뒤로 넘길 때 = 돌아올 장)
// dir 'fwd' — 지금 장이 넘어가며 아래 장이 드러난다 · 'back' — 넘어갔던 장이 되넘어와 덮는다
export async function turnPage(frame, source, dir, paperUrl, zoomTarget) {
  if (reduced()) return;
  const sheet = buildSheet(frame, source, paperUrl);
  const unit = frame.offsetWidth / 74;                   // 판 가로 74칸
  const shift = 74 * T.pageTurnZoom / 2;                 // 책등이 화면 가운데로
  const target = zoomTarget || frame;
  const baseTransform = target.style.transform;
  await animate(T.pageTurn, (p) => {
    const q = dir === 'fwd' ? p : 1 - p;                 // 넘어간 정도
    sheet.draw(q);
    // 판 밖으로 넘어간 쪽은 옅게 — 뒤로 올 때는 판 밖에서 짙어지며 들어온다
    sheet.style.opacity = (q < 0.55 ? 1 : Math.max(0, 1 - (q - 0.55) / 0.45)).toFixed(3);
    const z = Math.sin(Math.PI * p);                     // 넘기는 동안만 줄었다가 제자리로
    const s = 1 - (1 - T.pageTurnZoom) * z;
    target.style.transform = `${baseTransform} translateX(${(shift * z * unit).toFixed(2)}px) scale(${s.toFixed(4)})`;
  });
  target.style.transform = baseTransform;
  sheet.remove();
}
