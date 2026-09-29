// 카카오톡·페이스북 공유 미리보기 이미지(1200×630) 생성 → apps/<slug>/public/og.png
// 사용: npm run og <slug>
// apps/<slug>/og.html 이 있으면 그걸 쓰고, 없으면 templates/og.html 에 앱 정보를 채워서 쓴다.
// 로컬 Chrome(headless)으로 렌더링한다.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { listApps, root } from './apps.mjs';

const slug = process.argv[2];
const app = listApps().find((a) => a.slug === slug);
if (!app) {
  console.error('사용법: npm run og <slug>');
  process.exit(1);
}

const CHROME = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((p) => p && fs.existsSync(p));
if (!CHROME) {
  console.error('Chrome을 찾을 수 없어요. CHROME_PATH 환경변수로 경로를 지정해 주세요.');
  process.exit(1);
}

const custom = path.join(app.dir, 'og.html');
let html = fs.readFileSync(fs.existsSync(custom) ? custom : path.join(root, 'templates', 'og.html'), 'utf8');
const tokens = { __SLUG__: slug, __TITLE__: app.lab.title, __EMOJI__: app.lab.emoji, __DESC__: app.lab.description };
for (const [k, v] of Object.entries(tokens)) html = html.replaceAll(k, v);

const tmp = path.join(app.dir, '.og-render.html');
const out = path.join(app.dir, 'public', 'og.png');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(tmp, html);
try {
  execFileSync(CHROME, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--window-size=1200,630',
    '--virtual-time-budget=6000', // 웹폰트 로딩 대기
    `--screenshot=${out}`,
    `file://${tmp}`,
  ], { stdio: 'pipe' });
} finally {
  fs.rmSync(tmp, { force: true });
}
console.log(`✔ ${path.relative(root, out)}`);
