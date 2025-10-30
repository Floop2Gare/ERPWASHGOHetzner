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
          // Chunk pour Supabase
          'supabase': ['@supabase/supabase-js'],
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
    'import.meta.env.NODE_ENV': JSON.stringify('production')
  }
});
