// 《세종대왕을 알현하라!》 — 게임의 차례
//
//   불러오기 → ① 시작 → ② 캐릭터 선택 → ③ 프롤로그 → ④ 지도 ↔ ⑤ 문 앞(자모 조합 · 힌트 퀴즈 · 점검 퀴즈)
//   → ⑥ 알현 → ⑦ 갈무리 판 11장 → ⑧ 서약서 → ⑨ 잠든 모습
//
// 화면의 정의는 기획 문서(요소정의_v1.md · 화면텍스트_목록_v1.md)가 SSOT다. 코드 주석의 절 번호가 그 문서의 절이다.
import './styles/base.css';
import './styles/screens.css';
import './styles/journey.css';
import './styles/board.css';
import './styles/ending.css';

import { t } from './lib/text.js';
import { preloadAll, config, imageUrl } from './lib/assets.js';
import { load, save, clear } from './lib/save.js';
import { drawFavicon } from './lib/favicon.js';
import { startScreen } from './screens/start.js';
import { selectScreen } from './screens/select.js';
import { prologue } from './screens/prologue.js';
import { journey } from './screens/journey.js';
import { audience } from './screens/audience.js';
import { ending } from './screens/ending.js';

async function main() {
  document.title = t('T-01');                 // 탭 제목 = T-01 (두 학년 같게)
  drawFavicon(t('I-01'));                      // 탭 아이콘 = 붉은 도장 안에 「한」

  // 불러오는 동안 — 글 없이 시작 화면 바탕색만. 글꼴과 시작 화면 그림이 준비되면 시작 화면이 떠오른다
  await Promise.all([document.fonts.load('400 1em "Gowun Batang"'), document.fonts.load('700 1em "Gowun Batang"'),
    preloadAll(['bg_start', 'ch_front_f', 'ch_front_m'])]);

  // 알림창 · 판 · 갈무리 · 서약서에 까는 본선 한지(EL-02)
  const paper = await config('el_hanji_main');
  document.documentElement.style.setProperty('--paper-main', `url("${imageUrl(paper.file)}")`);

  let game = load();
  await startScreen();

  // 끝까지 한 뒤 다시 켜서 「시작」을 누르면 처음부터 (요소정의 3절 · 2026-09-22)
  if (game && game.ended) { clear(); game = null; }

  if (!game) {
    const character = await selectScreen();
    game = { character, solved: 0, place: -1, ended: false };
    save(game);                                 // 저장은 캐릭터를 확정한 순간부터
  }
  if (game.place < 0) {
    await prologue(game.character);
    game.place = 0;                             // 지도 1장째(육조거리)에서 시작 — 저장은 빗장을 풀 때
  }

  await journey(game);                          // 지도와 문 — 빗장 11개
  const hall = await audience(game);            // 알현
  await ending(game, hall);                     // 갈무리 → 서약서 → 잠든 모습 (알현 그림을 어둡게 깐 채로)
}

main();
