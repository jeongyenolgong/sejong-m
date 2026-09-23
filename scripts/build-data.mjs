// 엑셀(content/*.xlsx)을 읽어 게임이 쓰는 JSON(src/data/*.json)으로 굽는다.
// 서버가 없는 정적 웹이라 브라우저가 엑셀을 직접 읽지 않는다. 엑셀을 고치면 이 스크립트를 다시 돌린다
// (npm run dev · npm run build가 먼저 돌린다).
//
// 학년은 grade.json이 정한다 — e(초등)면 퀴즈 엑셀의 「초등」 시트, m(중등)이면 「중등」 시트를 굽는다.
import ExcelJS from 'exceljs';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const grade = JSON.parse(fs.readFileSync(path.join(root, 'grade.json'), 'utf8')).grade;
const SHEET = { e: '초등', m: '중등' }[grade];
if (!SHEET) throw new Error(`grade.json의 grade는 e 또는 m이어야 한다: ${grade}`);
const out = path.join(root, 'src', 'data');
fs.mkdirSync(out, { recursive: true });

// 셀 값을 글로 — 서식이 섞인 글(richText)도 풀어 낸다
function text(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') {
    if (v.richText) return v.richText.map((r) => r.text).join('');
    if (v.text !== undefined) return String(v.text);
    if (v.result !== undefined) return String(v.result);
  }
  return String(v);
}

// 작은따옴표 ' 를 모양 있는 ‘ ’ 로 — 고운바탕의 ' 는 세로 막대로 보인다 (2026-09-23)
//   한 칸 안에서 짝지어 여닫는다 · 엑셀은 ' 그대로 둔다(글의 SSOT는 손대지 않고 화면에서만 바꾼다)
function curlySingle(s) {
  let open = true;
  return s.replace(/'/g, () => { const q = open ? '‘' : '’'; open = !open; return q; });
}

const KEEP_SPACES = new Set(['문장 앞', '문장 뒤']);

// 첫 줄을 머리로 삼아 줄마다 {머리: 값} 으로 읽는다
async function rows(file, sheetName) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.join(root, 'content', file));
  const ws = wb.getWorksheet(sheetName);
  if (!ws) throw new Error(`${file}에 「${sheetName}」 시트가 없다`);
  const head = [];
  ws.getRow(1).eachCell({ includeEmpty: true }, (c, i) => { head[i] = text(c.value).trim(); });
  const list = [];
  ws.eachRow({ includeEmpty: false }, (row, n) => {
    if (n === 1) return;
    const o = {};
    // 「문장 앞」·「문장 뒤」는 끝의 띄어쓰기가 뜻을 가지므로 자르지 않는다
    head.forEach((h, i) => {
      if (!h) return;
      const v = curlySingle(text(row.getCell(i).value));
      o[h] = KEEP_SPACES.has(h) ? v : v.trim();
    });
    if (Object.values(o).some((v) => v !== '')) list.push(o);
  });
  return list;
}

function write(name, data) {
  fs.writeFileSync(path.join(out, name), JSON.stringify(data, null, 2) + '\n');
  console.log(`  src/data/${name}`);
}

// ── 화면 글자 — 번호가 열쇠 ──
const ui = {};
for (const r of await rows('ui_text.xlsx', '화면 글자')) {
  if (r['번호']) ui[r['번호']] = r['글'];
}

// ── 자모 조합 11문장 — 두 학년 공용 ──
const jamo = (await rows('jamo.xlsx', '자모 조합')).map((r) => ({
  id: r['ID'],
  gate: r['문'],
  bolt: Number(r['빗장']),
  word: r['낱말'],
  sentence: r['문장'],
  before: r['문장 앞'],
  after: r['문장 뒤'],
  // 「ㄱ ㅏ / ㄱ ㅑ / ㄴ ㅏ ㄹ」 → [["ㄱ","ㅏ"],["ㄱ","ㅑ"],["ㄴ","ㅏ","ㄹ"]]
  syllables: r['자모'].split('/').map((s) => s.trim().split(/\s+/)),
}));
for (const j of jamo) {
  if (j.before + j.word + j.after !== j.sentence) {
    console.warn(`  ⚠️ ${j.id}: 문장 앞 + 낱말 + 문장 뒤가 문장과 다르다`);
  }
}

// ── 점검 퀴즈 — 이 학년 시트만 ──
const check = (await rows('quiz_check.xlsx', SHEET)).map((r) => {
  const n = grade === 'e' ? 3 : 4;
  const options = [];
  for (let i = 1; i <= n; i++) {
    options.push({ text: r[`보기${i}`], code: Number(r[`코드${i}`]), explain: r[`오답해설${i}`] || null });
  }
  return { id: r['문항ID'], gate: r['문'], bolt: Number(r['빗장']), word: r['낱말'], question: r['물음'], answer: Number(r['정답번호']), options };
});

// ── 힌트 퀴즈 — 이 학년 시트만 ──
const hint = (await rows('quiz_hint.xlsx', SHEET)).map((r) => {
  const n = grade === 'e' ? 3 : 4;
  const options = [];
  for (let i = 1; i <= n; i++) options.push(r[`보기${i}`]);
  return {
    id: r['문항ID'], word: r['조립 낱말'], step: Number(r['걸음']),
    episode: r['일화 문장'] || '', question: r['물음'], options,
    answer: Number(r['정답번호']), shuffle: r['보기 순서'] !== '차례대로',
  };
});

console.log(`데이터를 구웠다 (학년: ${SHEET})`);
write('ui.json', ui);
write('jamo.json', jamo);
write('check.json', check);
write('hint.json', hint);
