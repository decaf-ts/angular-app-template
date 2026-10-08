// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    exclude: ['@nestjs'],
  },
  ssr: { external: ['@nestjs'] },
  esbuild: {
    exclude: ['@nestjs'],
  },
});
