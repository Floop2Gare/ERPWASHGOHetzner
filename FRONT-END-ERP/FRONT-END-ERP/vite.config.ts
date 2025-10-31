import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Chunk principal pour React
          'react-vendor': ['react', 'react-dom'],
          // Chunk pour les utilitaires
          'utils': ['date-fns', 'clsx']
        }
      }
    }
  },
  define: {
    // Variables par défaut pour build de prod sur serveur unique (Nginx proxy /api → backend)
    'import.meta.env.VITE_BACKEND_URL': JSON.stringify('/api'),
    'import.meta.env.VITE_DEBUG_MODE': JSON.stringify('false'),
    'import.meta.env.NODE_ENV': JSON.stringify('production'),
    // Version applicative affichée dans la navbar (à incrémenter: 1.0 → 1.1 → 1.2 ...)
    'import.meta.env.VITE_APP_VERSION': JSON.stringify('1.0')
  }
});
