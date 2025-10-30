/**
 * Script de test d'intégration Frontend/Backend
 * Pour valider la communication entre Vercel et Railway
 */

import { 
  BackendHealthService, 
  ClientService, 
  ServiceService, 
  AppointmentService,
  CompanyService 
} from '../lib/backendServices';

export interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  error?: string;
  data?: any;
}

export class IntegrationTester {
  private results: TestResult[] = [];

  async runAllTests(): Promise<TestResult[]> {
    console.log('🧪 Démarrage des tests d\'intégration Frontend/Backend...');
    
    this.results = [];
    
    // Test 1: Connexion de base
    await this.testBackendConnection();
    
    // Test 2: Endpoints principaux
    await this.testClientsEndpoint();
    await this.testServicesEndpoint();
    await this.testAppointmentsEndpoint();
    await this.testCompaniesEndpoint();
    
    // Test 3: Opérations CRUD
    await this.testClientCRUD();
    await this.testServiceCRUD();
    
    // Test 4: Gestion d'erreurs
    await this.testErrorHandling();
    
    // Test 5: Performance
    await this.testPerformance();
    
    this.printSummary();
    return this.results;
  }

  private async runTest(name: string, testFn: () => Promise<any>): Promise<void> {
    const startTime = Date.now();
    try {
      console.log(`⏳ Test: ${name}`);
      const data = await testFn();
      const duration = Date.now() - startTime;
      
      this.results.push({
        name,
        success: true,
        duration,
        data
      });
      
      console.log(`✅ ${name} - ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      
      this.results.push({
        name,
        success: false,
        duration,
        error: errorMessage
      });
      
      console.error(`❌ ${name} - ${duration}ms - ${errorMessage}`);
    }
  }

  private async testBackendConnection(): Promise<void> {
    await this.runTest('Connexion Backend', async () => {
      const result = await BackendHealthService.testConnection();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    });
  }

  private async testClientsEndpoint(): Promise<void> {
    await this.runTest('Endpoint /clients', async () => {
      const result = await ClientService.getClients();
      if (!result.success) {
        throw new Error(result.error);
      }
      return { count: result.data?.length || 0 };
    });
  }

  private async testServicesEndpoint(): Promise<void> {
    await this.runTest('Endpoint /services', async () => {
      const result = await ServiceService.getServices();
      if (!result.success) {
        throw new Error(result.error);
      }
      return { count: result.data?.length || 0 };
    });
  }

  private async testAppointmentsEndpoint(): Promise<void> {
    await this.runTest('Endpoint /appointments', async () => {
      const result = await AppointmentService.getAppointments();
      if (!result.success) {
        throw new Error(result.error);
      }
      return { count: result.data?.length || 0 };
    });
  }

  private async testCompaniesEndpoint(): Promise<void> {
    await this.runTest('Endpoint /companies', async () => {
      const result = await CompanyService.getCompanies();
      if (!result.success) {
        throw new Error(result.error);
      }
      return { count: result.data?.length || 0 };
    });
  }

  private async testClientCRUD(): Promise<void> {
    await this.runTest('CRUD Client', async () => {
      // Test de création d'un client de test
      const testClient = {
        id: `test-client-${Date.now()}`,
        name: `Test Client ${Date.now()}`,
        type: 'company',
        companyName: `Test Company ${Date.now()}`,
        email: `test${Date.now()}@example.com`,
        phone: '0123456789',
        status: 'Actif',
        tags: [],
        contacts: []
      };

      const createResult = await ClientService.createClient(testClient);
      if (!createResult.success) {
        throw new Error(`Création client échouée: ${createResult.error}`);
      }

      return { 
        created: true, 
        clientId: createResult.data?.id 
      };
    });
  }

  private async testServiceCRUD(): Promise<void> {
    await this.runTest('CRUD Service', async () => {
      // Test de création d'un service de test
      const testService = {
        id: `test-service-${Date.now()}`,
        name: `Test Service ${Date.now()}`,
        category: 'Test',
        description: 'Service de test pour validation',
        active: true,
        options: []
      };

      const createResult = await ServiceService.createService(testService);
      if (!createResult.success) {
        throw new Error(`Création service échouée: ${createResult.error}`);
      }

      return { 
        created: true, 
        serviceId: createResult.data?.id 
      };
    });
  }

  private async testErrorHandling(): Promise<void> {
    await this.runTest('Gestion d\'erreurs', async () => {
      // Test avec un ID invalide pour déclencher une erreur 404
      const result = await ClientService.getClient('invalid-id-12345');
      
      // On s'attend à une erreur, donc si c'est un succès, c'est un problème
      if (result.success) {
        throw new Error('Erreur attendue non détectée');
      }
      
      return { 
        errorHandled: true, 
        errorType: result.error 
      };
    });
  }

  private async testPerformance(): Promise<void> {
    await this.runTest('Performance', async () => {
      const iterations = 5;
      const times: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await BackendHealthService.testConnection();
        const endTime = Date.now();
        times.push(endTime - startTime);
      }
      
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      
      if (avgTime > 5000) { // 5 secondes
        throw new Error(`Performance dégradée: ${avgTime}ms en moyenne`);
      }
      
      return {
        avgTime: Math.round(avgTime),
        maxTime,
        minTime,
        iterations
      };
    });
  }

  private printSummary(): void {
    const successCount = this.results.filter(r => r.success).length;
    const totalCount = this.results.length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    
    console.log('\n📊 RÉSUMÉ DES TESTS D\'INTÉGRATION');
    console.log('=====================================');
    console.log(`✅ Tests réussis: ${successCount}/${totalCount}`);
    console.log(`⏱️  Durée totale: ${totalDuration}ms`);
    console.log(`📈 Taux de réussite: ${Math.round((successCount / totalCount) * 100)}%`);
    
    if (successCount < totalCount) {
      console.log('\n❌ TESTS ÉCHOUÉS:');
      this.results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`  - ${r.name}: ${r.error}`);
        });
    }
    
    console.log('\n🔍 DÉTAILS PAR TEST:');
    this.results.forEach(r => {
      const status = r.success ? '✅' : '❌';
      console.log(`  ${status} ${r.name} - ${r.duration}ms`);
      if (r.error) {
        console.log(`    Erreur: ${r.error}`);
      }
    });
  }

  // Méthode pour tester en continu (utile pour le monitoring)
  async startContinuousTesting(intervalMs: number = 30000): Promise<void> {
    console.log(`🔄 Démarrage des tests continus (intervalle: ${intervalMs}ms)`);
    
    const runTests = async () => {
      try {
        await this.runAllTests();
      } catch (error) {
        console.error('Erreur lors des tests continus:', error);
      }
    };
    
    // Premier test immédiat
    await runTests();
    
    // Puis tests périodiques
    setInterval(runTests, intervalMs);
  }
}

// Export d'une instance par défaut
export const integrationTester = new IntegrationTester();

// Fonction utilitaire pour lancer les tests depuis la console
export const runIntegrationTests = () => {
  return integrationTester.runAllTests();
};

// Fonction pour les tests continus
export const startContinuousTests = (intervalMs?: number) => {
  return integrationTester.startContinuousTesting(intervalMs);
};
