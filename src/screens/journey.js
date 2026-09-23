// ④ 지도 ↔ ⑤ 문 앞 — 육조거리에서 사정전까지 (요소정의 1 · 0-1 · 0-1-1 · 0-3 · ⑤)
//
// 지도는 16:10 그림 8장이다. 한 화면에 한 자리. 캐릭터가 아래에서 위로 걷다가
//   · 문 자리(광화문·흥례문·근정문·사정문) · 다리 자리(영제교)에 닿으면 → 문 앞 화면
//   · 위 끝(육조거리 · 근정전)에 닿으면 → 다음 장이 위에서 내려온다
//   · 사정전에서 정한 자리에 닿으면 → 알현
// 그림 안 위치(걷는 범위 · 문 자리 · 넘어가는 선)는 public/images/bg_map_*.json에 있다.
import { el, wait, animate, ease } from '../lib/dom.js';
import { t } from '../lib/text.js';
import { config, preloadAll } from '../lib/assets.js';
import { scene, visibleX } from '../lib/scene.js';
import { mount, cover, currentScreen } from '../lib/stage.js';
import { Controls } from '../lib/controls.js';
import { Walker, walkLoop } from '../lib/walker.js';
import { notice } from '../lib/notice.js';
import { minimap } from '../lib/minimap.js';
import { T, reduced } from '../lib/timing.js';
import { gateScreen } from './gate.js';

// 자리 여덟 — 지도 그림 · 문 앞 그림 · 알림창 글 · 빗장(자모 조합 문장 ID)
export const PLACES = [
  { map: 'bg_map_1_yukjo', notice: ['Y-01', 'Y-01b'] },
  { map: 'bg_map_2_gwanghwamun', front: 'bg_front_gwanghwamun', notice: ['M1-a', 'M1-b', 'M1-c'], bolts: ['J01'] },
  { map: 'bg_map_3_heungnyemun', front: 'bg_front_heungnyemun', notice: ['M2-a', 'M2-b', 'M2-c'], bolts: ['J02', 'J03'] },
  { map: 'bg_map_4_yeongjegyo', front: 'bg_front_yeongjegyo', bridge: true, notice: ['M3-a', 'M3-b', 'M3-c'], bolts: ['J04', 'J05'] },
  { map: 'bg_map_5_geunjeongmun', front: 'bg_front_geunjeongmun', notice: ['M4-a', 'M4-b', 'M4-c'], bolts: ['J06', 'J07', 'J08'] },
  { map: 'bg_map_6_geunjeongjeon', notice: ['M5-a', 'M5-b', 'M5-c'] },     // 문 앞 화면 없음 — 지도 위에서 알림창
  { map: 'bg_map_7_sajeongmun', front: 'bg_front_sajeongmun', notice: ['M6-a', 'M6-b', 'M6-c'], bolts: ['J09', 'J10', 'J11'] },
  { map: 'bg_map_8_sajeongjeon', audience: true },
];

// 이 자리보다 앞 자리들의 빗장 수
export const boltsBefore = (p) => PLACES.slice(0, p).reduce((n, pl) => n + (pl.bolts ? pl.bolts.length : 0), 0);

// 지도 화면 — 한 번 세우면 문 앞으로 가기 전까지 장을 넘기며 쓴다
class MapView {
  constructor(game, charCfg) {
    this.game = game;
    this.charCfg = charCfg;
  }

  async build(p) {
    this.p = p;
    this.cfg = await config(PLACES[p].map);
    this.controls = new Controls();
    this.spot = el('div.spot', {}, [scene(this.cfg)]);
    this.walker = new Walker(this.charCfg, this.cfg.charHeight);
    this.overlay = el('div.scene.overlay', {}, [this.walker.img]);
    this.mini = minimap(p);
    this.dim = el('div.dim');
    this.layer = el('div.layer');
    this.screen = el('section.screen.map', {}, [this.spot, this.overlay, this.mini, this.controls.el, this.dim, this.layer]);
    this.walker.set(this.cfg.start.x, this.cfg.start.y);
    return this.screen;
  }

  destroy() { this.controls.destroy(); }

  // 다음 장이 위에서 내려오고 지나온 장이 아래로 빠진다 (0-1-1 「스르르」)
  async slideTo(p) {
    const cfg = await config(PLACES[p].map);
    await preloadAll([PLACES[p].map]);
    const incoming = el('div.spot', {}, [scene(cfg)]);
    incoming.style.transform = 'translateY(-100%)';
    this.screen.insertBefore(incoming, this.overlay);
    const outgoing = this.spot;
    const fromY = this.walker.y;
    this.walker.walking(false);
    const toY = cfg.start.y;
    const run = (q) => {
      const e = ease(q);
      incoming.style.transform = `translateY(${-100 + 100 * e}%)`;
      outgoing.style.transform = `translateY(${100 * e}%)`;
      this.walker.set(this.walker.x, fromY + (toY - fromY) * e);
    };
    if (reduced()) run(1); else await animate(T.mapSlide, run);
    outgoing.remove();
    this.spot = incoming;
    this.cfg = cfg;
    this.p = p;
    this.walker.setHeight(cfg.charHeight);
    this.walker.set(Math.min(Math.max(this.walker.x, cfg.walk.minX), cfg.walk.maxX), cfg.start.y);
    const mini = minimap(p);
    this.mini.replaceWith(mini);
    this.mini = mini;
  }

  async showNotice(ids) {
    this.controls.setEnabled(false);
    this.screen.classList.add('noticing');       // 캐릭터와 조작키가 함께 묻힌다
    const [name, ...bodies] = ids.map(t);
    await notice(this.layer, this.dim, name, bodies);
    this.screen.classList.remove('noticing');
    this.controls.setEnabled(true);
  }

  // 걷는다 — 멈출 일이 생기면 그 까닭을 돌려준다
  walk() {
    const c = this.controls;
    const w = this.walker;
    return walkLoop((dt) => {
      const cfg = this.cfg;
      w.walking(c.moving);
      if (!c.moving) return;
      const [va, vb] = visibleX(this.overlay);
      const minX = Math.max(cfg.walk.minX, va + 4);
      const maxX = Math.min(cfg.walk.maxX, vb - 4);
      let x = w.x, y = w.y;
      if (c.held.l) x = Math.max(minX, x - T.walkSpeedX * dt);
      if (c.held.r) x = Math.min(maxX, x + T.walkSpeedX * dt);
      if (c.held.u) y -= T.walkSpeedY * dt;

      if (cfg.gate && y <= cfg.gate.y) {                // 문(다리) 자리
        if (x >= cfg.gate.x1 && x <= cfg.gate.x2) { w.set(x, cfg.gate.y); return 'gate'; }
        y = cfg.gate.y; if (c.held.u) w.bump();          // 구석으로 가면 담장 앞에서 선다
      }
      if (cfg.noticeY !== undefined && this.noticedAt !== this.p && y <= cfg.noticeY) { this.noticedAt = this.p; w.set(x, y); return 'notice'; }
      if (cfg.audienceY !== undefined && y <= cfg.audienceY) { w.set(x, cfg.audienceY); return 'audience'; }
      if (cfg.exitY !== undefined && y <= cfg.exitY) { w.set(x, cfg.exitY); return 'exit'; }
      w.set(x, y);
    });
  }
}

export async function journey(game) {
  const charCfg = await config(game.character === 'f' ? 'ch_back_f' : 'ch_back_m');
  await preloadAll(PLACES.map((p) => p.map));
  let p = game.place;
  let arrival = 'prologue';

  for (;;) {
    const view = new MapView(game, charCfg);
    const screen = await view.build(p);

    // 지도로 들어오는 모양
    if (arrival === 'light') {                      // 문이 열려 빛 속으로 → 빛이 걷히며 지도
      mount(screen);
      await cover('light', T.screenFade, 0);
    } else if (arrival === 'slide') {               // 영제교 다리 끝 → 장 넘김과 같은 결로 위에서 내려온다
      const old = currentScreen();
      screen.classList.add('entering');
      old.after(screen);
      await animate(reduced() ? 1 : T.mapSlide, (q) => {
        const e = ease(q);
        screen.style.transform = `translateY(${-100 + 100 * e}%)`;
        old.style.transform = `translateY(${100 * e}%)`;
      });
      screen.style.transform = '';
      screen.classList.remove('entering');
      mount(screen);
    } else {                                        // 프롤로그 · 이어 하기 → 어두워졌다 밝아진다
      await cover('dark', T.screenFade, 1);
      mount(screen);
      await cover('dark', T.screenFade, 0);
    }

    // 육조거리에 닿으면 알림창 (5-3)
    if (p === 0) await view.showNotice(PLACES[0].notice);
    else view.controls.setEnabled(true);

    // 걷기 — 문 앞 화면으로 가기 전까지는 이 지도 화면이 장을 넘기며 이어진다
    let reason;
    for (;;) {
      reason = await view.walk();
      view.walker.walking(false);
      if (reason === 'notice') { await view.showNotice(PLACES[view.p].notice); continue; }
      if (reason === 'exit') {
        // 장이 넘어가는 동안 걷기는 멈추지만, 누르고 있는 조작키는 그대로 둔다 — 떼지 않고 계속 걸어 올라간다
        await view.slideTo(view.p + 1);
        continue;
      }
      break;
    }
    p = view.p;
    view.controls.setEnabled(false);
    view.destroy();

    if (reason === 'audience') {
      await cover('dark', T.screenFade, 1);          // 알현 화면이 어둠을 걷는다
      return;
    }

    // 문 앞 화면 — 들어갈 때 어두워졌다 밝아진다
    await cover('dark', T.screenFade, 1);
    const result = await gateScreen(game, charCfg, p);   // 빗장을 다 풀고 지나가면 돌아온다
    p += 1;
    arrival = result === 'bridge' ? 'slide' : 'light';
  }
}
