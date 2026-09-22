// 그림과 그림마다의 설정 파일(public/images/<이름>.json)을 불러온다.
// 설정 파일의 "file"이 실제로 쓸 그림 파일이다 — 진짜 그림이 오면 그 값과 숫자만 고친다.
const cache = new Map();
const base = import.meta.env.BASE_URL;   // './' — 상대 경로

export const imageUrl = (file) => `${base}images/${file}`;

export async function config(name) {
  if (cache.has(name)) return cache.get(name);
  const p = fetch(imageUrl(`${name}.json`)).then((r) => {
    if (!r.ok) throw new Error(`설정 파일이 없다: images/${name}.json`);
    return r.json();
  });
  cache.set(name, p);
  return p;
}

// 그림을 미리 받아 둔다(화면이 바뀔 때 빈 그림이 보이지 않게)
export function preload(file) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = img.onerror = () => resolve(img);
    img.src = imageUrl(file);
  });
}

export async function preloadAll(names) {
  const cfgs = await Promise.all(names.map(config));
  const files = [];
  for (const c of cfgs) {
    files.push(c.file);
    if (c.doors) files.push(c.doors.left.file, c.doors.right.file);
    for (const p of c.clouds || []) files.push(p.file);
  }
  await Promise.all(files.map(preload));
  return cfgs;
}
