// 모든 앱을 빌드해서 site/<slug>/ 로 모으고, site/index.html 에 앱 목록을 만든다.
// 사용: npm run build            (전체)
//       npm run build:app <slug> (하나만 빌드해서 확인)
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { listApps, root } from './apps.mjs';

const onlyIdx = process.argv.indexOf('--only');
const only = onlyIdx >= 0 ? process.argv[onlyIdx + 1] : null;

const apps = listApps().filter((a) => !a.lab.hidden && (!only || a.slug === only));
if (only && apps.length === 0) {
  console.error(`앱을 찾을 수 없어요: ${only}`);
  process.exit(1);
}

const out = path.join(root, 'site');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

for (const app of apps) {
  console.log(`\n▶ building ${app.slug}`);
  execSync(`npm run build -w apps/${app.slug}`, { cwd: root, stdio: 'inherit' });
  fs.cpSync(path.join(app.dir, 'dist'), path.join(out, app.slug), { recursive: true });
}

fs.writeFileSync(path.join(out, '.nojekyll'), '');
fs.writeFileSync(path.join(out, 'index.html'), renderIndex(apps));
console.log(`\n✔ ${apps.length}개 앱 → site/`);

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

function renderIndex(apps) {
  const cards = apps
    .map(
      (a) => `<a class="card" href="./${a.slug}/">
        <span class="emoji">${esc(a.lab.emoji)}</span>
        <strong>${esc(a.lab.title)}</strong>
        <p>${esc(a.lab.description)}</p>
        <code>/${a.slug}</code>
      </a>`,
    )
    .join('\n');
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Idea Lab</title>
<style>
  :root { --bg:#f6f5f2; --fg:#1d1d1f; --muted:#6b6b70; --card:#fff; --line:#e4e2dd; --accent:#5b4bdb; }
  @media (prefers-color-scheme: dark) { :root { --bg:#111114; --fg:#f2f2f5; --muted:#9a9aa3; --card:#1b1b20; --line:#2a2a31; --accent:#9d92ff; } }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--fg); font:16px/1.5 -apple-system,BlinkMacSystemFont,"Pretendard","Apple SD Gothic Neo",sans-serif; }
  main { max-width:960px; margin:0 auto; padding:56px 16px; }
  h1 { margin:0 0 4px; font-size:32px; }
  .sub { color:var(--muted); margin:0 0 32px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:16px; }
  .card { display:flex; flex-direction:column; gap:6px; padding:20px; border:1px solid var(--line); border-radius:16px; background:var(--card); color:inherit; text-decoration:none; transition:transform .15s, border-color .15s; }
  .card:hover { transform:translateY(-3px); border-color:var(--accent); }
  .emoji { font-size:36px; }
  .card p { margin:0; color:var(--muted); font-size:14px; flex:1; }
  code { color:var(--accent); font-size:13px; }
</style>
</head>
<body>
<main>
  <h1>🧪 Idea Lab</h1>
  <p class="sub">아이디어로 가볍게 만들어 본 서비스들</p>
  <div class="grid">${cards || '<p class="sub">아직 앱이 없어요.</p>'}</div>
</main>
</body>
</html>
`;
}
