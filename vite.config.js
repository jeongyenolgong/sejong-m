import { defineConfig } from 'vite';

// 깃헙 페이지는 하위 경로(…github.io/<저장소>/)에 놓인다.
// base를 './'로 두어 그림·글꼴·데이터를 모두 상대 경로로 부른다.
export default defineConfig({
  base: './',
  build: { outDir: 'dist', assetsInlineLimit: 0 },
});
