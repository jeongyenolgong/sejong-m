// ⑥ 알현 — 사정전 안(BG-20 · 일월오봉도 앞의 세종 · 발 · 한 장) (요소정의 14 · 14-1)
//   ▲로 세종 앞까지 걸어간다 → 첫 자막이 뜨는 순간 조작키를 감춘다 · 캐릭터는 움직이지 못한다
//   → 자막 S-08(세종) → S-07(아이) → S-09(세종) · 프롤로그처럼 넘긴다(터치 · ‹ › · ← →)
//   S-08에는 ‹가 없다 · S-09에서 ›를 누르면 게임이 끝나고 갈무리 판으로 · 말하는 이 이름표는 없다
import { el } from '../lib/dom.js';
import { t, HARD } from '../lib/text.js';
import { config, preloadAll } from '../lib/assets.js';
import { scene, visibleX } from '../lib/scene.js';
import { mount, cover } from '../lib/stage.js';
import { Controls } from '../lib/controls.js';
import { Walker, walkLoop } from '../lib/walker.js';
import { T } from '../lib/timing.js';

export async function audience(game) {
  const [cfg, charCfg] = await Promise.all([config('bg_audience'), config(game.character === 'f' ? 'ch_back_f' : 'ch_back_m')]);
  await preloadAll(['bg_audience']);
  const sc = scene(cfg);
  const walker = new Walker(charCfg, cfg.charHeight);
  walker.set(cfg.stand.x, cfg.stand.y);
  sc.append(walker.img);
  const controls = new Controls();
  const dim = el('div.dim');
  const layer = el('div.layer');
  const screen = el('section.screen.audience', {}, [sc, controls.el, dim, layer]);
  mount(screen);
  await cover('dark', T.screenFade, 0);
  controls.setEnabled(true);

  // 세종 앞까지 걷는다
  await walkLoop((dt) => {
    walker.walking(controls.moving);
    if (!controls.moving) return;
    const [va, vb] = visibleX(sc);
    let x = walker.x, y = walker.y;
    if (controls.held.l) x = Math.max(Math.max(cfg.walk.minX, va + 3), x - T.walkSpeedX * dt);
    if (controls.held.r) x = Math.min(Math.min(cfg.walk.maxX, vb - 3), x + T.walkSpeedX * dt);
    if (controls.held.u) y -= T.walkSpeedY * dt;
    if (y <= cfg.stopY) { walker.set(x, cfg.stopY); return 'stop'; }
    walker.set(x, y);
  });
  walker.walking(false);
  controls.setEnabled(false);
  controls.destroy();

  // 자막 셋 — 화면 차례는 S-08 → S-07 → S-09
  const LINES = [t('S-08'), t('S-07'), t('S-09')];
  await new Promise((resolve) => {
    let at = 0;
    const caption = el('p.caption');
    const left = el('button.side.l', { type: 'button', text: HARD['B-05'].prev, 'aria-label': '앞 자막' });
    const right = el('button.side.r', { type: 'button', text: HARD['B-05'].next, 'aria-label': '다음 자막' });
    const tap = el('button.tapzone', { type: 'button', 'aria-label': HARD['B-05'].next });
    const draw = () => { caption.textContent = LINES[at]; left.hidden = at === 0; };
    const next = () => { if (at === LINES.length - 1) done(); else { at += 1; draw(); } };
    const prev = () => { if (at > 0) { at -= 1; draw(); } };
    const onKey = (e) => { if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') prev(); };
    function done() {
      document.removeEventListener('keydown', onKey);
      caption.remove(); left.remove(); right.remove(); tap.remove();
      resolve();
    }
    tap.addEventListener('click', next);
    right.addEventListener('click', (e) => { e.stopPropagation(); next(); });
    left.addEventListener('click', (e) => { e.stopPropagation(); prev(); });
    document.addEventListener('keydown', onKey);
    screen.append(tap, left, right, caption);
    draw();
  });

  return { screen, dim, layer };
}
