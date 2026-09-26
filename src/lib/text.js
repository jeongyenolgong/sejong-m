// 화면 글자 — 엑셀(content/ui_text.xlsx)에서 구운 src/data/ui.json을 번호로 읽는다.
// 하드코딩은 넷뿐이다(아래 HARD · B-12는 숫자라 코드가 세어 적는다). 나머지 글은 모두 엑셀에 있다.
import ui from '../data/ui.json';

export function t(id) {
  const v = ui[id];
  if (v === undefined) {
    console.warn(`화면 글자에 ${id}가 없다 — content/ui_text.xlsx를 확인한다`);
    return '';
  }
  return v;
}

// 하드코딩 — 글자가 아니라 표시이고, 누르는 키와 짝을 이룬다 (화면텍스트 엑셀 「읽는 법」)
// B-12 판 왼쪽 위 「2 / 3」은 숫자뿐이라 여기 두지 않고 판이 세어 적는다(boards/jamo.js · hint.js)
export const HARD = {
  'B-03': { left: '◀', up: '▲', right: '▶' },   // 조작키 — 키보드 ← ↑ → 와 짝
  'B-05': { prev: '‹', next: '›' },             // 넘김 — 프롤로그 · 알현 자막 · 갈무리 판
  'B-11': '',                                    // 서약서 체크 칸 — 모양은 CSS가 그린다
};
