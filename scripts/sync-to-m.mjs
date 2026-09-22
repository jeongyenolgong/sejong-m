// 공유 부분을 sejong-e(본)에서 옆 폴더의 sejong-m으로 복사한다.
// 두 저장소에서 다른 것은 grade.json 하나뿐이다 — 그것과 .git · node_modules · dist · 구운 데이터는 건드리지 않는다.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const grade = JSON.parse(fs.readFileSync(path.join(root, 'grade.json'), 'utf8')).grade;
if (grade !== 'e') { console.error('sejong-e(본)에서 돌린다.'); process.exit(1); }
const target = path.resolve(root, '..', 'sejong-m');
if (!fs.existsSync(path.join(target, '.git'))) { console.error(`sejong-m 저장소가 옆에 없다: ${target}`); process.exit(1); }

const SKIP = new Set(['.git', 'node_modules', 'dist', 'grade.json', '.DS_Store']);
const skipPath = (rel) => rel === path.join('src', 'data') || rel.startsWith(path.join('src', 'data') + path.sep);

let n = 0;
function copy(rel) {
  const from = path.join(root, rel), to = path.join(target, rel);
  const st = fs.statSync(from);
  if (st.isDirectory()) {
    fs.mkdirSync(to, { recursive: true });
    for (const f of fs.readdirSync(from)) {
      const r = path.join(rel, f);
      if (SKIP.has(f) || skipPath(r) || f.startsWith('~$')) continue;
      copy(r);
    }
    // sejong-e에서 지운 파일은 sejong-m에서도 지운다
    for (const f of fs.readdirSync(to)) {
      const r = path.join(rel, f);
      if (SKIP.has(f) || skipPath(r)) continue;
      if (!fs.existsSync(path.join(root, r))) { fs.rmSync(path.join(to, f), { recursive: true }); console.log(`  지움 ${r}`); }
    }
  } else {
    fs.copyFileSync(from, to);
    n++;
  }
}
copy('.');
console.log(`sejong-m에 ${n}개 파일을 맞췄다. sejong-m에서 커밋·푸시한다.`);
