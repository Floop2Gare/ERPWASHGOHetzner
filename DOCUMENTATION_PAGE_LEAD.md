# Documentation - Page Lead / Gestion des Prospects

## 📋 Vue d'ensemble

La page Lead est un module complet de gestion de la prospection et du pipeline commercial. Elle permet de centraliser tous les contacts potentiels (prospects) dans une interface unique, de suivre leur progression dans le processus de vente, et de les convertir en clients une fois qu'ils sont prêts.

**Objectif principal** : Centraliser prospection et pipeline dans une vue compacte et efficace.

---

## 🎯 Fonctionnalités principales

### 1. **Création de Lead**

L'utilisateur peut créer un nouveau prospect avec les informations suivantes :

#### Champs obligatoires
- **Entreprise** : Nom de l'entreprise ou organisation
- **Contact** : Nom de la personne contact

#### Champs optionnels
- **Téléphone** : Numéro de téléphone (normalisé automatiquement)
- **Email** : Adresse email (vérification de doublon)
- **Source** : Provenance du lead (ex: "Site web", "Référence", "Publicité", etc.)
- **Segment** : Catégorie du prospect (ex: "Pro local", "Particulier", "Entreprise", etc.)
- **Statut** : Position dans le pipeline (voir statuts disponibles)
- **Propriétaire** : Responsable commercial assigné au lead
- **Prochain step** : Date de la prochaine action planifiée
- **Détail step** : Description de la prochaine action
- **Valeur estimée** : Montant estimé de la transaction (en euros)
- **Adresse** : Adresse complète
- **Entreprise liée** : Association avec une entreprise existante dans le système
- **Support** : Type de support nécessaire (Voiture, Canapé, Textile)
- **Détail support** : Description détaillée du support
- **Tags** : Étiquettes pour catégoriser (séparées par des virgules)

**Contrôles de validation** :
- Détection automatique des doublons (email ou téléphone)
- Vérification de l'unicité avant enregistrement
- Messages d'erreur clairs en cas de problème

---

### 2. **Modification de Lead**

Tous les champs peuvent être modifiés après création. L'interface permet :
- Mise à jour complète des informations
- Modification du statut dans le pipeline
- Changement de propriétaire
- Ajout/modification des prochaines étapes
- Mise à jour de la valeur estimée

**Actions rapides depuis l'édition** :
- Préparer un devis (redirection vers la page Service avec pré-remplissage)
- Planifier un service (redirection vers la page Service avec pré-remplissage)

---

### 3. **Journal d'activité**

Chaque lead possède un journal d'activité chronologique permettant de :

#### Types d'activités
- **Note** : Note interne sur le lead
- **Appel** : Compte-rendu d'appel téléphonique

#### Fonctionnalités
- Ajout d'activités directement depuis la page d'édition
- Historique complet avec date et heure
- Affichage chronologique des interactions
- Séparation visuelle entre notes et appels

---

### 4. **Recherche et Filtres**

#### Barre de recherche
- Recherche textuelle dans : Entreprise, Contact, Email, Téléphone
- Recherche en temps réel

#### Filtres disponibles
- **Propriétaire** : Filtrer par responsable commercial
- **Statut** : Filtrer par position dans le pipeline
- **Source** : Filtrer par origine du lead
- **Segment** : Filtrer par catégorie
- **Tag** : Filtrer par étiquette

**Comportement** :
- Les filtres sont combinables (recherche ET filtres)
- Les filtres sont persistants pendant la session
- Possibilité de réinitialiser tous les filtres

---

### 5. **Vues d'affichage**

#### Vue Tableau
- Affichage en tableau avec colonnes :
  - Sélection (checkbox)
  - Entreprise / Contact (avec tags)
  - Téléphone (lien cliquable)
  - Email (lien cliquable)
  - Statut (badge coloré)
  - Source / Segment
  - Prochaine action (date + note)
  - Propriétaire / Valeur estimée
  - Actions rapides (Modifier, Contacter, Convertir, Supprimer)
- Design responsive avec vue mobile adaptée
- Tri implicite par date de création (plus récent en premier)
- Sélection multiple avec checkbox

#### Vue Kanban
- Affichage en colonnes selon les statuts du pipeline
- Glisser-déposer pour changer le statut
- Affichage compact des informations principales
- Compteur de leads par statut
- Zones de drop pour réorganiser

**Statuts du pipeline** :
1. **Nouveau** : Lead nouvellement créé
2. **À contacter** : Lead à contacter prochainement
3. **En cours** : Lead en cours de suivi actif
4. **Devis envoyé** : Devis transmis au prospect
5. **Gagné** : Lead converti en client
6. **Perdu** : Lead perdu/abandonné

---

### 6. **Actions sur un Lead**

#### Actions individuelles
- **Modifier** : Ouvrir le formulaire d'édition
- **Contacter** : Ouvrir le client email (Gmail) avec email pré-rempli
- **Convertir en client** : Transformer le lead en client existant
- **Supprimer** : Supprimer définitivement le lead

#### Conversion en Client
- Création automatique d'un client à partir des informations du lead
- Recherche de doublons par email ou téléphone
- Création de contact de facturation automatique
- Mise à jour du statut du lead à "Gagné"
- Génération d'un SIRET temporaire si nécessaire
- Conservation des tags et informations

---

### 7. **Actions en masse (Sélection multiple)**

L'utilisateur peut sélectionner plusieurs leads et effectuer des actions groupées :

- **Sélectionner tout** : Cocher tous les leads visibles (après filtres)
- **Contacter** : Préparer des emails pour tous les leads sélectionnés
- **Convertir** : Convertir tous les leads sélectionnés en clients
- **Supprimer** : Supprimer tous les leads sélectionnés
- **Vider la sélection** : Désélectionner tous les leads

**Comportement** :
- Les sélections sont persistantes lors du changement de vue
- Les actions en masse respectent les permissions utilisateur

---

### 8. **Import CSV**

Fonctionnalité d'import en masse depuis un fichier CSV :

#### Format attendu
Le fichier CSV doit contenir une ligne d'en-tête avec les colonnes suivantes (en français ou anglais) :
- `email` / `Email`
- `telephone` / `Téléphone` / `telephone`
- `entreprise` / `Entreprise`
- `contact` / `Contact` / `nom` / `Nom`
- `source` / `Source`
- `segment` / `Segment`
- `statut` / `Statut`
- `prochain step date` / `Prochain step date`
- `prochain step note` / `Prochain step note`
- `valeur` / `Valeur`
- `proprietaire` / `Propriétaire`
- `tags` / `Tags`
- `adresse` / `Adresse`
- `support` / `Support`
- `support detail` / `Support detail`

#### Comportement
- Détection automatique du séparateur (virgule ou point-virgule)
- Ignore les lignes déjà existantes (par email ou téléphone)
- Création automatique des leads manquants
- Valeurs par défaut si colonnes manquantes :
  - Source : "Import"
  - Segment : "Pro local"
  - Statut : "Nouveau"
  - Propriétaire : Premier propriétaire disponible
  - Support : "Voiture"

---

### 9. **Export CSV**

Export de tous les leads visibles (après filtres) dans un fichier CSV :

#### Colonnes exportées
1. Entreprise
2. Contact
3. Téléphone
4. Email
5. Source
6. Segment
7. Statut
8. Prochain step
9. Note prochaine étape
10. Dernier contact
11. Valeur estimée
12. Propriétaire
13. Tags
14. Adresse
15. Organisation associée
16. Support
17. Détail support
18. Créé le
19. Activités (journal complet formaté)

**Format** :
- Nom de fichier : `leads.csv`
- Format CSV standard
- Encodage UTF-8

---

### 10. **Préparation de Devis/Service**

Depuis la page d'édition d'un lead, possibilité de :

#### Préparer un devis
- Création automatique d'un client si nécessaire
- Redirection vers la page Service
- Pré-remplissage avec :
  - Client (créé ou existant)
  - Entreprise liée
  - Type de support
  - Détail du support
  - Service correspondant au type de support
  - Contact de facturation

#### Planifier un service
- Même processus que pour le devis
- Création d'un engagement de type "service"

**Avantages** :
- Pas de ressaisie des informations
- Continuité du workflow
- Traçabilité complète

---

## 🔐 Permissions requises

Le système utilise un contrôle d'accès basé sur les permissions :

- `lead.edit` : Créer, modifier, supprimer des leads
- `lead.contact` : Contacter un lead par email
- `lead.convert` : Convertir un lead en client
- `lead.delete` : Supprimer un lead

**Note** : Les permissions sont vérifiées à chaque action. Si l'utilisateur n'a pas la permission, le bouton correspondant n'apparaît pas.

---

## 📊 Statuts et Pipeline

### Statuts disponibles
1. **Nouveau** : Badge bleu - Lead fraîchement créé
2. **À contacter** : Badge gris - En attente de premier contact
3. **En cours** : Badge bleu foncé - Suivi actif en cours
4. **Devis envoyé** : Badge jaune/ambre - Devis transmis, en attente de réponse
5. **Gagné** : Badge vert - Lead converti avec succès
6. **Perdu** : Badge rouge - Lead abandonné ou perdu

### Workflow typique
```
Nouveau → À contacter → En cours → Devis envoyé → Gagné
                                                      ↓
                                                    Perdu
```

---

## 🏷️ Types de support

Les leads peuvent être associés à différents types de support :

- **Voiture** : Service mobile sur véhicule
- **Canapé** : Service sur mobilier (canapé)
- **Textile** : Service sur textile/vêtements

Chaque lead peut avoir un détail de support (description libre).

---

## 🔗 Intégrations

### Gmail
- Ouverture automatique du client email Gmail
- Pré-remplissage du destinataire (email du lead)
- Sujet pré-rempli : `[Nom ERP] – Suivi [Nom entreprise]`
- Corps du message avec template par défaut

### Page Service
- Redirection automatique avec pré-remplissage
- Création automatique de client si nécessaire
- Conservation des informations du lead

---

## 📱 Responsive Design

### Desktop
- Vue tableau complète avec toutes les colonnes
- Formulaires en grille 2 colonnes
- Panneau d'édition avec colonne latérale pour les activités

### Mobile
- Vue liste compacte avec cartes
- Formulaires empilés verticalement
- Navigation simplifiée
- Actions rapides accessibles

---

## 💡 Cas d'usage typiques

### 1. Prospection
1. Créer un nouveau lead depuis une source
2. Ajouter les informations de contact
3. Définir la prochaine action (date + note)
4. Assigner un propriétaire
5. Ajouter des tags pour catégoriser

### 2. Suivi commercial
1. Filtrer par propriétaire pour voir ses leads
2. Voir les leads "À contacter" aujourd'hui
3. Ajouter une note après un appel
4. Mettre à jour le statut après contact
5. Planifier la prochaine étape

### 3. Conversion
1. Identifier les leads "Devis envoyé" avec forte valeur
2. Contacter pour relance
3. Convertir en client une fois le devis accepté
4. Créer automatiquement le premier service

### 4. Import en masse
1. Préparer un fichier CSV avec tous les prospects
2. Importer via le bouton "Importer CSV"
3. Vérifier les leads créés
4. Nettoyer les doublons éventuels

### 5. Reporting
1. Filtrer par source pour analyser les meilleures sources
2. Filtrer par segment pour voir les segments performants
3. Exporter en CSV pour analyse externe
4. Utiliser les tags pour segmenter les données

---

## 🎨 Éléments visuels

### Badges de statut
- Couleurs distinctes pour chaque statut
- Format : badge arrondi avec bordure
- Texte en gras pour la lisibilité

### Feedback utilisateur
- Messages de confirmation après chaque action
- Messages d'erreur clairs en cas de problème
- Indicateurs visuels de sélection

### Drag & Drop (Kanban)
- Animation lors du glisser-déposer
- Feedback visuel pendant le drag
- Zone de drop mise en évidence

---

## 🔄 Synchronisation et Persistance

- **Sauvegarde automatique** : Toutes les modifications sont sauvegardées immédiatement
- **Persistance locale** : Les données sont stockées localement (localStorage)
- **Synchronisation backend** : Synchronisation avec l'API backend pour persistance durable
- **Historique** : Conservation de l'historique des activités et modifications

---

## 📝 Notes techniques

### Validation des données
- Email : Vérification de format et de doublon
- Téléphone : Normalisation automatique (espaces supprimés, format international)
- Valeur estimée : Accepte les nombres décimaux
- Dates : Format ISO pour compatibilité

### Performance
- Filtrage en temps réel (memoization React)
- Pagination implicite pour grandes listes
- Lazy loading des activités

### Accessibilité
- Labels ARIA pour les actions
- Navigation au clavier
- Support des lecteurs d'écran

---

## 🚀 Améliorations possibles

### Fonctionnalités suggérées pour optimisation
1. **Rappels automatiques** : Notifications pour les prochaines actions
2. **Templates d'email** : Bibliothèque de templates pour les contacts
3. **Analyse de pipeline** : Graphiques de conversion par statut
4. **Scoring automatique** : Score de qualité du lead basé sur les critères
5. **Intégration CRM** : Synchronisation avec outils externes
6. **Automatisation** : Workflows automatiques selon le statut
7. **Historique détaillé** : Timeline complète avec toutes les interactions
8. **Pièces jointes** : Attacher des documents aux leads
9. **Commentaires collaboratifs** : Notes partagées entre équipe
10. **Statistiques avancées** : Taux de conversion, temps moyen par étape

---

## 📚 Structure des données

### Modèle Lead (Frontend)
```typescript
type Lead = {
  id: string;
  company: string;
  contact: string;
  phone: string;
  email: string;
  source: string;
  segment: string;
  status: LeadStatus; // 'Nouveau' | 'À contacter' | 'En cours' | 'Devis envoyé' | 'Gagné' | 'Perdu'
  nextStepDate: string | null;
  nextStepNote: string;
  estimatedValue: number | null;
  owner: string;
  tags: string[];
  address: string;
  companyId: string | null;
  supportType: SupportType; // 'Voiture' | 'Canapé' | 'Textile'
  supportDetail: string;
  lastContact: string | null;
  activities: LeadActivity[];
  createdAt: string;
  updatedAt: string;
};

type LeadActivity = {
  id: string;
  type: 'note' | 'call';
  content: string;
  createdAt: string;
};
```

---

## 🎯 Résumé pour optimisation ChatGPT

**Objectif** : Optimiser la page Lead pour améliorer l'expérience utilisateur et l'efficacité commerciale.

**Points clés à optimiser** :
1. Workflow de création et modification (réduction des clics)
2. Visualisation des données (meilleure lisibilité des informations clés)
3. Automatisation des tâches répétitives
4. Amélioration de la conversion (assistants pour guider l'utilisateur)
5. Performance avec de grandes quantités de leads
6. Intégration avec les autres modules (Clients, Services, Planning)
7. Reporting et analytics intégrés
8. Mobile-first : amélioration de l'expérience sur mobile
9. Recherche avancée : filtres multiples et recherche par tags
10. Notifications et rappels pour les prochaines actions

**Contraintes techniques** :
- React + TypeScript
- TailwindCSS pour le styling
- Zustand pour la gestion d'état
- API REST backend (FastAPI)
- Responsive design obligatoire
- Permissions basées sur les rôles

---

*Document créé pour faciliter l'optimisation de la page Lead avec ChatGPT*

