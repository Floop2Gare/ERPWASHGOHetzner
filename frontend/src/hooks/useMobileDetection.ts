import { useEffect, useState } from 'react';

/**
 * Détecte si l'utilisateur est sur un appareil mobile ou en mode mobile
 * 
 * La détection se base sur :
 * 1. Le paramètre URL ?ui=mobile ou ?ui=desktop (prioritaire)
 * 2. Le User-Agent du navigateur
 * 3. La largeur de l'écran (max-width: 768px)
 * 
 * @returns {boolean} true si mobile détecté, false sinon
 */
export const useMobileDetection = (): boolean => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const detectMobileUserAgent = (userAgent: string): boolean => {
      return /android|iphone|ipad|ipod|mobile|blackberry|iemobile|opera mini/i.test(
        userAgent
      );
    };

    const shouldRenderMobile = (): boolean => {
      // Vérifier le paramètre URL en priorité (pour forcer mobile/desktop)
      const params = new URLSearchParams(window.location.search);
      const forcedUi = params.get('ui');

      if (forcedUi === 'mobile') {
        return true;
      }

      if (forcedUi === 'desktop') {
        return false;
      }

      // Vérifier le User-Agent
      const userAgent = navigator.userAgent || navigator.vendor || '';
      if (detectMobileUserAgent(userAgent)) {
        return true;
      }

      // Vérifier la largeur de l'écran (détecte aussi le mode responsive F12)
      return window.matchMedia('(max-width: 768px)').matches;
    };

    const evaluate = () => {
      setIsMobile(shouldRenderMobile());
    };

    // Évaluation initiale
    evaluate();

    // Écouter les changements de taille de fenêtre (pour F12 responsive)
    window.addEventListener('resize', evaluate);
    
    // Écouter les changements d'orientation (mobile)
    window.addEventListener('orientationchange', evaluate);

    // Écouter les changements de media query (plus réactif)
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const handleMediaChange = () => {
      evaluate();
    };
    
    // Support moderne avec addEventListener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    } else {
      // Fallback pour anciens navigateurs
      mediaQuery.addListener(handleMediaChange);
    }

    return () => {
      window.removeEventListener('resize', evaluate);
      window.removeEventListener('orientationchange', evaluate);
      
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      } else {
        mediaQuery.removeListener(handleMediaChange);
      }
    };
  }, []);

  return isMobile;
};

