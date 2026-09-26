// ⑤ 문 앞 화면 — 정면 그림 · 문짝 · 알림창 · 문제판 · 캐릭터 · 조작키 ◀ ▲ ▶ (요소정의 3 · ⑤ · ⑤-A · 5-3)
//
//  도착 → 문이 먼저 보인다 → 알림창(처음 올 때 한 번 · 「닫기」를 눌러야 조작키가 산다)
//  → ▲로 문을 민다 → 빗장이 남았으면 덜컹(쿵 + 문짝이 세 번 부딪히며 잦아듦 + 멈춤 · 세기 = 남은 빗장 수 · 디10)
//  → 판이 뜬다(뒤가 어두워지고 캐릭터·조작키가 숨는다)
//  → 자모 조합(실마리를 누르면 지도로 나가 곳을 찾아가고, 힌트 퀴즈를 마치면 이 판으로 바로 돌아온다 · 기2)
//  → 점검 퀴즈 → 「통과」 낙관 → 판이 걷힌다(바로 조작키가 먹는다)
//  → 다시 ▲ … → 빗장을 다 풀면 ▲로 문이 열려 너머 풍경이 보이고, 캐릭터가 걸어 들어갈 때 빛이 차오른다 → 지도 (기8)
//  문짝 뒤에는 늘 「문 너머」가 깔려 있다 — 문 앞 그림 양옆 칸의 너머를 이어 붙인 것(새 그림 없음 · 광화문은 홍예 모양 · 디11)
//  「빗장」은 그림이 없는 잠금 단위다 — 문제 하나 = 빗장 하나(요소정의 요소 4 · 2026-09-23 그림을 뺐다).
//
// 영제교는 문짝이 없다 — 다리를 건너다 중간에 두 번 투명한 벽에 막히고(쿵 + 멈춤 · 디10) 그때 판이 뜬다. 다리 끝에 닿으면 지도로.
// 그림 안 위치(문짝 · 경첩 · 서는 자리 · 미는 선 · 벽)는 public/images/bg_front_*.json에 있다.
import { el, wait, animate, ease } from '../lib/dom.js';
import { t } from '../lib/text.js';
import { config, imageUrl, preloadAll } from '../lib/assets.js';
import { scene, place, visibleX } from '../lib/scene.js';
import { mount, cover } from '../lib/stage.js';
import { Controls } from '../lib/controls.js';
import { Walker, walkLoop } from '../lib/walker.js';
import { notice } from '../lib/notice.js';
import { T, reduced } from '../lib/timing.js';
import { Board } from '../boards/board.js';
import { PLACES, boltsBefore } from './journey.js';
import jamoData from '../data/jamo.json';

// 쿵 — 장면이 짧게 흔들린다(좌우 % · 0.38초) · 세기는 남은 빗장이 적을수록 크게 (디10)
export function thud(sc, strength) {
  if (reduced() || !strength) return;
  const s = strength;
  sc.animate([{ translate: '0 0' }, { translate: `${-.9 * s}% 0` }, { translate: `${.7 * s}% 0` }, { translate: `${-.35 * s}% 0` }, { translate: '0 0' }],
    { duration: T.thud, easing: 'ease-out' });
}

// seek(q, k, n) — 실마리를 눌렀을 때 지도로 나가 곳을 찾아가 힌트 퀴즈를 풀고 이 화면으로 돌아온다(journey.js)
export async function gateScreen(game, charCfg, p, seek) {
  const pl = PLACES[p];
  const cfg = await config(pl.front);
  await preloadAll([pl.front, 'el_hanji_main', 'el_hanji_side']);
  const first = boltsBefore(p);                          // 이 문의 첫 빗장이 전체에서 몇 번째인가
  const total = pl.bolts.length;
  const solvedHere = () => Math.max(0, Math.min(total, game.solved - first));

  // ── 화면 세우기 ──
  const sc = scene(cfg);
  const doors = {};
  let doorWrap = null;
  if (cfg.doors) {
    doorWrap = el('div.thing.doors');
    for (const side of ['left', 'right']) {
      const d = cfg.doors[side];
      const img = el(`img.door.${side}`, { src: imageUrl(d.file), alt: '' });
      place(img, d);
      doors[side] = img;
      doorWrap.append(img);
    }
    sc.append(doorWrap);
  }
  if (cfg.beyond) {                                      // 문 너머 — 문짝 뒤에 깐다 (기8)
    sc.insertBefore(place(el('img.beyond', { src: imageUrl(cfg.beyond.file), alt: '' }), cfg.beyond), doorWrap);
  }

  const walker = new Walker(charCfg, cfg.charHeight);
  walker.set(cfg.stand.x, cfg.stand.y);
  sc.append(walker.img);

  const controls = new Controls();
  const dim = el('div.dim');
  const layer = el('div.layer');
  const screen = el('section.screen.gate', {}, [sc, controls.el, dim, layer]);
  const board = new Board(layer, dim);

  mount(screen);
  const coverKeys = () => controls.cover([walker.img.getBoundingClientRect()]);   // 캐릭터가 키 뒤에 겹칠 때만 옅게
  requestAnimationFrame(coverKeys);
  await cover('dark', T.screenFade, 0);

  const hideActors = (on) => { screen.classList.toggle('noticing', on); controls.setEnabled(!on); };

  // 알림창 — 도착할 때 한 번. 빗장을 하나라도 푼 뒤에는 다시 뜨지 않는다
  if (solvedHere() === 0) {
    hideActors(true);
    const [name, ...bodies] = pl.notice.map(t);
    await notice(layer, dim, name, bodies);
  }
  hideActors(false);

  // 빗장 하나 — 판을 띄워 푼다
  async function solveBolt() {
    const k = solvedHere();                              // 이 문에서 몇 번째 빗장인가(0부터)
    hideActors(true);
    // 자모 조합 → (실마리) → 점검 퀴즈 → 낙관 → 판 걷힘 — 판이 걷히고 어둠이 걷힐 때 캐릭터·조작키가 함께 나타난다 (⑤ 5)
    const item = jamoData.find((j) => j.id === pl.bolts[k]);
    await board.run(item, {
      counter: [k + 1, total],                           // 판 왼쪽 위 「2 / 3」 (기5)
      seekHint: (q, n, of) => seek(q, n, of, { screen, item }),
      onHintUsed: () => { game.used[item.id] = (game.used[item.id] || 0) + 1; },
      onLift: () => { screen.classList.remove('noticing'); controls.el.classList.remove('off'); },   // 보이기만 — 누르는 것은 판이 다 걷힌 뒤
    });
    game.solved = first + k + 1;
    game.place = p;
    hideActors(false);                                   // 판이 다 걷히면 바로 조작키가 먹는다
  }

  const setDoors = (a) => { doors.left.style.transform = `rotateY(${a}deg)`; doors.right.style.transform = `rotateY(${-a}deg)`; };

  // 덜컹 — 쿵(장면 흔들림) + 문짝이 세 번 부딪히며 잦아듦(0.9초) + 잠겼다는 것을 느낄 멈춤(0.6초) (디10)
  //   가장 크게 벌어지는 폭: 셋 3°(제자리 떨림) · 둘 55° · 하나 80° · 흔들림 셋 0.3 · 둘 0.8 · 하나 1.5
  async function rattle(remaining) {
    const r = Math.min(remaining, 3);
    walker.bump();
    thud(sc, [0, 1.5, .8, .3][r]);
    if (cfg.doors && !reduced()) {
      const A = [0, 80, 55, 3][r];
      await animate(T.doorRattle, (q) => setDoors(A * Math.abs(Math.sin(Math.PI * 3 * q)) * Math.pow(1 - q, 1.4) / 0.786));
      setDoors(0);
    }
    await wait(reduced() ? 0 : T.rattleHold);
  }

  // 문이 열린다 — 경첩을 축으로 돌아 너머 풍경이 보인다 → 캐릭터가 걸어 들어갈 때 빛이 차오른다 (기8)
  async function openDoors() {
    controls.setEnabled(false);
    walker.walking(false);
    const open = animate(reduced() ? 1 : T.doorOpen, (q) => {
      const a = T.doorOpenAngle * ease(q);
      doors.left.style.transform = `rotateY(${a}deg)`;
      doors.right.style.transform = `rotateY(${-a}deg)`;
    });
    await open;
    const fromY = walker.y;
    const toY = cfg.doors.left.y + cfg.doors.left.h * 0.8;
    walker.walking(true);
    await Promise.all([
      animate(reduced() ? 1 : T.lightFill, (q) => {
        walker.set(walker.x, fromY + (toY - fromY) * q);
        walker.img.style.opacity = String(1 - q);
      }),
      cover('light', T.lightFill, 1),
    ]);
    walker.walking(false);
  }

  // ── 걷고 민다 ──
  const bridge = !!pl.bridge;
  for (;;) {
    const reason = await walkLoop((dt) => {
      walker.walking(controls.moving);
      if (!controls.moving) return;
      const [va, vb] = visibleX(sc);
      const minX = Math.max(cfg.walk.minX, va + 3), maxX = Math.min(cfg.walk.maxX, vb - 3);
      let x = walker.x, y = walker.y;
      if (controls.held.l) x = Math.max(minX, x - T.walkSpeedX * dt);
      if (controls.held.r) x = Math.min(maxX, x + T.walkSpeedX * dt);
      if (controls.held.u) y -= T.walkSpeedY * dt;

      if (bridge) {
        const k = solvedHere();
        if (k < total && y <= cfg.walls[k]) { walker.set(x, cfg.walls[k]); return 'wall'; }   // 투명한 벽 
        if (k >= total && y <= cfg.endY) { walker.set(x, cfg.endY); return 'end'; }           // 다리 끝
      } else if (y <= cfg.pushY) {
        y = cfg.pushY;
        const atDoor = x >= cfg.doorRange.x1 && x <= cfg.doorRange.x2;
        if (controls.held.u && atDoor) { walker.set(x, y); return 'push'; }
        if (controls.held.u) walker.bump();                // 문에서 벗어나 있으면 밀리지 않는다
      }
      walker.set(x, y);
      coverKeys();
    });
    walker.walking(false);

    if (reason === 'end') {                              // 영제교 다리 끝 → 지도 5장째(근정문)
      controls.setEnabled(false);
      controls.destroy();
      return 'bridge';
    }
    if (reason === 'wall') {                             // 투명한 벽에 부딪힌다 → 쿵 + 멈춤 → 판 (첫 벽 「둘」 · 둘째 벽 「하나」 · 디10)
      controls.setEnabled(false);
      walker.bump();
      thud(sc, [.8, 1.5][Math.min(solvedHere(), 1)]);
      await wait(reduced() ? 0 : T.rattleHold);
      await solveBolt();
      continue;
    }
    // push
    controls.setEnabled(false);
    const remaining = total - solvedHere();
    if (remaining > 0) {
      await rattle(remaining);
      await solveBolt();
      continue;
    }
    await openDoors();
    controls.destroy();
    return 'door';
  }
}
