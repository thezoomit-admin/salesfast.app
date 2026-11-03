import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * GitHub Pages project site base path:
 *   https://thezoomit-admin.github.io/salesfast.app/
 *
 * Local/dev uses `/`. CI sets VITE_BASE_PATH=/salesfast.app/
 */
const base = process.env.VITE_BASE_PATH || '/';

export default defineConfig({
  base,
  plugins: [react()],
});
