// ② 캐릭터 선택 — 안내(K-01) · 왼쪽 서한글(K-02 · K-02d) · 오른쪽 김세종(K-03 · K-03d) · 「다음」(B-02)
// 배경은 시작 화면과 같은 그림. 고른 쪽 그림만 진해진다(이름·설명은 그대로). 한 번 정하면 바꿀 수 없다.
// (화면텍스트 목록 0-1절 · 요소정의 0-2-1)
import { el } from '../lib/dom.js';
import { t } from '../lib/text.js';
import { config, imageUrl } from '../lib/assets.js';
import { scene } from '../lib/scene.js';
import { mount } from '../lib/stage.js';

export async function selectScreen() {
  const [bg, front] = await Promise.all([config('bg_start'), Promise.all([config('ch_front_f'), config('ch_front_m')])]);
  const next = el('button.cta', { type: 'button', text: t('B-02'), disabled: true });
  let chosen = null;

  const picks = [
    { key: 'f', name: t('K-02'), desc: t('K-02d'), cfg: front[0] },
    { key: 'm', name: t('K-03'), desc: t('K-03d'), cfg: front[1] },
  ].map((c) => {
    const btn = el('button.pick', { type: 'button', 'aria-pressed': 'false', 'aria-label': c.name }, [
      el('img.figure', { src: imageUrl(c.cfg.file), alt: '' }),
      el('span.name', { text: c.name }),
      el('span.desc', { text: c.desc }),
    ]);
    btn.addEventListener('click', () => {
      chosen = c.key;
      for (const p of picks) p.btn.setAttribute('aria-pressed', String(p === entry));
      next.disabled = false;
    });
    const entry = { ...c, btn };
    return entry;
  });

  mount(el('section.screen.select', {}, [
    scene(bg),
    el('div.select-stack', {}, [
      el('p.lead', { text: t('K-01') }),
      el('div.pair', {}, picks.map((p) => p.btn)),
    ]),
    el('div.cta-row', {}, [next]),
  ]));

  await new Promise((r) => next.addEventListener('click', r, { once: true }));
  return chosen;
}
