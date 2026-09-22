// 진행 저장 — 그 기계의 브라우저에 남긴다(1인 1기기 · 로그인 없음).
// 언제: 캐릭터를 확정한 순간 · 빗장을 풀 때마다 (요소정의 3절). [종료]를 누르면 「끝냄」을 표시한다.
// 초등·중등은 주소가 달라 저장도 따로 선다(열쇠에 학년이 든다).
import grade from '../../grade.json';

const KEY = `sejong-${grade.grade}-save-v1`;

// { character: 'f'|'m', solved: 푼 빗장 수(0~11), place: 마지막으로 빗장을 푼 자리(지도 장 번호 0~7) 또는 -1, ended: bool }
export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function save(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* 사생활 보호 창 등 — 저장 없이 그대로 논다 */ }
}

export function clear() {
  try { localStorage.removeItem(KEY); } catch { /* 없음 */ }
}
