/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base: './' 讓打包後的資產使用相對路徑，
// 可直接部署到 GitHub Pages 的專案頁（/repo-name/）而無需改設定。
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    allowedHosts: [],
  },
  test: {
    globals: true,
    environment: 'node',
  },
});
