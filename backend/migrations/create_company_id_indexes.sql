-- Migration : Créer les index sur companyId pour toutes les tables
-- Ces index optimisent les requêtes filtrées par companyId

-- Index pour clients
CREATE INDEX IF NOT EXISTS idx_clients_company_id ON clients ((data->>'companyId'));

-- Index pour leads
CREATE INDEX IF NOT EXISTS idx_leads_company_id ON leads ((data->>'companyId'));

-- Index pour services
CREATE INDEX IF NOT EXISTS idx_services_company_id ON services ((data->>'companyId'));

-- Index pour categories
CREATE INDEX IF NOT EXISTS idx_categories_company_id ON categories ((data->>'companyId'));

-- Index pour project_members
CREATE INDEX IF NOT EXISTS idx_project_members_company_id ON project_members ((data->>'companyId'));

-- Index pour vendor_invoices
CREATE INDEX IF NOT EXISTS idx_vendor_invoices_company_id ON vendor_invoices ((data->>'companyId'));

-- Index pour client_invoices
CREATE INDEX IF NOT EXISTS idx_client_invoices_company_id ON client_invoices ((data->>'companyId'));

-- Index pour purchases
CREATE INDEX IF NOT EXISTS idx_purchases_company_id ON purchases ((data->>'companyId'));

-- Index pour documents
CREATE INDEX IF NOT EXISTS idx_documents_company_id ON documents ((data->>'companyId'));

-- Index pour subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_company_id ON subscriptions ((data->>'companyId'));

-- Vérification : Lister tous les index créés
SELECT 
    tablename,
    indexname
FROM pg_indexes
WHERE indexname LIKE 'idx_%_company_id'
ORDER BY tablename;
