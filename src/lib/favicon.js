// 탭 아이콘 — 「통과」 낙관과 같은 붉은 도장 안에 I-01(「한」) · 코드로 그린다 (화면텍스트 목록 0절)
export function drawFavicon(char) {
  const s = 64;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  g.fillStyle = '#F3ECDB';
  g.fillRect(0, 0, s, s);
  g.strokeStyle = '#9E3B2F';
  g.lineWidth = 6;
  g.strokeRect(4, 4, s - 8, s - 8);
  g.fillStyle = '#9E3B2F';
  g.font = '700 42px "Gowun Batang", serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(char, s / 2, s / 2 + 2);
  document.getElementById('favicon').href = c.toDataURL('image/png');
}
