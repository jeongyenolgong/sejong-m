// 지도 위의 셈 — 걷는 폭 · 캐릭터 키 · 실마리 곳 · 따라가는 화면 (기7 · 디9 · 기2)
// 값은 public/images/bg_map_*.json에 있다(HANDOFF 📐 「새 그림 위 자리 — 최종」). 단위는 16:10 그림의 %.

// 두 점 사이를 잇는다 — pts [[y, v] …] (y 차례는 상관없다) · 끝 밖은 끝 값
function lerpBy(pts, y) {
  const s = [...pts].sort((a, b) => a[0] - b[0]);
  if (y <= s[0][0]) return s[0].slice(1);
  for (let i = 1; i < s.length; i++) {
    if (y <= s[i][0]) {
      const [y0, ...a] = s[i - 1], [y1, ...b] = s[i];
      const q = y1 === y0 ? 1 : (y - y0) / (y1 - y0);
      return a.map((v, k) => v + (b[k] - v) * q);
    }
  }
  return s[s.length - 1].slice(1);
}

// 이 높이에서 걸을 수 있는 가로 폭 [minX, maxX] — 육조거리·근정전은 높이마다 다르다(walk.bands)
export function bandAt(cfg, y) {
  if (cfg.walk.bands) return lerpBy(cfg.walk.bands, y);
  return [cfg.walk.minX, cfg.walk.maxX];
}

// 캐릭터 키(그림 세로의 %) — 발 높이를 따라 커지고 작아진다(여덟 지도 모두 · 디9)
export function heightAt(cfg, y) {
  if (cfg.scale) return lerpBy(cfg.scale, y)[0];
  return cfg.charHeight;
}

// 캐릭터를 옮긴다 — 가로는 그 높이의 폭 안에서만. 좁아지는 쪽으로 올라갈 때 폭 밖이면 조금은 안쪽으로 밀어 주고,
// 한 번에 크게 밀어야 하면(폭이 뚝 줄어드는 대문 높이) 올라가지 못한다.
export function stepWithin(cfg, x, y, nx, ny, maxShift) {
  const [a, b] = bandAt(cfg, ny);
  let cx = Math.min(b, Math.max(a, nx));
  if (Math.abs(cx - nx) > maxShift && ny !== y) {
    const [a0, b0] = bandAt(cfg, y);
    return { x: Math.min(b0, Math.max(a0, nx)), y, blocked: true };
  }
  return { x: cx, y: ny, blocked: false };
}

// 실마리 곳에 닿았나 — 사람은 발 자리 가까이 · 담장·개울가는 그 칸 안
export function atSpot(spot, x, y, reach = 6) {
  if (spot.x1 !== undefined) return x >= spot.x1 - 0.6 && x <= spot.x2 + 0.6 && y >= spot.y1 && y <= spot.y2 + 0.6;
  return Math.abs(x - spot.x) <= reach && Math.abs(y - spot.y) <= reach;
}

// ── 따라가는 화면 ──
// 그림이 화면보다 넓을 때(세로 태블릿 많이 · 4:3 가로 조금 · 16:10 가로는 안 움직임) 캐릭터가 늘 화면 가로 가운데 근처에 오도록
// 그림을 옆으로 부드럽게 민다 · 그림 끝에 닿으면 멈춘다 · 위아래는 안 움직인다.
// 손가락으로 그림을 옆으로 끌어도 밀린다(캐릭터는 제자리) · 캐릭터가 다시 움직이면 캐릭터에게 부드럽게 돌아온다.
// 조작키 위 · 알림창·판·자막이 떠 있을 때는 안 밀린다(canDrag).
export class Camera {
  constructor(screen, sceneOf, canDrag) {
    this.screen = screen;
    this.sceneOf = sceneOf;          // 너비를 잴 장면(.scene)
    this.canDrag = canDrag;
    this.pan = 0;
    this.manual = null;              // 손가락으로 민 거리(px) — null이면 캐릭터를 따른다
    this.drag = null;
    this.onDown = (e) => {
      if (!this.canDrag() || e.target.closest('.keys, .layer > *, button')) return;
      this.drag = { x: e.clientX, from: this.manual ?? this.pan, id: e.pointerId };
    };
    this.onMove = (e) => {
      if (!this.drag || e.pointerId !== this.drag.id) return;
      this.manual = this.clamp(this.drag.from + (e.clientX - this.drag.x));
      this.apply(this.manual);
    };
    this.onUp = (e) => { if (this.drag && e.pointerId === this.drag.id) this.drag = null; };
    screen.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onUp);
  }
  limit() {
    const w = this.sceneOf().getBoundingClientRect().width;
    return Math.max(0, (w - window.innerWidth) / 2);
  }
  clamp(v) { const m = this.limit(); return Math.max(-m, Math.min(m, v)); }
  apply(v) { this.pan = v; this.screen.style.setProperty('--pan', `${v.toFixed(1)}px`); }
  // 캐릭터 x(%)를 가운데로 · moving이면 손가락 밀기를 풀고 돌아온다 · snap이면 바로
  follow(xPct, dt, moving, snap = false) {
    if (moving) this.manual = null;
    if (this.manual !== null) return;
    const w = this.sceneOf().getBoundingClientRect().width;
    const target = this.clamp(((50 - xPct) / 100) * w);
    const v = snap ? target : this.pan + (target - this.pan) * Math.min(1, dt * 5);
    this.apply(Math.abs(v - target) < 0.3 ? target : v);
  }
  destroy() {
    this.screen.removeEventListener('pointerdown', this.onDown);
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onUp);
  }
}
