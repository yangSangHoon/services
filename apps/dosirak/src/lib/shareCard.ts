import type { Profile } from './api';
import { won } from './format';

/** 인스타 스토리·피드용 4:5 리포트 카드 (1080×1350) */
export async function makeShareCard(o: { profile: Profile; month: Date; saved: number; count: number; streak: number; photos: string[] }) {
  await document.fonts.ready;
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const font = (size: number, weight = 700) => `${weight} ${size}px 'Jua', 'Apple SD Gothic Neo', sans-serif`;

  g.fillStyle = '#fff6e5';
  g.fillRect(0, 0, W, H);
  // 체크 무늬 도시락 보자기 느낌
  g.fillStyle = 'rgba(255, 122, 69, 0.07)';
  for (let x = 0; x < W; x += 60) for (let y = 0; y < H; y += 60) if ((x / 60 + y / 60) % 2 === 0) g.fillRect(x, y, 60, 60);

  g.fillStyle = '#3b2a1e';
  g.font = font(44, 400);
  g.fillText(`${o.profile.avatar} ${o.profile.nickname}의 ${o.month.getMonth() + 1}월 도시락`, 70, 120);

  g.font = font(64);
  g.fillText('점심값', 70, 230);
  g.fillStyle = '#ff7a45';
  g.font = font(150);
  g.fillText(won(o.saved), 70, 390);
  g.fillStyle = '#3b2a1e';
  g.font = font(64);
  g.fillText('아꼈다 💰', 70, 480);

  g.font = font(44, 400);
  g.fillStyle = '#7a5a43';
  g.fillText(`🍱 도시락 ${o.count}번   🔥 연속 ${o.streak}일`, 70, 570);

  // 사진 3×2
  const imgs = await Promise.all(o.photos.map(loadImg));
  const size = 300;
  const gap = 20;
  imgs.forEach((img, i) => {
    const x = 70 + (i % 3) * (size + gap);
    const y = 640 + Math.floor(i / 3) * (size + gap);
    g.save();
    roundRect(g, x, y, size, size, 28);
    g.clip();
    if (img) {
      const s = Math.max(size / img.width, size / img.height);
      g.drawImage(img, x + (size - img.width * s) / 2, y + (size - img.height * s) / 2, img.width * s, img.height * s);
    } else {
      g.fillStyle = '#ffe2c8';
      g.fillRect(x, y, size, size);
    }
    g.restore();
  });
  if (!imgs.length) {
    g.font = font(200, 400);
    g.fillText('🍱', W / 2 - 100, 960);
  }

  g.fillStyle = '#3b2a1e';
  g.font = font(48);
  g.fillText('싸왔어? 🍱', 70, H - 90);
  g.font = font(28, 400);
  g.fillStyle = '#7a5a43';
  g.fillText('yangsanghoon.github.io/services/dosirak', 70, H - 45);

  return new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('CARD'))), 'image/png'));
}

function loadImg(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
