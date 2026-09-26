// 저장 — 갈무리 판 11장 + 서약서 판을 PDF로 (요소정의 14-1 · 파일 이름 F-01)
// 판 하나 = 한 쪽 · 차례는 넘겨 본 그대로 · 서버 없이 브라우저 안에서 만든다.
// 판을 캔버스에 직접 그려 그림으로 담는다 — 한글 글꼴(고운바탕)을 PDF에 따로 싣지 않아도 글자가 깨지지 않고,
// 기기·브라우저마다 결과가 같다. 판의 치수·글자 크기는 화면과 같은 칸(u) 값을 쓴다.
// 디자인은 화면의 갈무리 판·서약서 판 그대로다(디13) — 본선 한지 · 빈칸의 치자빛 형광펜 띠(디4-6) · 서약서 두 겹 틀(디12) · 체크 칸은 찍힌 도장 모양.
import { t } from './text.js';

const U = 24;                       // PDF용 한 칸의 픽셀 — 판 64칸 = 1536px
const FONT = '"Gowun Batang", serif';
const INK = '#2E2620', SOFT = '#6A6355', SEAL = '#9E3B2F';

function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// 어절 단위로 줄을 바꾼다(낱말이 줄 중간에서 쪼개지지 않는다) · runs = [{text, blank}]
function layout(g, runs, maxW) {
  const words = [];
  for (const r of runs) {
    if (r.blank) { words.push({ text: r.text, blank: true, space: false }); continue; }
    const parts = r.text.split(/( )/);
    for (const p of parts) {
      if (p === ' ') { if (words.length) words[words.length - 1].space = true; continue; }
      if (p) words.push({ text: p, blank: false, space: false });
    }
  }
  // 띄어쓰기 없이 붙은 조각(빈칸 낱말 + 「이라」 등)은 한 어절이라 한 줄에 함께 둔다
  const chunks = [];
  for (const wd of words) {
    const last = chunks[chunks.length - 1];
    if (last && !last[last.length - 1].space) last.push(wd); else chunks.push([wd]);
  }
  const pad = 0.3 * U;
  const lines = [[]];
  let w = 0;
  for (const chunk of chunks) {
    const items = chunk.map((wd) => ({ ...wd, w: g.measureText(wd.text).width + (wd.blank ? pad * 2 : 0), sp: wd.space ? g.measureText(' ').width : 0 }));
    const cw = items.reduce((s, it) => s + it.w + it.sp, 0);
    if (w + cw - items[items.length - 1].sp > maxW && lines[lines.length - 1].length) { lines.push([]); w = 0; }
    lines[lines.length - 1].push(...items);
    w += cw;
  }
  return lines;
}

function drawLines(g, lines, cx, top, lineH, fontPx) {
  lines.forEach((line, i) => {
    const total = line.reduce((s, wd, k) => s + wd.w + (k < line.length - 1 ? wd.sp : 0), 0);
    let x = cx - total / 2;
    const y = top + i * lineH + lineH / 2;
    for (const wd of line) {
      if (wd.blank) {
        // 빈칸 형광펜 — 칸(줄 높이 1.3)의 38%~100% (화면 .blank와 같다)
        const boxH = fontPx * 1.3, boxTop = y - boxH / 2 + fontPx * 0.06;
        g.fillStyle = 'rgba(226,184,84,.5)';
        g.fillRect(x, boxTop + boxH * 0.38, wd.w, boxH * 0.62);
        g.fillStyle = INK;
        g.fillText(wd.text, x + 0.3 * U, y);
        g.strokeStyle = 'rgba(31,28,23,.5)';
        g.lineWidth = 2;
        g.beginPath(); g.moveTo(x, boxTop + boxH); g.lineTo(x + wd.w, boxTop + boxH); g.stroke();
      } else {
        g.fillText(wd.text, x, y);
      }
      x += wd.w + wd.sp;
    }
  });
}

// 글자 사이를 띄워 가운데에 쓴다(화면의 letter-spacing과 같다)
function spaced(g, text, cx, y, em) {
  const size = parseFloat(g.font.match(/(\d+(\.\d+)?)px/)[1]);
  const gap = size * em;
  const chars = [...text];
  const total = chars.reduce((s, ch) => s + g.measureText(ch).width, 0) + gap * (chars.length - 1);
  let x = cx - total / 2;
  for (const ch of chars) { g.fillText(ch, x, y); x += g.measureText(ch).width + gap; }
}

function boardCanvas(hUnits, paper) {
  const c = document.createElement('canvas');
  c.width = 64 * U; c.height = hUnits * U;
  const g = c.getContext('2d');
  g.fillStyle = '#F3ECDB';
  g.fillRect(0, 0, c.width, c.height);
  if (paper) g.drawImage(paper, 0, 0, c.width, c.height);
  g.strokeStyle = 'rgba(31,28,23,.42)';
  g.lineWidth = 2;
  g.strokeRect(1, 1, c.width - 2, c.height - 2);
  g.textBaseline = 'middle';
  g.fillStyle = INK;
  return [c, g];
}

// 갈무리 판 — 머리 「갈무리」(④ 1.6 굵게) + 빈칸이 채워진 문장(③ 1.85)
function sentenceCanvas(j, paper) {
  const [c, g] = boardCanvas(20, paper);
  g.textAlign = 'left';
  g.font = `700 ${1.6 * U}px ${FONT}`;
  spaced(g, t('N-01'), c.width / 2, 1.35 * U + 1.2 * U, 0.3);
  const fs = 1.85 * U;
  g.font = `400 ${fs}px ${FONT}`;
  const lines = layout(g, [{ text: j.before }, { text: j.word, blank: true }, { text: j.after }], c.width - 6 * U);
  const lineH = fs * 1.95;
  const top = 6.6 * U + (c.height - 6.6 * U - 2.4 * U - lines.length * lineH) / 2;
  drawLines(g, lines, c.width / 2, top, lineH, fs);
  return c;
}

// 서약서 판 — O-01 ~ O-07 · 체크된 칸
function pledgeCanvas(date, paper) {
  const [c, g] = boardCanvas(35.9, paper);
  const cx = c.width / 2;
  // 틀 — 1 안쪽 굵은 먹선 0.28 + 1.65 안쪽 가는 먹선 (디12)
  g.strokeStyle = INK;
  g.lineWidth = 0.28 * U;
  g.strokeRect(1.14 * U, 1.14 * U, c.width - 2.28 * U, c.height - 2.28 * U);
  g.lineWidth = 2;
  g.strokeRect(1.65 * U, 1.65 * U, c.width - 3.3 * U, c.height - 3.3 * U);
  let y = 3.4 * U;
  const center = (text, font, color = INK) => {
    g.font = font; g.fillStyle = color;
    g.fillText(text, cx - g.measureText(text).width / 2, y);
  };
  g.textAlign = 'left';
  g.font = `700 ${2.4 * U}px ${FONT}`;
  spaced(g, t('O-01'), cx, y, 0.6);
  y += 4 * U;
  g.font = `400 ${1.85 * U}px ${FONT}`;
  for (const line of layout(g, [{ text: t('O-02') }], c.width - 10 * U)) {
    center(line.map((w) => w.text + (w.space ? ' ' : '')).join('').trim(), g.font);
    y += 1.85 * U * 1.8;
  }
  y += 1.2 * U;
  g.font = `400 ${1.6 * U}px ${FONT}`;
  const items = [t('O-03'), t('O-04'), t('O-05')];
  const left = cx - Math.max(...items.map((x) => g.measureText(x).width)) / 2;
  for (const it of items) { g.fillText(it, left, y); y += 1.6 * U * 1.8 + 0.5 * U; }
  y += 1.8 * U;
  // 체크 칸 + 「위와 같이 서약합니다.」
  const label = t('O-06');
  // 체크 칸 — 찍힌 도장 모양: 낙관 붉은빛으로 가득 차고 한지색 ✓ (디12)
  const box = 2.6 * U, gap = U;
  const total = box + gap + g.measureText(label).width;
  const bx = cx - total / 2;
  g.fillStyle = SEAL;
  g.fillRect(bx, y - box / 2, box, box);
  g.strokeStyle = '#F3ECDB'; g.lineWidth = 0.32 * U; g.lineCap = 'square';
  g.beginPath(); g.moveTo(bx + box * 0.27, y + box * 0.02); g.lineTo(bx + box * 0.44, y + box * 0.2); g.lineTo(bx + box * 0.75, y - box * 0.24); g.stroke();
  g.fillStyle = INK;
  g.fillText(label, bx + box + gap, y);
  y += 3 * U;
  center(date, `400 ${1.4 * U}px ${FONT}`, SOFT);
  return c;
}

export async function savePdf(sentences, date, paperUrl) {
  const [{ jsPDF }, paper] = await Promise.all([import('jspdf'), loadImage(paperUrl)]);
  await document.fonts.load(`400 ${U}px "Gowun Batang"`);
  await document.fonts.load(`700 ${U}px "Gowun Batang"`);
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = 297, H = 210, margin = 24;
  const pages = [...sentences.map((j) => sentenceCanvas(j, paper)), pledgeCanvas(date, paper)];
  pages.forEach((canvas, i) => {
    if (i > 0) pdf.addPage();
    const ratio = canvas.width / canvas.height;
    let w = W - margin * 2, h = w / ratio;
    if (h > H - margin * 2) { h = H - margin * 2; w = h * ratio; }
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', (W - w) / 2, (H - h) / 2, w, h);
  });
  pdf.save(`${t('F-01')}.pdf`);
}
