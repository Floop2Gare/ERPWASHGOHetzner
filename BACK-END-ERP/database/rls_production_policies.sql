-- 🔒 Politiques RLS de Production - ERP Wash&Go
-- Date : 22 janvier 2025
-- Status : CRITIQUE - À exécuter après configuration SERVICE_ROLE_KEY

-- ⚠️ IMPORTANT : 
-- - Le backend utilise SERVICE_ROLE_KEY (bypass RLS)
-- - Ces politiques protègent contre l'accès direct à l'API Supabase
-- - Ne JAMAIS exposer SERVICE_ROLE_KEY au frontend

-- ==============================================
-- 1. SUPPRIMER LES POLITIQUES PERMISSIVES
-- ==============================================

-- Supprimer toutes les politiques "Allow all operations"
DROP POLICY IF EXISTS "Allow all operations" ON companies;
DROP POLICY IF EXISTS "Allow all operations" ON clients;
DROP POLICY IF EXISTS "Allow all operations" ON client_contacts;
DROP POLICY IF EXISTS "Allow all operations" ON services;
DROP POLICY IF EXISTS "Allow all operations" ON service_options;
DROP POLICY IF EXISTS "Allow all operations" ON engagements;
DROP POLICY IF EXISTS "Allow all operations" ON leads;
DROP POLICY IF EXISTS "Allow all operations" ON auth_users;
DROP POLICY IF EXISTS "Allow all operations" ON documents;

-- ==============================================
-- 2. POLITIQUES RESTRICTIVES POUR LECTURE
-- ==============================================

-- COMPANIES - Lecture autorisée pour utilisateurs authentifiés
CREATE POLICY "Authenticated users can read companies" ON companies
FOR SELECT
USING (auth.role() = 'authenticated');

-- CLIENTS - Lecture autorisée pour utilisateurs authentifiés
CREATE POLICY "Authenticated users can read clients" ON clients
FOR SELECT
USING (auth.role() = 'authenticated');

-- CLIENT_CONTACTS - Lecture autorisée pour utilisateurs authentifiés
CREATE POLICY "Authenticated users can read client_contacts" ON client_contacts
FOR SELECT
USING (auth.role() = 'authenticated');

-- SERVICES - Lecture autorisée pour utilisateurs authentifiés
CREATE POLICY "Authenticated users can read services" ON services
FOR SELECT
USING (auth.role() = 'authenticated');

-- SERVICE_OPTIONS - Lecture autorisée pour utilisateurs authentifiés
CREATE POLICY "Authenticated users can read service_options" ON service_options
FOR SELECT
USING (auth.role() = 'authenticated');

-- ENGAGEMENTS - Lecture autorisée pour utilisateurs authentifiés
CREATE POLICY "Authenticated users can read engagements" ON engagements
FOR SELECT
USING (auth.role() = 'authenticated');

-- LEADS - Lecture autorisée pour utilisateurs authentifiés
CREATE POLICY "Authenticated users can read leads" ON leads
FOR SELECT
USING (auth.role() = 'authenticated');

-- AUTH_USERS - Lecture autorisée pour utilisateurs authentifiés
CREATE POLICY "Authenticated users can read auth_users" ON auth_users
FOR SELECT
USING (auth.role() = 'authenticated');

-- DOCUMENTS - Lecture autorisée pour utilisateurs authentifiés
CREATE POLICY "Authenticated users can read documents" ON documents
FOR SELECT
USING (auth.role() = 'authenticated');

-- ==============================================
-- 3. POLITIQUES RESTRICTIVES POUR ÉCRITURE
-- ==============================================

-- COMPANIES - Écriture interdite via API publique
CREATE POLICY "No public write access to companies" ON companies
FOR ALL
USING (false);

-- CLIENTS - Écriture interdite via API publique
CREATE POLICY "No public write access to clients" ON clients
FOR ALL
USING (false);

-- CLIENT_CONTACTS - Écriture interdite via API publique
CREATE POLICY "No public write access to client_contacts" ON client_contacts
FOR ALL
USING (false);

-- SERVICES - Écriture interdite via API publique
CREATE POLICY "No public write access to services" ON services
FOR ALL
USING (false);

-- SERVICE_OPTIONS - Écriture interdite via API publique
CREATE POLICY "No public write access to service_options" ON service_options
FOR ALL
USING (false);

-- ENGAGEMENTS - Écriture interdite via API publique
CREATE POLICY "No public write access to engagements" ON engagements
FOR ALL
USING (false);

-- LEADS - Écriture interdite via API publique
CREATE POLICY "No public write access to leads" ON leads
FOR ALL
USING (false);

-- AUTH_USERS - Écriture interdite via API publique
CREATE POLICY "No public write access to auth_users" ON auth_users
FOR ALL
USING (false);

-- DOCUMENTS - Écriture interdite via API publique
CREATE POLICY "No public write access to documents" ON documents
FOR ALL
USING (false);

-- ==============================================
-- 4. VÉRIFICATION DES POLITIQUES
-- ==============================================

-- Vérifier que RLS est activé sur toutes les tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('companies', 'clients', 'client_contacts', 'services', 'service_options', 'engagements', 'leads', 'auth_users', 'documents');

-- Lister toutes les politiques actives
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ==============================================
-- 5. NOTES IMPORTANTES
-- ==============================================

/*
SÉCURITÉ RENFORCÉE :

1. ✅ Lecture autorisée pour utilisateurs authentifiés uniquement
2. ❌ Écriture interdite via API publique (ANON_KEY)
3. ✅ Backend utilise SERVICE_ROLE_KEY (bypass RLS)
4. ✅ Protection contre accès direct frontend → Supabase

ARCHITECTURE SÉCURISÉE :

Frontend (ANON_KEY) → Lecture seule via API Supabase
Backend (SERVICE_ROLE_KEY) → Lecture/Écriture via API Supabase
Frontend → Backend → Supabase (recommandé)

TESTS DE SÉCURITÉ :

1. Tester lecture avec ANON_KEY (doit fonctionner)
2. Tester écriture avec ANON_KEY (doit échouer)
3. Tester écriture avec SERVICE_ROLE_KEY (doit fonctionner)
4. Vérifier que le backend fonctionne normalement

MONITORING :

- Surveiller les tentatives d'écriture avec ANON_KEY
- Alerter en cas d'accès suspect
- Logger toutes les opérations sensibles
*/

