// 결과 공유용 사직서 / 퇴직증명서 이미지 (캔버스로 그려 PNG Blob 으로)
import { KINDS, PERKS, START_AGE, type RunResult, type TitleDef } from './game';

const W = 1080;
const H = 1350;
const FONT = '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';

export function makeCard(r: RunResult, titles: TitleDef[], url: string): Promise<Blob | null> {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;

  // 배경 + 종이
  ctx.fillStyle = r.retired ? '#5b4bdb' : '#3a3a44';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fffdf7';
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 40;
  ctx.fillRect(80, 80, W - 160, H - 160);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#d8d1c0';
  ctx.lineWidth = 3;
  ctx.strokeRect(110, 110, W - 220, H - 220);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#1d1d1f';
  ctx.font = `800 92px ${FONT}`;
  ctx.fillText(r.retired ? '퇴 직 증 명 서' : '사   직   서', W / 2, 230);

  // 항목
  const perkLine =
    Object.entries(r.perks)
      .map(([id, n]) => `${PERKS.find((p) => p.id === id)?.emoji ?? ''}${n > 1 ? `×${n}` : ''}`)
      .join(' ') || '없음';
  const rows: [string, string][] = [
    ['성       명', '팀장 (본인)'],
    ['재 직 기 간', `${START_AGE}세 ~ ${r.age}세 (${r.age - START_AGE}년)`],
    ['사       유', r.retired ? '정년퇴임' : r.cause],
    ['막아낸 말', `${r.totalBlocked}건`],
    ['받은 응원', `${r.hits.good}잔`],
    ['최고 연속 방어', `${r.bestStreak}연속`],
    ['받은 특전', perkLine],
  ];
  let y = 360;
  ctx.textAlign = 'left';
  for (const [k, v] of rows) {
    ctx.fillStyle = '#76716a';
    ctx.font = `600 38px ${FONT}`;
    ctx.fillText(k, 170, y);
    ctx.fillStyle = '#1d1d1f';
    ctx.font = `800 42px ${FONT}`;
    ctx.fillText(v, 470, y, W - 470 - 160);
    ctx.strokeStyle = '#ece6d8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(170, y + 40);
    ctx.lineTo(W - 170, y + 40);
    ctx.stroke();
    y += 84;
  }

  // 칭호
  ctx.textAlign = 'center';
  y += 30;
  ctx.fillStyle = '#5b4bdb';
  ctx.font = `800 40px ${FONT}`;
  const shown = titles.slice(0, 3).map((t) => t.name);
  if (shown.length) ctx.fillText(shown.join('  ·  '), W / 2, y, W - 300);

  // 본문
  y += 76;
  ctx.fillStyle = '#4b4740';
  ctx.font = `500 36px ${FONT}`;
  ctx.fillText(
    r.retired ? '위 사람은 모든 공격을 견디고 정년을 맞이하였기에' : `위 사람은 ${KINDS[r.lastHit].name}에 무너져`,
    W / 2,
    y,
  );
  ctx.fillText(r.retired ? '이를 증명합니다.' : '이에 사직하고자 합니다.', W / 2, y + 52);

  // 도장
  ctx.save();
  ctx.translate(W - 210, H - 180);
  ctx.rotate(-0.18);
  ctx.strokeStyle = '#d02a2a';
  ctx.fillStyle = '#d02a2a';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(0, 0, 74, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = `900 46px ${FONT}`;
  ctx.fillText(r.retired ? '정년' : '퇴사', 0, 2);
  ctx.restore();

  ctx.fillStyle = '#76716a';
  ctx.font = `700 34px ${FONT}`;
  ctx.fillText('🛡️ 버텨라, 팀장님', W / 2, H - 175);
  ctx.font = `500 26px ${FONT}`;
  ctx.fillText(url.replace(/^https?:\/\//, ''), W / 2, H - 132);

  return new Promise((res) => c.toBlob((b) => res(b), 'image/png'));
}
