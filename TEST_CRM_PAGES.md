# Plan de Test CRM - Page par Page

Plan de test méthodique pour valider chaque page du CRM une par une.

## Pages CRM à tester

1. **Dashboard (Tableau de bord)** - `/workspace/crm/tableau-de-bord`
2. **Clients** - `/workspace/crm/clients`
3. **Leads** - `/workspace/crm/leads`
4. **Services** - `/workspace/crm/services`
5. **Planning** - `/workspace/crm/planning`
6. **Statistiques** - `/workspace/crm/statistiques`

## Stratégie de test

### Phase 1 : Préparation
1. ✅ Vérifier que PostgreSQL est démarré
2. ✅ Vérifier que le backend est accessible
3. ✅ Configurer la connexion à la base de données
4. ✅ Appliquer les migrations

### Phase 2 : Test page par page

Pour chaque page, vérifier :
- ✅ La page se charge correctement
- ✅ Les données sont récupérées depuis l'API
- ✅ L'affichage est correct (desktop et mobile)
- ✅ Les fonctionnalités CRUD fonctionnent
- ✅ La gestion des erreurs est correcte
- ✅ Les interactions utilisateur fonctionnent

## Tests par page

### 1. Dashboard (Tableau de bord)

**URL**: `/workspace/crm/tableau-de-bord`

**Fonctionnalités à tester**:
- Affichage des statistiques (KPIs)
- Affichage des graphiques
- Affichage des listes récentes (clients, rendez-vous, etc.)
- Navigation vers les autres pages
- Responsive design

**Endpoints API utilisés**:
- `/stats/` - Statistiques globales
- `/clients/` - Liste des clients
- `/appointments/` - Liste des rendez-vous
- `/services/` - Liste des services

**Critères de réussite**:
- ✅ La page se charge sans erreur
- ✅ Les statistiques s'affichent correctement
- ✅ Les graphiques se chargent
- ✅ Les listes récentes s'affichent
- ✅ La navigation fonctionne

### 2. Clients

**URL**: `/workspace/crm/clients`

**Fonctionnalités à tester**:
- Affichage de la liste des clients
- Recherche de clients
- Filtrage par statut, segment, ville, tag
- Création d'un client
- Modification d'un client
- Suppression d'un client
- Export CSV
- Affichage mobile et desktop

**Endpoints API utilisés**:
- `GET /clients/` - Liste des clients
- `POST /clients/` - Création d'un client
- `PUT /clients/{id}` - Modification d'un client
- `DELETE /clients/{id}` - Suppression d'un client

**Critères de réussite**:
- ✅ La liste des clients s'affiche
- ✅ La recherche fonctionne
- ✅ Les filtres fonctionnent
- ✅ La création d'un client fonctionne
- ✅ La modification d'un client fonctionne
- ✅ La suppression d'un client fonctionne
- ✅ L'export CSV fonctionne
- ✅ L'affichage mobile est correct

### 3. Leads

**URL**: `/workspace/crm/leads`

**Fonctionnalités à tester**:
- Affichage de la liste des leads
- Recherche de leads
- Filtrage par statut
- Création d'un lead
- Modification d'un lead
- Suppression d'un lead
- Conversion d'un lead en client
- Affichage mobile et desktop

**Endpoints API utilisés**:
- `GET /leads/` - Liste des leads
- `POST /leads/` - Création d'un lead
- `PUT /leads/{id}` - Modification d'un lead
- `DELETE /leads/{id}` - Suppression d'un lead

**Critères de réussite**:
- ✅ La liste des leads s'affiche
- ✅ La recherche fonctionne
- ✅ Les filtres fonctionnent
- ✅ La création d'un lead fonctionne
- ✅ La modification d'un lead fonctionne
- ✅ La suppression d'un lead fonctionne
- ✅ La conversion en client fonctionne
- ✅ L'affichage mobile est correct

### 4. Services

**URL**: `/workspace/crm/services`

**Fonctionnalités à tester**:
- Affichage de la liste des services
- Recherche de services
- Filtrage par statut
- Création d'un service
- Modification d'un service
- Suppression d'un service
- Affichage mobile et desktop

**Endpoints API utilisés**:
- `GET /services/` - Liste des services
- `POST /services/` - Création d'un service
- `PUT /services/{id}` - Modification d'un service
- `DELETE /services/{id}` - Suppression d'un service

**Critères de réussite**:
- ✅ La liste des services s'affiche
- ✅ La recherche fonctionne
- ✅ Les filtres fonctionnent
- ✅ La création d'un service fonctionne
- ✅ La modification d'un service fonctionne
- ✅ La suppression d'un service fonctionne
- ✅ L'affichage mobile est correct

### 5. Planning

**URL**: `/workspace/crm/planning`

**Fonctionnalités à tester**:
- Affichage du calendrier
- Affichage des rendez-vous
- Création d'un rendez-vous
- Modification d'un rendez-vous
- Suppression d'un rendez-vous
- Filtrage par utilisateur
- Navigation dans le calendrier (mois, semaine, jour)
- Intégration Google Calendar
- Affichage mobile et desktop

**Endpoints API utilisés**:
- `GET /appointments/` - Liste des rendez-vous
- `POST /appointments/` - Création d'un rendez-vous
- `PUT /appointments/{id}` - Modification d'un rendez-vous
- `DELETE /appointments/{id}` - Suppression d'un rendez-vous
- `GET /planning/google-calendar` - Événements Google Calendar
- `POST /calendar/create-event` - Création d'un événement Google Calendar

**Critères de réussite**:
- ✅ Le calendrier s'affiche
- ✅ Les rendez-vous s'affichent
- ✅ La création d'un rendez-vous fonctionne
- ✅ La modification d'un rendez-vous fonctionne
- ✅ La suppression d'un rendez-vous fonctionne
- ✅ Le filtrage par utilisateur fonctionne
- ✅ La navigation dans le calendrier fonctionne
- ✅ L'intégration Google Calendar fonctionne
- ✅ L'affichage mobile est correct

### 6. Statistiques

**URL**: `/workspace/crm/statistiques`

**Fonctionnalités à tester**:
- Affichage des statistiques
- Affichage des graphiques
- Filtrage par période
- Export des données
- Affichage mobile et desktop

**Endpoints API utilisés**:
- `GET /stats/` - Statistiques globales
- `GET /clients/` - Données des clients
- `GET /appointments/` - Données des rendez-vous
- `GET /services/` - Données des services

**Critères de réussite**:
- ✅ Les statistiques s'affichent
- ✅ Les graphiques s'affichent
- ✅ Le filtrage par période fonctionne
- ✅ L'export des données fonctionne
- ✅ L'affichage mobile est correct

## Ordre de test recommandé

1. **Dashboard** - Page d'accueil, vue d'ensemble
2. **Clients** - Page principale, fonctionnalités CRUD complètes
3. **Services** - Page simple, fonctionnalités CRUD
4. **Leads** - Page avec conversion en client
5. **Planning** - Page complexe avec calendrier
6. **Statistiques** - Page avec graphiques et données

## Checklist de test

Pour chaque page, cocher :
- [ ] La page se charge sans erreur
- [ ] Les données sont récupérées depuis l'API
- [ ] L'affichage est correct (desktop)
- [ ] L'affichage est correct (mobile)
- [ ] Les fonctionnalités CRUD fonctionnent
- [ ] La gestion des erreurs est correcte
- [ ] Les interactions utilisateur fonctionnent
- [ ] Les performances sont acceptables
- [ ] Les tests sont documentés

## Notes

- Tester d'abord avec une base de données vide
- Ajouter progressivement des données de test
- Tester les cas d'erreur (réseau, serveur, validation)
- Tester les performances avec beaucoup de données
- Documenter les problèmes rencontrés
- Corriger les problèmes au fur et à mesure

