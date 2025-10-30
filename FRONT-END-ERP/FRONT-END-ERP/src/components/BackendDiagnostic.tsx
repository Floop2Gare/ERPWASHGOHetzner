import { useState, useEffect } from 'react';
import { BackendHealthService } from '../lib/backendServices';

interface DiagnosticResult {
  success: boolean;
  error?: string;
  url?: string;
  data?: any;
}

export const BackendDiagnostic = () => {
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostic = async () => {
    setLoading(true);
    try {
      const result = await BackendHealthService.testConnection();
      setDiagnostic(result);
    } catch (error) {
      setDiagnostic({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostic();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        <span className="text-sm text-blue-700">Test de connexion au backend...</span>
      </div>
    );
  }

  if (!diagnostic) {
    return null;
  }

  return (
    <div className={`p-3 border rounded-lg ${
      diagnostic.success 
        ? 'bg-green-50 border-green-200' 
        : 'bg-red-50 border-red-200'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`h-2 w-2 rounded-full ${
          diagnostic.success ? 'bg-green-500' : 'bg-red-500'
        }`}></div>
        <span className={`text-sm font-medium ${
          diagnostic.success ? 'text-green-700' : 'text-red-700'
        }`}>
          {diagnostic.success ? 'Backend connecté' : 'Erreur de connexion'}
        </span>
      </div>
      
      {diagnostic.url && (
        <p className="text-xs text-gray-600 mb-1">
          URL: {diagnostic.url}
        </p>
      )}
      
      {diagnostic.error && (
        <p className="text-xs text-red-600 mb-2">
          Erreur: {diagnostic.error}
        </p>
      )}
      
      {diagnostic.success && diagnostic.data && (
        <p className="text-xs text-green-600">
          Status: {JSON.stringify(diagnostic.data)}
        </p>
      )}
      
      <button
        onClick={runDiagnostic}
        className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
      >
        Re-tester la connexion
      </button>
    </div>
  );
};
