import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

/** 모든 앱 공통 Vite 설정: 루트 .env 공유 + 하위 path 배포용 상대 base */
export function labViteConfig() {
  return defineConfig({
    base: './',
    envDir: repoRoot,
    plugins: [react()],
  });
}
