// 새 앱 스캐폴딩
// 사용: npm run new -- <slug> --title "앱 이름" --emoji "🎈" --desc "한 줄 설명"
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { root } from './apps.mjs';

const args = process.argv.slice(2);
const slug = args[0]?.startsWith('--') ? undefined : args[0];
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

if (!slug || !/^[a-z][a-z0-9-]{1,30}$/.test(slug)) {
  console.error('slug는 소문자로 시작하는 kebab-case 여야 해요. 예: npm run new -- lunch-roulette --title "점심 룰렛"');
  process.exit(1);
}
const appDir = path.join(root, 'apps', slug);
if (fs.existsSync(appDir)) {
  console.error(`이미 있는 앱이에요: apps/${slug}`);
  process.exit(1);
}

const prefix = `${slug.replace(/-/g, '_')}_`;
const tokens = {
  __SLUG__: slug,
  __PREFIX__: prefix,
  __TITLE__: flag('title', slug),
  __EMOJI__: flag('emoji', '✨'),
  __DESC__: flag('desc', ''),
};
const fill = (s) => Object.entries(tokens).reduce((acc, [k, v]) => acc.replaceAll(k, v), s);

fs.cpSync(path.join(root, 'templates', 'app'), appDir, { recursive: true });
for (const file of walk(appDir)) fs.writeFileSync(file, fill(fs.readFileSync(file, 'utf8')));

const ts = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const migration = path.join(root, 'supabase', 'migrations', `${ts}_${prefix.slice(0, -1)}.sql`);
fs.writeFileSync(migration, fill(fs.readFileSync(path.join(root, 'templates', 'migration.sql'), 'utf8')));

execSync('npm install', { cwd: root, stdio: 'inherit' });

console.log(`
✔ apps/${slug} 생성
✔ ${path.relative(root, migration)} 생성 (DB 접두사: ${prefix})

다음 단계:
  1. 마이그레이션 SQL 작성 후 Supabase에 적용
  2. npm run dev ${slug}
  3. push 하면 /${slug}/ 로 배포
`);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walk(p) : [p];
  });
}
