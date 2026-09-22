// 한글 자모 — 음절 조합 · 풀기 · 자판 글자 받기

const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
const JONG = ' ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ';

// 조각 [첫소리, 가운뎃소리, 끝소리?] → 음절 한 글자
export function compose(parts) {
  const [c, v, j] = parts;
  return String.fromCharCode(0xac00 + CHO.indexOf(c) * 588 + JUNG.indexOf(v) * 28 + (j ? JONG.indexOf(j) : 0));
}

// 음절 칸 안의 배치 — 모음이 세로로 서면 첫소리 옆, 가로로 누우면 첫소리 아래
// v: 첫소리|모음 · v3: 받침이 아래에 · h: 첫소리 위, 모음 아래 · h3: 받침까지 세 줄
const VERTICAL = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅣ';
const HORIZONTAL = 'ㅗㅛㅜㅠㅡ';
export function layoutOf(parts) {
  const v = parts[1];
  const jong = parts.length > 2;
  if (HORIZONTAL.includes(v)) return jong ? 'h3' : 'h';
  // ㅘ ㅚ ㅢ 같은 섞인 모음은 옆에 세운다(이 게임의 낱말에는 ㅚ 하나뿐이다 — 최만리)
  return jong ? 'v3' : 'v';
}

// ── 자판에서 들어온 글자를 자모로 푼다 ──
// 기기 자판은 친 자모를 음절로 묶어 보낸다(ㅇ+ㅛ → 「요」). 게임은 받은 글을 다시 자모로 풀어 쓴다.
// 겹자모(ㄼ · ㅚ · ㅆ · ㅐ …)는 누른 차례대로 더 잘게 풀어 둔다 — 두벌식은 ㄹ·ㅂ을 따로 누르고,
// 기기에 따라 ㅐ를 ㅏ+ㅣ로 보내기도 해서다. 합치는 일은 판(jamo.js)이 칸에 필요한 조각을 보고 한다.
const SPLIT = {
  'ㄳ': 'ㄱㅅ', 'ㄵ': 'ㄴㅈ', 'ㄶ': 'ㄴㅎ', 'ㄺ': 'ㄹㄱ', 'ㄻ': 'ㄹㅁ', 'ㄼ': 'ㄹㅂ', 'ㄽ': 'ㄹㅅ',
  'ㄾ': 'ㄹㅌ', 'ㄿ': 'ㄹㅍ', 'ㅀ': 'ㄹㅎ', 'ㅄ': 'ㅂㅅ',
  'ㅘ': 'ㅗㅏ', 'ㅙ': 'ㅗㅐ', 'ㅚ': 'ㅗㅣ', 'ㅝ': 'ㅜㅓ', 'ㅞ': 'ㅜㅔ', 'ㅟ': 'ㅜㅣ', 'ㅢ': 'ㅡㅣ',
};
// 조각 하나를 누르는 차례로(겹받침·섞인 모음만 쪼갠다 — ㅆ·ㅐ·ㅖ는 두벌식에서 키 하나라 그대로 둔다)
export function atomsOf(piece) {
  return SPLIT[piece] ? SPLIT[piece].split('') : [piece];
}
// 둘을 이어 누르면 한 조각이 되는 짝 — 두벌식 밖의 자판(천지인 등)도 받으려고 ㅆ·ㅐ·ㅔ·ㅒ·ㅖ도 넣는다
const JOIN = { ...Object.fromEntries(Object.entries(SPLIT).map(([k, v]) => [v, k])),
  'ㅅㅅ': 'ㅆ', 'ㄱㄱ': 'ㄲ', 'ㄷㄷ': 'ㄸ', 'ㅂㅂ': 'ㅃ', 'ㅈㅈ': 'ㅉ',
  'ㅏㅣ': 'ㅐ', 'ㅓㅣ': 'ㅔ', 'ㅑㅣ': 'ㅒ', 'ㅕㅣ': 'ㅖ' };
export function join(a, b) { return JOIN[a + b] || null; }

// 두벌식 영문 자판 글자 → 자모 (한글 입력기가 꺼진 채 칠 때)
const QWERTY = {
  r: 'ㄱ', R: 'ㄲ', s: 'ㄴ', e: 'ㄷ', E: 'ㄸ', f: 'ㄹ', a: 'ㅁ', q: 'ㅂ', Q: 'ㅃ', t: 'ㅅ', T: 'ㅆ',
  d: 'ㅇ', w: 'ㅈ', W: 'ㅉ', c: 'ㅊ', z: 'ㅋ', x: 'ㅌ', v: 'ㅍ', g: 'ㅎ',
  k: 'ㅏ', o: 'ㅐ', O: 'ㅒ', i: 'ㅑ', j: 'ㅓ', p: 'ㅔ', P: 'ㅖ', u: 'ㅕ', h: 'ㅗ', y: 'ㅛ',
  n: 'ㅜ', b: 'ㅠ', m: 'ㅡ', l: 'ㅣ',
};

// 글 한 덩어리 → 자모 차례 (음절은 풀고, 겹자모는 쪼개고, 영문 자판 글자는 바꾸고, 그 밖의 글자는 버린다)
export function toAtoms(str) {
  const out = [];
  for (const ch of str) {
    const code = ch.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) {
      const n = code - 0xac00;
      out.push(...atomsOf(CHO[Math.floor(n / 588)]));
      out.push(...atomsOf(JUNG[Math.floor((n % 588) / 28)]));
      const j = n % 28;
      if (j) out.push(...atomsOf(JONG[j]));
    } else if (code >= 0x3131 && code <= 0x3163) {
      out.push(...atomsOf(ch));
    } else if (QWERTY[ch]) {
      out.push(...atomsOf(QWERTY[ch]));
    }
  }
  return out;
}

// 키보드 한 번 누름(keydown의 e.key) → 자모 또는 null
export function keyToJamo(key) {
  if (/^[ㄱ-ㅣ]$/.test(key)) return key;
  return QWERTY[key] || null;
}
