// ④ 지도 ↔ ⑤ 문 앞 — 육조거리에서 사정전까지 (요소정의 1 · 0-1 · 0-1-1 · 0-3 · ⑤)
//
// 지도는 16:10 그림 8장이다. 한 화면에 한 자리. 캐릭터가 아래에서 위로 걷다가
//   · 문 자리(광화문·홍례문·근정문·사정문) · 다리 자리(영제교)에 닿으면 → 문 앞 화면
//   · 위 끝(육조거리 · 근정전)에 닿으면 → 다음 장이 위에서 내려온다
//   · 사정전에서 정한 자리에 닿으면 → 알현
// 걷는 폭은 그림의 담장·행각이 닿는 곳까지 · 육조거리·근정전은 높이마다 다르다 · 캐릭터 키는 발 높이를 따른다 (기7 · 디9)
// 그림이 화면보다 넓으면(세로 · 4:3) 화면이 캐릭터를 따라 옆으로 밀리고, 손가락으로 밀어 볼 수도 있다 (기7 · lib/field.js)
//
// 육조거리 — 튜토리얼 (기1 · 기2): 알림창 → ▲만(U-01 · 연습 대문 옆 높이에서 멈춤) → ◀만(U-02 · 연습 대문에 닿으면 연습 판)
//   → 연습 판(실마리가 반짝임 · 누르기 전엔 조각이 안 움직임) → 실마리 → 판이 걷히고 아래쪽으로 → 가운데 안내문(U-05)
//   → 오른쪽 위 관청 대문 → 자막(U-06) → 힌트 퀴즈 → 연습 판(첫소리가 채워짐) → 나머지 조각 → 점검 퀴즈 설명(U-04) → [닫기]
//   → U-03 · ▲◀▶ 모두 · 광화문 쪽으로 넘어가는 선은 연습 판을 다 마칠 때까지 닫혀 있다(닿으면 부딪혀 되튕김)
// 본편 실마리 (기2): 문 앞 자모 판에서 실마리를 누르면 그 문의 지도로 돌아온다(맨 아래 출발 자리) → 가운데 안내문(U-12~U-30)이
//   n번째 실마리의 곳 n을 짚는다 → 곳에 닿으면 자막(U-06) → 화면을 누르면 힌트 퀴즈 → 마치면 문 앞 자모 판으로 바로 돌아간다
//   · 가다가 문 자리에 닿으면 자모 판이 다시 열린다(실마리 없이 · 「돌아가기」와 같다 · 알림창은 다시 안 뜬다)
// 근정전 앞마당 (기6): 앞 문들에서 쓰지 않은 실마리 문제를 품계석 앞 관리 8명에게서 푼다 · 다 풀어야 사정문 쪽으로 간다
// 그림 안 위치(걷는 폭 · 키 · 문 자리 · 곳 · 넘어가는 선)는 public/images/bg_map_*.json에 있다.
import { el, wait, animate, ease } from '../lib/dom.js';
import { t } from '../lib/text.js';
import { config, preloadAll } from '../lib/assets.js';
import { scene } from '../lib/scene.js';
import { mount, cover, currentScreen } from '../lib/stage.js';
import { Controls } from '../lib/controls.js';
import { Walker, walkLoop } from '../lib/walker.js';
import { notice, guide, say, GuideLine } from '../lib/notice.js';
import { minimap } from '../lib/minimap.js';
import { bandAt, heightAt, stepWithin, atSpot, Camera } from '../lib/field.js';
import { T, reduced } from '../lib/timing.js';
import { Board, hintBoard, hintsOf } from '../boards/board.js';
import { gateScreen, thud } from './gate.js';
import jamoData from '../data/jamo.json';
import practice from '../data/practice.json';
import grade from '../../grade.json';

// 자리 여덟 — 지도 그림 · 문 앞 그림 · 알림창 글 · 빗장(자모 조합 문장 ID) · 실마리 곳의 안내문(곳 n → 글 번호)
export const PLACES = [
  { map: 'bg_map_1_yukjo', notice: ['Y-01', 'Y-01b'] },
  { map: 'bg_map_2_gwanghwamun', front: 'bg_front_gwanghwamun', notice: ['M1-a', 'M1-b', 'M1-c'], bolts: ['J01'], spots: ['U-12', 'U-13', 'U-14'] },
  { map: 'bg_map_3_heungnyemun', front: 'bg_front_heungnyemun', notice: ['M2-a', 'M2-b', 'M2-c'], bolts: ['J02', 'J03'], spots: ['U-15', 'U-16', 'U-17'] },
  { map: 'bg_map_4_yeongjegyo', front: 'bg_front_yeongjegyo', bridge: true, notice: ['M3-a', 'M3-b', 'M3-c'], bolts: ['J04', 'J05'], spots: ['U-18', 'U-19', 'U-20', 'U-21'] },
  { map: 'bg_map_5_geunjeongmun', front: 'bg_front_geunjeongmun', notice: ['M4-a', 'M4-b', 'M4-c'], bolts: ['J06', 'J07', 'J08'], spots: ['U-22', 'U-23', 'U-24', 'U-25', 'U-26'] },
  { map: 'bg_map_6_geunjeongjeon', notice: ['M5-a', 'M5-b', 'M5-c'], court: true },     // 문 앞 화면 없음 — 지도 위에서 알림창 · 남은 실마리
  { map: 'bg_map_7_sajeongmun', front: 'bg_front_sajeongmun', notice: ['M6-a', 'M6-b', 'M6-c'], bolts: ['J09', 'J10', 'J11'], spots: ['U-27', 'U-28', 'U-29', 'U-30'] },
  { map: 'bg_map_8_sajeongjeon', audience: true },
];

// 이 자리보다 앞 자리들의 빗장 수
export const boltsBefore = (p) => PLACES.slice(0, p).reduce((n, pl) => n + (pl.bolts ? pl.bolts.length : 0), 0);

// 튜토리얼 점검 퀴즈 설명의 두 그림 — 학년대로 · 포스터는 두 줄이 모두 오답인 장(정답 코드가 새지 않게) (기1)
const EXPLAIN_PICS = { tablet: `tut_tablet_${grade.grade}.webp`, poster: `tut_poster_${grade.grade}.webp` };

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
    this.walker = new Walker(this.charCfg, heightAt(this.cfg, this.cfg.start.y));
    this.overlay = el('div.scene.overlay', {}, [this.walker.img]);
    this.mini = minimap(p);
    this.dim = el('div.dim');
    this.layer = el('div.layer');
    this.screen = el('section.screen.map', {}, [this.spot, this.overlay, this.mini, this.controls.el, this.dim, this.layer]);
    this.line = new GuideLine(this.screen);
    this.camera = new Camera(this.screen, () => this.overlay, () => this.controls.enabled && !this.dim.classList.contains('on'));
    this.place(this.cfg.start.x, this.cfg.start.y);
    requestAnimationFrame(() => { this.camera.follow(this.walker.x, 0, false, true); this.coverKeys(); });
    return this.screen;
  }

  destroy() { this.controls.destroy(); this.camera.destroy(); }

  place(x, y) { this.walker.set(x, y); this.walker.setHeight(heightAt(this.cfg, y)); }

  // 캐릭터나 곳(그림 속 사람)이 조작키 뒤에 겹칠 때만 그 키를 옅게
  coverKeys() {
    const r = this.overlay.getBoundingClientRect();
    const people = [...(this.cfg.spots || []), ...(this.cfg.officers || [])].filter((s) => s.x !== undefined).map((s) => {
      const h = heightAt(this.cfg, s.y) * 1.15 / 100 * r.height;
      const cx = r.left + s.x / 100 * r.width, by = r.top + s.y / 100 * r.height;
      return { left: cx - h * 0.25, right: cx + h * 0.25, top: by - h, bottom: by };
    });
    this.controls.cover([this.walker.img.getBoundingClientRect(), ...people]);
  }

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
    const h0 = this.walker.h, h1 = heightAt(cfg, toY);
    const run = (q) => {
      const e = ease(q);
      incoming.style.transform = `translateY(${-100 + 100 * e}%)`;
      outgoing.style.transform = `translateY(${100 * e}%)`;
      this.walker.set(this.walker.x, fromY + (toY - fromY) * e);
      this.walker.setHeight(h0 + (h1 - h0) * e);
    };
    if (reduced()) run(1); else await animate(T.mapSlide, run);
    outgoing.remove();
    this.spot = incoming;
    this.cfg = cfg;
    this.p = p;
    const [a, b] = bandAt(cfg, cfg.start.y);
    this.place(Math.min(Math.max(this.walker.x, a), b), cfg.start.y);
    const mini = minimap(p);
    this.mini.replaceWith(mini);
    this.mini = mini;
  }

  // 판·알림창·안내문·자막이 떠 있는 동안 — 캐릭터와 조작키가 함께 묻힌다
  quiet(on) {
    this.controls.setEnabled(!on);
    this.screen.classList.toggle('noticing', on);
  }
  async showNotice(ids) {
    this.quiet(true);
    const [name, ...bodies] = ids.map(t);
    await notice(this.layer, this.dim, name, bodies);
    this.quiet(false);
  }
  async showGuide(text) {
    this.quiet(true);
    await guide(this.layer, this.dim, text);
    this.quiet(false);
  }
  async showSay(text) {
    this.quiet(true);
    await say(this.screen, this.dim, text);
  }

  // 걷는다 — 멈출 일이 생기면 그 까닭을 돌려준다
  //   rules.stopY — 튜토리얼 1단계: 이 높이에서 멈춤('stop') · rules.practiceGate — 연습 대문에 닿으면 'practice'
  //   rules.target — 찾아가는 곳('spot') · rules.exitClosed — 넘어가는 선이 닫혀 있다(부딪혀 되튕김)
  //   rules.blocked — 근정전: 선에 닿으면 'blocked'(문제가 남아 있을 때) · rules.officer — 차례인 관리('officer')
  walk(rules = {}) {
    const c = this.controls;
    const w = this.walker;
    let lastThud = 0;
    const bounce = (s) => {
      w.bump();
      const now = performance.now();
      if (now - lastThud > 700) { lastThud = now; thud(this.spot.firstChild, s); thud(this.overlay, s); }
    };
    return walkLoop((dt) => {
      const cfg = this.cfg;
      w.walking(c.moving);
      this.camera.follow(w.x, dt, c.moving);
      if (!c.moving) return;
      let x = w.x, y = w.y;
      const sp = T.walkSpeedX * dt;
      if (c.held.l) x -= sp;
      if (c.held.r) x += sp;
      if (c.held.u) y -= T.walkSpeedY * dt;
      ({ x, y } = stepWithin(cfg, w.x, w.y, x, y, sp * 1.5 + 0.2));

      if (rules.stopY !== undefined && y <= rules.stopY) { this.place(x, rules.stopY); this.coverKeys(); return 'stop'; }
      const g = cfg.gate;
      if (g) {                                           // 문(다리) 자리 · 그 밖은 담장 앞에서 선다
        const top = cfg.topY ?? g.y;
        if (y <= g.y && x >= g.x1 && x <= g.x2) { this.place(x, g.y); return 'gate'; }
        if (y <= top) { y = top; if (c.held.u) w.bump(); }
      }
      const pr = cfg.practice;
      if (rules.practiceGate && pr && x <= pr.x2 + 0.6 && y >= pr.y1 && y <= pr.y2) { this.place(x, y); return 'practice'; }
      if (rules.target && atSpot(rules.target, x, y, cfg.reach)) { this.place(x, y); return 'spot'; }
      if (rules.officer && atSpot(rules.officer, x, y, cfg.reach)) { this.place(x, y); return 'officer'; }
      if (cfg.exitY !== undefined && y <= cfg.exitY) {
        if (rules.exitClosed) { y = cfg.exitY + 0.5; bounce(0.8); }
        else if (rules.blocked) { this.place(x, cfg.exitY + 0.5); bounce(0.8); return 'blocked'; }
        else { this.place(x, cfg.exitY); return 'exit'; }
      }
      if (cfg.audienceY !== undefined && y <= cfg.audienceY) { this.place(x, cfg.audienceY); return 'audience'; }
      this.place(x, y);
      this.coverKeys();
    });
  }
}

// ── 본편 실마리 — 지도로 돌아와 곳을 찾아가 힌트 퀴즈를 푼다 (기2) ──
async function seekOnMap(game, charCfg, p, q, k, n, gate) {
  await cover('dark', T.screenFade, 1);
  const view = new MapView(game, charCfg);
  await view.build(p);                                   // 캐릭터는 맨 아래 출발 자리
  mount(view.screen);
  await cover('dark', T.screenFade, 0);
  const spots = view.cfg.spots;
  const i = Math.min(k, spots.length) - 1;
  await view.showGuide(t(PLACES[p].spots[i]));
  const reason = await view.walk({ target: spots[i] });
  view.walker.walking(false);
  let result = 'back';
  if (reason === 'spot') {
    await view.showSay(t('U-06'));
    result = await hintBoard(view.layer, view.dim, q, [k, n]);
  }
  view.quiet(true);
  await cover('dark', T.screenFade, 1);
  view.destroy();
  mount(gate.screen);                                    // 문 앞 자모 판으로 바로 돌아간다
  await cover('dark', T.screenFade, 0);
  return result;
}

// ── 육조거리 튜토리얼 (기1 · 기2) ──
async function tutorial(view) {
  const cfg = view.cfg;
  const c = view.controls;
  await view.showNotice(PLACES[0].notice);
  // 1 ▲만 — 연습 대문 옆 높이에서 멈춘다
  c.allow({ u: true });
  view.line.show(t('U-01'));
  await view.walk({ stopY: cfg.practice.stopY });
  view.walker.walking(false);
  // 2 ◀만 — 연습 대문 앞에 닿으면 연습 판
  c.allow({ l: true });
  view.line.show(t('U-02'));
  await view.walk({ practiceGate: true });
  view.walker.walking(false);
  view.line.hide();
  c.allow({ l: true, u: true, r: true });
  const stand = { x: view.walker.x, y: view.walker.y };

  // 3 연습 판 — 본편과 똑같이 돈다(점검 퀴즈만 설명으로)
  view.quiet(true);
  const board = new Board(view.layer, view.dim);
  await board.run(practice.jamo, {
    counter: [1, 1],
    practice: EXPLAIN_PICS,
    hints: practice.hint,
    // 실마리 → 판이 걷히고 육조거리 아래쪽으로 → 안내문 → 오른쪽 위 관청 대문 → 자막 → 힌트 퀴즈 → 연습 판으로
    seekHint: async (q, k, n) => {
      board.frame.classList.add('away');
      view.dim.classList.remove('on');
      await cover('dark', T.screenFade, 1);
      view.place(cfg.start.x, cfg.start.y);
      view.camera.follow(cfg.start.x, 0, false, true);
      await cover('dark', T.screenFade, 0);
      await view.showGuide(t('U-05'));
      const reason = await view.walk({ target: cfg.spots[0], exitClosed: true, practiceGate: true });
      view.walker.walking(false);
      let result = 'back';
      if (reason === 'spot') {
        await view.showSay(t('U-06'));
        result = await hintBoard(view.layer, view.dim, q, [k, n]);
      }
      view.quiet(true);
      view.place(stand.x, stand.y);
      view.camera.follow(stand.x, 0, false, true);
      view.dim.classList.add('on');
      board.frame.classList.remove('away');
      return result;
    },
    onLift: () => { view.screen.classList.remove('noticing'); },
  });
  view.quiet(false);
  // 4 판이 걷히면 ▲◀▶ 모두 · 광화문 쪽으로 넘어가는 선이 열린다
  view.line.show(t('U-03'));
}

// ── 근정전 앞마당 — 남은 실마리 (기6) ──
// 남은 것 = 앞 문 판(광화문 → 근정문)마다 맞히지 않은 힌트 퀴즈 · 게임 차례 · 관리 8명에게 고르게(앞 관리부터 하나씩 더)
function courtQueue(game) {
  const before = PLACES.slice(0, 5).flatMap((pl) => pl.bolts || []);
  const qs = before.flatMap((id) => {
    const j = jamoData.find((x) => x.id === id);
    return hintsOf(j.word).slice(game.used[id] || 0, j.syllables.length);
  });
  const per = Array.from({ length: 8 }, (_, i) => Math.floor(qs.length / 8) + (i < qs.length % 8 ? 1 : 0));
  const officers = [];
  let at = 0;
  per.forEach((m, i) => { officers.push({ i, qs: qs.slice(at, at + m).map((q, k) => ({ q, n: at + k + 1 })) }); at += m; });
  return { total: qs.length, officers: officers.filter((o) => o.qs.length), solved: 0 };
}
const SIDE = ['왼쪽', '오른쪽'];
const NTH = ['첫', '두', '세', '네'];
const officerWords = (i) => [SIDE[i % 2], NTH[Math.floor(i / 2)]];
const fillIn = (text, i) => { const [side, n] = officerWords(i); return text.replace('{쪽}', side).replace('{n}', n); };

async function courtArrive(view, game) {
  await view.showNotice(PLACES[5].notice);
  view.court = courtQueue(game);
  if (!view.court.total) return;                        // 다 썼으면 그냥 지나간다
  await view.showGuide(t('U-07'));
  await view.showGuide(fillIn(t('U-08'), view.court.officers[0].i));
}
async function courtOfficer(view) {
  const court = view.court;
  const o = court.officers[0];
  await view.showSay(t('U-09'));
  while (o.qs.length) {
    const { q, n } = o.qs[0];
    const last = court.solved + 1 === court.total;
    const r = await hintBoard(view.layer, view.dim, q, [n, court.total], { seal: last });
    if (r !== 'right') break;                            // 「돌아가기」 — 이 문제는 남는다
    o.qs.shift();
    court.solved += 1;
  }
  view.quiet(false);
  if (!o.qs.length) court.officers.shift();
  if (!court.officers.length) { view.line.show(t('U-11')); return; }
  if (!o.qs.length) await view.showGuide(fillIn(t('U-08'), court.officers[0].i));
}

const rulesFor = (view) => {
  if (!view.court || !view.court.officers.length) return {};
  return { blocked: true, officer: view.cfg.officers[view.court.officers[0].i] };
};

export async function journey(game) {
  const charCfg = await config(game.character === 'f' ? 'ch_back_f' : 'ch_back_m');
  await preloadAll(PLACES.map((p) => p.map));
  game.used = game.used || {};                           // 판마다 맞힌 실마리 수(근정전에서 남은 것을 센다)
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
    } else {                                        // 프롤로그 → 어두워졌다 밝아진다
      await cover('dark', T.screenFade, 1);
      mount(screen);
      await cover('dark', T.screenFade, 0);
    }

    // 육조거리에 닿으면 알림창(5-3) → 튜토리얼 · 근정문을 지나 근정전에 들어서면 알림창 → 남은 실마리
    if (p === 0) await tutorial(view);
    else if (PLACES[p].court) { await courtArrive(view, game); view.controls.setEnabled(true); }
    else view.controls.setEnabled(true);

    // 걷기 — 문 앞 화면으로 가기 전까지는 이 지도 화면이 장을 넘기며 이어진다
    let reason;
    for (;;) {
      reason = await view.walk(rulesFor(view));
      view.walker.walking(false);
      if (reason === 'exit') {
        // 장이 넘어가는 동안 걷기는 멈추지만, 누르고 있는 조작키는 그대로 둔다 — 떼지 않고 계속 걸어 올라간다
        view.line.hide();
        await view.slideTo(view.p + 1);
        if (PLACES[view.p].court) { await courtArrive(view, game); view.controls.setEnabled(true); }
        continue;
      }
      if (reason === 'officer') { await courtOfficer(view); continue; }
      if (reason === 'blocked') {                    // 사정문 쪽 길목 — 덜컹 멈추고 다음 차례 관리를 짚는다
        view.controls.release();
        await view.showGuide(fillIn(t('U-10'), view.court.officers[0].i));
        // ▼가 없어 지나온 관리에게 못 내려가므로 맨 아래 출발 자리로 돌아간다 (2026-09-26 🙋 「출발 자리로」)
        view.quiet(true);
        await cover('dark', T.screenFade, 1);
        view.place(view.cfg.start.x, view.cfg.start.y);
        view.camera.follow(view.cfg.start.x, 0, false, true);
        await cover('dark', T.screenFade, 0);
        view.quiet(false);
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
    const result = await gateScreen(game, charCfg, p, (q, k, n, gate) => seekOnMap(game, charCfg, p, q, k, n, gate));
    p += 1;
    arrival = result === 'bridge' ? 'slide' : 'light';
  }
}
