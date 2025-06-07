import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    https: false, // 개발 환경에서는 HTTP 사용 (localhost는 WebXR에서 예외적으로 허용)
    open: true
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});