import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Charger les variables d'environnement
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
  ],
  server: {
    port: 5173,
    host: '0.0.0.0', // Permet l'accès depuis le réseau local
    strictPort: false,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      // Headers pour améliorer la compatibilité avec Safari iOS
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Active-Company-Id',
    },
    hmr: {
      // Le HMR détecte automatiquement l'adresse IP du client
      // Pas besoin de spécifier host, Vite le fait automatiquement
      clientPort: 5173,
    },
    watch: {
      usePolling: true,
      interval: 1000,
    },
    proxy: {
      '/api': {
        // En local, utiliser localhost:8000
        // Pour l'accès mobile, utiliser l'IP locale définie dans .env.local
        // En Docker, utiliser le nom du service backend:8000
        target: env.VITE_BACKEND_URL || 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        // S'assurer que les headers sont transmis correctement
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // S'assurer que le header Authorization est transmis
            if (req.headers.authorization) {
              proxyReq.setHeader('Authorization', req.headers.authorization);
            }
            // Log pour debug (uniquement en dev)
            if (process.env.NODE_ENV !== 'production') {
              const target = env.VITE_BACKEND_URL || 'http://localhost:8000';
              console.log(`[Vite Proxy] ${req.method} ${req.url} -> ${target}${req.url.replace(/^\/api/, '')}`);
            }
          });
          proxy.on('error', (err, _req, res) => {
            console.error('[Vite Proxy] Erreur:', err);
            console.error('[Vite Proxy] Vérifiez que VITE_BACKEND_URL pointe vers l\'IP locale du PC (ex: http://192.168.x.x:8000)');
          });
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@mui/material',
      '@mui/system',
      '@emotion/react',
      '@emotion/styled',
    ],
  },
  };
});
