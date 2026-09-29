import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** apps/* 중 package.json 이 있는 앱 목록 (lab 메타데이터 포함) */
export function listApps() {
  const appsDir = path.join(root, 'apps');
  return fs
    .readdirSync(appsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(appsDir, d.name, 'package.json')))
    .map((d) => {
      const pkg = JSON.parse(fs.readFileSync(path.join(appsDir, d.name, 'package.json'), 'utf8'));
      return { slug: d.name, dir: path.join(appsDir, d.name), lab: { title: d.name, emoji: '✨', description: '', ...pkg.lab } };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}
