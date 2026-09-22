// 기획 폴더(../docs)의 엑셀을 content/로 옮겨 온다 — 개발팀에 넘기기 전까지 엑셀의 원본은 ../docs에 있다.
// 넘긴 뒤에는 content/의 엑셀이 원본이다(이 스크립트는 쓰지 않는다).
// 엑셀이 열려 있으면(옆에 ~$ 파일이 있으면) 멈춘다 — 저장 중인 파일을 옮기지 않으려고.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const docs = path.resolve(root, '..', 'docs');
const MAP = {
  '화면텍스트_v1.xlsx': 'ui_text.xlsx',
  '자모조합_v1.xlsx': 'jamo.xlsx',
  '퀴즈_점검_v1.xlsx': 'quiz_check.xlsx',
  '퀴즈_힌트_v1.xlsx': 'quiz_hint.xlsx',
  '그림목록_v1.xlsx': 'image_list.xlsx',
};
const open = fs.readdirSync(docs).filter((f) => f.startsWith('~$'));
if (open.length) { console.error(`엑셀이 열려 있다 — 닫고 다시 돌린다: ${open.join(', ')}`); process.exit(1); }
for (const [from, to] of Object.entries(MAP)) {
  fs.copyFileSync(path.join(docs, from), path.join(root, 'content', to));
  console.log(`  ${from} → content/${to}`);
}
console.log('옮겼다. npm run data 로 다시 굽는다.');
