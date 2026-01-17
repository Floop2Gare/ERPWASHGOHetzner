/**
 * Plugin Vite pour résoudre les problèmes d'import de prop-types
 * prop-types est un package CommonJS qui doit être converti en ESM
 */
import type { Plugin } from 'vite';

export function fixPropTypes(): Plugin {
  return {
    name: 'fix-prop-types',
    enforce: 'pre',
    configResolved(config) {
      // Forcer Vite à traiter prop-types comme un module CommonJS
      if (!config.optimizeDeps.esbuildOptions) {
        config.optimizeDeps.esbuildOptions = {};
      }
      if (!config.optimizeDeps.esbuildOptions.plugins) {
        config.optimizeDeps.esbuildOptions.plugins = [];
      }
    },
    transform(code, id) {
      // Si le code importe prop-types avec un default import, le convertir
      if (id.includes('node_modules') && code.includes('prop-types')) {
        // Remplacer les imports par défaut problématiques
        code = code.replace(
          /import\s+(\w+)\s+from\s+['"]prop-types['"]/g,
          "import * as $1 from 'prop-types'"
        );
        return { code, map: null };
      }
      return null;
    },
  };
}

