# API Services - ERP Wash&Go Frontend

Structure modulaire pour les services API du frontend.

## Structure

```
api/
├── config/
│   └── api.ts           # Configuration de l'API (URL, timeout, etc.)
├── utils/
│   ├── httpClient.ts    # Client HTTP réutilisable
│   └── logger.ts        # Utilitaires de logging
├── services/
│   ├── clients.ts       # Service pour les clients
│   ├── services.ts      # Service pour les services
│   ├── appointments.ts  # Service pour les rendez-vous
│   ├── companies.ts     # Service pour les entreprises
│   ├── calendar.ts      # Service pour Google Calendar
│   └── health.ts        # Service pour la santé du backend
└── index.ts             # Point d'entrée principal (exports)
```

## Utilisation

### Importer les services

```typescript
import { ClientService, ServiceService, AppointmentService } from '@/api';
```

### Utiliser un service

```typescript
// Récupérer tous les clients
const result = await ClientService.getAll();
if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error);
}

// Créer un client
const newClient = await ClientService.create({
  type: 'individual',
  name: 'John Doe',
  email: 'john@example.com',
  status: 'Actif',
});

// Mettre à jour un client
const updated = await ClientService.update(clientId, {
  name: 'Jane Doe',
});

// Supprimer un client
const deleted = await ClientService.delete(clientId);
```

### Configuration

La configuration de l'API est centralisée dans `config/api.ts` :

```typescript
import { getBackendUrl, API_CONFIG, DEBUG_MODE } from '@/api';

console.log('Backend URL:', getBackendUrl());
console.log('Debug mode:', DEBUG_MODE);
```

### Client HTTP réutilisable

Le client HTTP peut être utilisé directement :

```typescript
import { httpClient } from '@/api';

// GET request
const result = await httpClient.get('/clients/');

// POST request
const result = await httpClient.post('/clients/', { name: 'John Doe' });

// PUT request
const result = await httpClient.put('/clients/123', { name: 'Jane Doe' });

// DELETE request
const result = await httpClient.delete('/clients/123');
```

## Migration depuis l'ancien code

L'ancien fichier `backendServices.ts` est maintenant une simple réexportation des nouveaux services. Le code existant continue de fonctionner sans modification :

```typescript
// Ancien code (toujours fonctionnel)
import { ClientService } from '@/lib/backendServices';

// Nouveau code (recommandé)
import { ClientService } from '@/api';
```

## Types

Les types sont exportés depuis chaque service :

```typescript
import { Client, Service, Appointment, Company } from '@/api';

const client: Client = {
  type: 'individual',
  name: 'John Doe',
  email: 'john@example.com',
  status: 'Actif',
};
```

## Gestion des erreurs

Tous les services retournent un objet `ApiResponse<T>` :

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

Exemple d'utilisation :

```typescript
const result = await ClientService.getAll();

if (result.success) {
  // Traiter les données
  console.log(result.data);
} else {
  // Gérer l'erreur
  console.error(result.error);
}
```

## Logging

Le logging est automatique en mode développement. Pour activer/désactiver le logging :

```typescript
import { DEBUG_MODE } from '@/api/config/api';

if (DEBUG_MODE) {
  console.log('Mode debug activé');
}
```

## Configuration de l'URL du backend

L'URL du backend est automatiquement détectée :

1. Variable d'environnement `VITE_BACKEND_URL` (priorité)
2. URL relative `/api` (production avec Nginx)
3. `http://localhost:8000` (développement local)

Pour configurer une URL personnalisée, créer un fichier `.env` :

```env
VITE_BACKEND_URL=http://localhost:8000
```

