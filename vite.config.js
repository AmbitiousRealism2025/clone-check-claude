import { defineConfig } from 'vite';

/**
 * Clone Check — minimal Vite config.
 *
 * The warm web surface (the single-page verdict view) lands in M3; until then
 * this is a bare config with no multi-page explorer entry points. The M1
 * deliverables are the pure engine (src/js/engine) and the data layer
 * (src/js/data), both consumed by the QA harness in scripts/.
 */
export default defineConfig({
  root: '.',
  base: './',
  build: {
    outDir: 'dist',
  },
  server: {
    port: 3000,
    open: false,
  },
});
