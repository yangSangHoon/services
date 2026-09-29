// 사용: npm run dev <slug>
import { execSync } from 'node:child_process';
import { listApps, root } from './apps.mjs';

const slug = process.argv[2];
const apps = listApps();
if (!slug || !apps.some((a) => a.slug === slug)) {
  console.log('사용법: npm run dev <slug>\n\n앱 목록:');
  for (const a of apps) console.log(`  ${a.lab.emoji} ${a.slug}  — ${a.lab.title}`);
  process.exit(slug ? 1 : 0);
}
execSync(`npm run dev -w apps/${slug}`, { cwd: root, stdio: 'inherit' });
