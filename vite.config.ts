import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      allowedHosts: true as const,
      // The Express server owns the preview connection, so Vite's client-side
      // HMR socket must stay disabled. The preview proxy does not forward it.
      hmr: false,
      watch: null,
    },
  };
});
