import { useState, useEffect } from 'react';
import { integrationTester, TestResult } from '../utils/integrationTest';

export const IntegrationTestPanel = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [continuousMode, setContinuousMode] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const runTests = async () => {
    setIsRunning(true);
    try {
      const testResults = await integrationTester.runAllTests();
      setResults(testResults);
      setLastRun(new Date());
    } catch (error) {
      console.error('Erreur lors des tests:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const startContinuousTests = () => {
    setContinuousMode(true);
    integrationTester.startContinuousTesting(30000); // 30 secondes
  };

  const stopContinuousTests = () => {
    setContinuousMode(false);
    // Note: Dans un vrai environnement, on devrait pouvoir arrêter les tests continus
  };

  useEffect(() => {
    // Lancer les tests automatiquement au montage
    runTests();
  }, []);

  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  const successRate = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  const getStatusIcon = (success: boolean) => success ? '✅' : '❌';
  const getStatusColor = (success: boolean) => 
    success ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50';

  return (
    <div className="space-y-4">
      {/* En-tête avec contrôles */}
      <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            🧪 Tests d'Intégration Frontend/Backend
          </h3>
          <p className="text-sm text-gray-600">
            Validation de la communication entre Vercel et Railway
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={runTests}
            disabled={isRunning}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              isRunning
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isRunning ? 'Tests en cours...' : 'Lancer les tests'}
          </button>
          {!continuousMode ? (
            <button
              onClick={startContinuousTests}
              className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600"
            >
              Tests continus
            </button>
          ) : (
            <button
              onClick={stopContinuousTests}
              className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600"
            >
              Arrêter
            </button>
          )}
        </div>
      </div>

      {/* Statistiques globales */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{successCount}</div>
            <div className="text-sm text-gray-600">Tests réussis</div>
          </div>
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{totalCount}</div>
            <div className="text-sm text-gray-600">Tests total</div>
          </div>
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{successRate}%</div>
            <div className="text-sm text-gray-600">Taux de réussite</div>
          </div>
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{totalDuration}ms</div>
            <div className="text-sm text-gray-600">Durée totale</div>
          </div>
        </div>
      )}

      {/* Dernière exécution */}
      {lastRun && (
        <div className="text-sm text-gray-600">
          Dernière exécution: {lastRun.toLocaleString('fr-FR')}
        </div>
      )}

      {/* Résultats détaillés */}
      {results.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-md font-semibold text-gray-900">Résultats détaillés</h4>
          {results.map((result, index) => (
            <div
              key={index}
              className={`p-3 border rounded-lg ${getStatusColor(result.success)}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{getStatusIcon(result.success)}</span>
                  <span className="text-sm font-medium">{result.name}</span>
                  <span className="text-xs text-gray-500">({result.duration}ms)</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  result.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {result.success ? 'SUCCESS' : 'FAILED'}
                </span>
              </div>
              
              {result.error && (
                <div className="mt-2 text-xs text-red-600">
                  <strong>Erreur:</strong> {result.error}
                </div>
              )}
              
              {result.data && result.success && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-600 cursor-pointer">
                    Voir les données
                  </summary>
                  <pre className="text-xs mt-1 p-2 bg-gray-100 rounded overflow-auto max-h-32">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Indicateur de tests continus */}
      {continuousMode && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="animate-pulse h-2 w-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-green-700">
              Tests continus actifs (intervalle: 30s)
            </span>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">Instructions</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• Les tests valident la communication entre le frontend Vercel et le backend Railway</li>
          <li>• Les tests continus s'exécutent automatiquement toutes les 30 secondes</li>
          <li>• Surveillez les erreurs 422, CORS et de timeout</li>
          <li>• Les données de test sont créées et peuvent être supprimées manuellement</li>
        </ul>
      </div>
    </div>
  );
};

