// ⑦ 갈무리 판 11장 → ⑧ 서약서 판 → ⑨ 잠든 모습 (요소정의 14-1)
//   판 뒤 = 알현 그림을 문제판이 뜰 때처럼 어둡게 · 새 그림이 없다
//   갈무리 판 64 × 20.0 — 머리 「갈무리」(N-01) + 빈칸이 채워진 문장(③ 1.85 · 밑줄을 남긴다)
//   서약서 판 64 × 35.9 — O-01 ~ O-07 · 체크 칸(B-11) · 날짜 = 서약서 판이 뜨는 날 「2026년 9월 21일」 꼴
//   넘기기 — 옆으로 밀림 0.5초 · ‹ ›(B-05)는 판 바깥 양옆 · 첫 장엔 ‹ 없음 · 서약서엔 › 없음 · ← → 도 된다
//   체크하면 화면 아래 가운데에 [저장](B-09 · 왼쪽) [종료](B-10 · 오른쪽)
//   저장 = 문장 판 11장 + 서약서를 PDF로(파일 이름 F-01) · 종료 = 판이 걷히고 → 어두워졌다 → 잠든 모습으로 밝아진다
//   잠든 모습에서는 그대로 머문다(눌러도 아무 일 없음 · 글 없음) · 다시 켜면 처음부터(저장에 「끝냄」)
import { el, wait } from '../lib/dom.js';
import { t, HARD } from '../lib/text.js';
import { config } from '../lib/assets.js';
import { scene } from '../lib/scene.js';
import { mount, cover } from '../lib/stage.js';
import { save } from '../lib/save.js';
import { T, reduced } from '../lib/timing.js';
import jamoData from '../data/jamo.json';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
};

function sentencePage(j) {
  return el('div.gpage.sent', {}, [
    el('p.ghead', { text: t('N-01') }),
    el('p.gsentence', {}, [j.before, el('span.blank.filled', {}, [el('span.word', { text: j.word })]), j.after]),
  ]);
}

function pledgePage(date, checked, onChange) {
  const box = el('input.pcheck-box', { type: 'checkbox', 'aria-label': t('O-06') });
  box.checked = checked;
  box.addEventListener('change', () => onChange(box.checked));
  return el('div.gpage.pledge', {}, [
    el('p.ptitle', { text: t('O-01') }),
    el('p.plead', { text: t('O-02') }),
    el('ul.pitems', {}, [t('O-03'), t('O-04'), t('O-05')].map((x) => el('li', { text: x }))),
    el('div.pfoot', {}, [
      el('label.pcheck', {}, [box, el('span', { text: t('O-06') })]),
      el('span.pdate', { text: date }),
    ]),
  ]);
}

// 판 그대로 PDF — 판마다 한 쪽. 글꼴이 깨지지 않도록 판을 그림으로 떠서 담는다(서버 없이 브라우저 안에서)
async function savePdf(pages, date) {
  const [{ jsPDF }, html2canvas] = await Promise.all([import('jspdf'), import('html2canvas').then((m) => m.default)]);
  const stage = el('div.pdf-stage');
  document.body.append(stage);
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = 297, H = 210, margin = 24;
  for (let i = 0; i < pages.length; i++) {
    const node = pages[i](date);
    const board = el(`div.gboard.paper.${node.classList.contains('pledge') ? 'tall' : 'short'}.pdf`, {}, [node]);
    stage.replaceChildren(board);
    const canvas = await html2canvas(board, { scale: 2, backgroundColor: null, logging: false });
    if (i > 0) pdf.addPage();
    const ratio = canvas.width / canvas.height;
    let w = W - margin * 2, h = w / ratio;
    if (h > H - margin * 2) { h = H - margin * 2; w = h * ratio; }
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', (W - w) / 2, (H - h) / 2, w, h);
  }
  stage.remove();
  pdf.save(`${t('F-01')}.pdf`);
}

export async function ending(game, { screen, dim, layer }) {
  const PAGES = jamoData.map((j) => () => sentencePage(j));
  const total = PAGES.length + 1;             // 문장 11 + 서약서
  let date = null;                            // 서약서 판이 처음 뜨는 날
  let pledged = false;
  let at = 0;
  let busy = false;

  const board = el('div.gboard.paper.short');
  const prevB = el('button.side.g-prev', { type: 'button', text: HARD['B-05'].prev, 'aria-label': '앞 판' });
  const nextB = el('button.side.g-next', { type: 'button', text: HARD['B-05'].next, 'aria-label': '다음 판' });
  const saveB = el('button.cta', { type: 'button', text: t('B-09') });
  const endB = el('button.cta', { type: 'button', text: t('B-10') });
  const ctas = el('div.cta-row.end-ctas', {}, [saveB, endB]);
  const wrap = el('div.archive.on-dark', {}, [prevB, board, nextB, ctas]);
  layer.append(wrap);

  const pageAt = (i) => {
    if (i < PAGES.length) return PAGES[i]();
    if (!date) date = today();
    return pledgePage(date, pledged, (v) => { pledged = v; ctas.classList.toggle('on', v); });
  };
  const draw = () => {
    prevB.disabled = at === 0;
    nextB.disabled = at === total - 1;
    board.classList.toggle('tall', at === PAGES.length);
    board.classList.toggle('short', at !== PAGES.length);
    ctas.classList.toggle('on', at === PAGES.length && pledged);
  };

  // 옆으로 밀려 넘어간다(0.5초)
  async function go(i) {
    if (busy || i < 0 || i >= total || i === at) return;
    busy = true;
    const dir = i > at ? 1 : -1;
    const old = board.firstElementChild;
    const nu = pageAt(i);
    at = i;
    draw();
    if (reduced()) { board.replaceChildren(nu); busy = false; return; }
    old.classList.add(dir > 0 ? 'out-l' : 'out-r');
    nu.classList.add(dir > 0 ? 'in-r' : 'in-l');
    board.append(nu);
    await wait(T.archiveSlide);
    old.remove();
    nu.classList.remove('in-r', 'in-l');
    busy = false;
  }

  board.append(pageAt(0));
  draw();
  dim.classList.add('on');
  await wait(20);
  wrap.classList.add('shown');

  const onKey = (e) => { if (e.key === 'ArrowLeft') go(at - 1); if (e.key === 'ArrowRight') go(at + 1); };
  document.addEventListener('keydown', onKey);
  prevB.addEventListener('click', () => go(at - 1));
  nextB.addEventListener('click', () => go(at + 1));
  saveB.addEventListener('click', async () => {
    if (saveB.disabled) return;
    saveB.disabled = true;
    try { await savePdf([...PAGES.map((f) => () => f()), (d) => pledgePage(d, true, () => {})], date || today()); }
    finally { saveB.disabled = false; }
  });

  // 종료 — 저장 없이 눌러도 막지 않는다
  await new Promise((r) => endB.addEventListener('click', r, { once: true }));
  document.removeEventListener('keydown', onKey);
  game.ended = true;
  save(game);                                  // 끝낸 뒤 다시 켜면 처음부터
  wrap.classList.add('lifting');               // 서약서 판이 걷힌다(0.9초)
  await wait(reduced() ? 0 : T.boardLift);
  await cover('dark', T.endDark, 1);           // 어두워졌다가
  const sleep = await config(game.character === 'f' ? 'bg_prologue_sleep_f' : 'bg_prologue_sleep_m');
  mount(el('section.screen.sleep', {}, [scene(sleep)]));
  await cover('dark', T.endBright, 0);         // 잠든 모습으로 밝아진다 — 그대로 머문다
}
