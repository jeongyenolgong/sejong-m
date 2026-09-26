// 그림 목록(content/image_list.xlsx 「그림」 시트)을 읽어 public/images/에
//   ① 자리 표시 그림(<파일 이름>.svg) — 진짜 그림이 오기 전까지 쓰는 빈 틀
//   ② 그림마다 설정 파일(<파일 이름>.json) — 그림 안 위치에 달린 값(걷는 범위·문 자리 …)
// 을 만든다.
//
// ⭐ 진짜 그림이 오면: 같은 이름으로 public/images/에 넣고(예: bg_start.png),
//    설정 파일의 "file"을 그 파일 이름으로 바꾼 뒤 숫자만 고친다. 코드는 건드리지 않는다.
// ⭐ 이미 있는 설정 파일은 덮어쓰지 않는다(고쳐 둔 숫자를 지키려고). 자리 표시 그림(.svg)만 다시 만든다.
//    설정 파일을 처음 값으로 되돌리려면 그 .json을 지우고 다시 돌린다.
//
// 좌표는 모두 그 그림에 대한 백분율이다(가로 x: 왼쪽 0 → 오른쪽 100 · 세로 y: 위 0 → 아래 100).
import ExcelJS from 'exceljs';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dir = path.join(root, 'public', 'images');
fs.mkdirSync(dir, { recursive: true });

function text(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object' && v.richText) return v.richText.map((r) => r.text).join('');
  return String(v);
}
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(path.join(root, 'content', 'image_list.xlsx'));
const ws = wb.getWorksheet('그림');
const head = [];
ws.getRow(1).eachCell((c, i) => { head[i] = text(c.value).trim(); });
const list = [];
ws.eachRow((row, n) => {
  if (n === 1) return;
  const o = {};
  head.forEach((h, i) => { if (h) o[h] = text(row.getCell(i).value).trim(); });
  if (o['번호']) list.push(o);
});

// 크기 — 가로 배경은 3:2로 뽑아 16:10으로 자른 1536×960 · 세로 캐릭터는 2:3
const SIZE = {
  wide: [1536, 960], tall: [1024, 1536], board: [1480, 770],
  door: [400, 700], cloud: [420, 150],
};

function svg(w, h, lines, extra = '', dark = false) {
  const bg = dark ? '#221e19' : '#EDE4CF';
  const ink = dark ? '#EDE4CF' : '#2E2620';
  // 이름표는 왼쪽 아래 구석에 작게 — 화면 글과 겹치지 않게
  const fs0 = Math.round(Math.min(w, h) * 0.028);
  const t = lines.map((l, i) =>
    `<text x="${w * 0.025}" y="${h - h * 0.03 - (lines.length - 1 - i) * fs0 * 1.4}" font-size="${fs0}" fill="${ink}" fill-opacity="${i === 0 ? 0.7 : 0.45}" font-family="sans-serif">${esc(l)}</text>`
  ).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">` +
    `<rect width="${w}" height="${h}" fill="${bg}"/>` +
    `<rect x="${w * 0.01}" y="${h * 0.012}" width="${w * 0.98}" height="${h * 0.976}" fill="none" stroke="${ink}" stroke-opacity=".3" stroke-dasharray="12 8" stroke-width="2"/>` +
    extra + t + '</svg>\n';
}
const rect = (x, y, w, h, o = 0.12) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#2E2620" fill-opacity="${o}" stroke="#2E2620" stroke-opacity=".35" stroke-width="2"/>`;
const label = (x, y, s, size = 26) =>
  `<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle" fill="#2E2620" fill-opacity=".6" font-family="sans-serif">${esc(s)}</text>`;

function writeSvg(name, body) { fs.writeFileSync(path.join(dir, `${name}.svg`), body); }
function writeConfig(name, cfg) {
  const p = path.join(dir, `${name}.json`);
  if (fs.existsSync(p)) return false;
  fs.writeFileSync(p, JSON.stringify(cfg, null, 2) + '\n');
  return true;
}

// 문이 있는 정면 넷 — 지도 순서와 파일 이름의 문 이름
const DOOR_GATES = ['gwanghwamun', 'heungnyemun', 'geunjeongmun', 'sajeongmun'];

let made = 0, kept = 0;
for (const r of list) {
  const name = r['파일 이름'];
  if (!name || name.includes('<') || name.includes('_n')) continue;   // 파생(CUT)은 아래에서 따로
  const tall = r['뽑는 비율'].startsWith('세로');
  const [w, h] = name.startsWith('el_hanji') ? SIZE.board : tall ? SIZE.tall : SIZE.wide;
  const lines = [`${r['번호']} · ${r['무엇']}`, `${name} · ${r['뽑는 비율']}`, '자리 표시 그림 — 진짜 그림이 오면 같은 이름으로 바꿔 넣는다'];
  let extra = '';
  let cfg = { file: `${name}.svg`, width: w, height: h };

  if (name.startsWith('bg_map_')) {
    const n = Number(name.split('_')[2]);
    // 걷는 범위 · 출발 자리 · 캐릭터 크기 · 넘어가는 위 끝 — 그림이 오면 재서 고친다
    cfg = { ...cfg, walk: { minX: 22, maxX: 78 }, start: { x: 50, y: 80 }, charHeight: 22, exitY: 14 };
    extra += rect(0, 0, w * 0.2, h, 0.08) + rect(w * 0.8, 0, w * 0.2, h, 0.08);
    if ([2, 3, 5, 7].includes(n) || n === 4) {
      // 문(영제교는 다리) 자리 — 여기에 닿으면 문 앞 화면으로
      cfg.gate = { x1: 43, x2: 57, y: 18 };
      extra += rect(w * 0.4, 0, w * 0.2, h * 0.16, 0.18) + label(w / 2, h * 0.1, n === 4 ? '다리 자리' : '문 자리');
    }
    // 근정전 알림창은 들어서면 뜬다(자리 값 없음) · 실마리 곳(spots) · 관리(officers) · 높이마다 폭(walk.bands) · 키(scale)는 그림이 오면 잰다(README 5절)
    if (n === 8) { cfg.audienceY = 30; delete cfg.exitY; extra += label(w / 2, h * 0.26, '여기 닿으면 알현'); }
    if ([2, 3, 4, 5, 7].includes(n)) delete cfg.exitY;
  } else if (name.startsWith('bg_front_')) {
    const gate = name.replace('bg_front_', '');
    cfg = { ...cfg, charHeight: 30, stand: { x: 50, y: 96 }, walk: { minX: 30, maxX: 70 } };
    if (gate === 'yeongjegyo') {
      // 다리 위 투명한 벽 두 지점 · 다 건넌 끝 지점
      cfg = { ...cfg, walls: [70, 45], endY: 18 };
      extra += `<path d="M${w * 0.3} ${h} L${w * 0.42} 0 L${w * 0.58} 0 L${w * 0.7} ${h} Z" fill="#2E2620" fill-opacity=".08"/>` +
        label(w / 2, h * 0.7, '— 투명한 벽 1 —', 22) + label(w / 2, h * 0.45, '— 투명한 벽 2 —', 22);
    } else {
      // 문짝 두 짝의 자리(오려 낸 그림이 앉는 곳) · 경첩은 바깥쪽 세로 변
      cfg = {
        ...cfg,
        pushY: 90,                               // ▲로 밀 때 캐릭터가 멈추는 선
        doorRange: { x1: 38, x2: 62 },           // 이 안에 서 있어야 문이 밀린다
        doors: {
          left: { file: `cut_door_${gate}_l.svg`, x: 36, y: 34, w: 14, h: 56 },
          right: { file: `cut_door_${gate}_r.svg`, x: 50, y: 34, w: 14, h: 56 },
        },
      };
      extra += rect(w * 0.36, h * 0.34, w * 0.28, h * 0.56, 0.1) + rect(w * 0.2, h * 0.12, w * 0.6, h * 0.2, 0.1) + label(w / 2, h * 0.24, '문루 · 현판');
    }
  } else if (name === 'bg_audience') {
    cfg = { ...cfg, charHeight: 34, stand: { x: 50, y: 98 }, stopY: 78, walk: { minX: 40, maxX: 60 } };
    extra += rect(w * 0.3, h * 0.12, w * 0.4, h * 0.5, 0.1) + label(w / 2, h * 0.2, '발 · 일월오봉도 · 세종');
  } else if (name === 'bg_start') {
    cfg = {
      ...cfg,
      // 오려 낸 구름 — 그림이 오면 오려 낸 조각 파일로 바꾼다. duration은 한 번 가로지르는 초
      clouds: [
        { file: 'cut_cloud_1.svg', x: 8, y: 10, w: 22, duration: 90 },
        { file: 'cut_cloud_2.svg', x: 52, y: 20, w: 16, duration: 120 },
        { file: 'cut_cloud_3.svg', x: 30, y: 5, w: 26, duration: 150 },
      ],
    };
  }

  if (name.startsWith('el_hanji')) {
    // 판 바탕 — 글이 그 위에 앉으므로 가운데에 이름을 쓰지 않는다(구석에 작게)
    const tint = name === 'el_hanji_side' ? '#DCD3BC' : '#F3ECDB';
    writeSvg(name, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><rect width="${w}" height="${h}" fill="${tint}"/>` +
      `<text x="${w - 16}" y="${h - 14}" font-size="18" text-anchor="end" fill="#2E2620" fill-opacity=".3" font-family="sans-serif">${name} · 자리 표시</text></svg>\n`);
  } else if (name.startsWith('ch_')) {
    // 캐릭터 — 오려 낸 그림처럼 바탕이 비고 사람 꼴만 선다
    const body = `<ellipse cx="${w / 2}" cy="${h * 0.14}" rx="${w * 0.13}" ry="${h * 0.085}" fill="#2E2620" fill-opacity=".55"/>` +
      `<path d="M${w * 0.3} ${h * 0.25} Q${w / 2} ${h * 0.21} ${w * 0.7} ${h * 0.25} L${w * 0.76} ${h * 0.6} L${w * 0.64} ${h * 0.6} L${w * 0.62} ${h * 0.97} L${w * 0.52} ${h * 0.97} L${w / 2} ${h * 0.64} L${w * 0.48} ${h * 0.97} L${w * 0.38} ${h * 0.97} L${w * 0.36} ${h * 0.6} L${w * 0.24} ${h * 0.6} Z" fill="#2E2620" fill-opacity=".45"/>` +
      `<text x="${w / 2}" y="${h * 0.45}" font-size="${w * 0.06}" text-anchor="middle" fill="#F3ECDB" font-family="sans-serif">${esc(r['번호'])}</text>` +
      `<text x="${w / 2}" y="${h * 0.5}" font-size="${w * 0.045}" text-anchor="middle" fill="#F3ECDB" font-family="sans-serif">${esc(name)}</text>`;
    writeSvg(name, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>\n`);
  } else {
    writeSvg(name, svg(w, h, lines, extra, name === 'bg_dream'));
  }
  writeConfig(name, cfg) ? made++ : kept++;
}

// 파생 — 문짝(정면 그림에서 오려 낸다) · 구름
for (const g of DOOR_GATES) {
  for (const side of ['l', 'r']) {
    const [w, h] = SIZE.door;
    writeSvg(`cut_door_${g}_${side}`, svg(w, h, [side === 'l' ? '왼짝' : '오른짝', `cut_door_${g}_${side}`]));
  }
}
for (let i = 1; i <= 3; i++) {
  const [w, h] = SIZE.cloud;
  writeSvg(`cut_cloud_${i}`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2 - 4}" ry="${h / 2 - 4}" fill="#2E2620" fill-opacity=".09"/><text x="${w / 2}" y="${h / 2 + 8}" font-size="22" text-anchor="middle" fill="#2E2620" fill-opacity=".45" font-family="sans-serif">cut_cloud_${i}</text></svg>\n`);
}

console.log(`public/images — 설정 파일 새로 ${made} · 이미 있어 그대로 ${kept}`);
