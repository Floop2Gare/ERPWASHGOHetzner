-- Migration : Ajouter companyId à toutes les tables qui n'en ont pas
-- Ce script assigne les données existantes à une entreprise par défaut

-- 1. Créer une entreprise par défaut si elle n'existe pas
INSERT INTO companies (id, data) VALUES 
('default-company', '{"name": "Entreprise par défaut", "vatEnabled": false, "vatRate": 20}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 2. Assigner companyId aux données existantes pour chaque table

-- Clients
UPDATE clients 
SET data = jsonb_set(data, '{companyId}', '"default-company"')
WHERE data->>'companyId' IS NULL;

-- Leads
UPDATE leads 
SET data = jsonb_set(data, '{companyId}', '"default-company"')
WHERE data->>'companyId' IS NULL;

-- Services
UPDATE services 
SET data = jsonb_set(data, '{companyId}', '"default-company"')
WHERE data->>'companyId' IS NULL;

-- Categories
UPDATE categories 
SET data = jsonb_set(data, '{companyId}', '"default-company"')
WHERE data->>'companyId' IS NULL;

-- Project members
UPDATE project_members 
SET data = jsonb_set(data, '{companyId}', '"default-company"')
WHERE data->>'companyId' IS NULL;

-- Vendor invoices
UPDATE vendor_invoices 
SET data = jsonb_set(data, '{companyId}', '"default-company"')
WHERE data->>'companyId' IS NULL;

-- Client invoices
UPDATE client_invoices 
SET data = jsonb_set(data, '{companyId}', '"default-company"')
WHERE data->>'companyId' IS NULL;

-- Purchases
UPDATE purchases 
SET data = jsonb_set(data, '{companyId}', '"default-company"')
WHERE data->>'companyId' IS NULL;

-- Documents
UPDATE documents 
SET data = jsonb_set(data, '{companyId}', '"default-company"')
WHERE data->>'companyId' IS NULL;

-- Subscriptions
UPDATE subscriptions 
SET data = jsonb_set(data, '{companyId}', '"default-company"')
WHERE data->>'companyId' IS NULL;

-- Vérification : Compter les données sans companyId (devrait être 0 après migration)
SELECT 
    'clients' as table_name, 
    COUNT(*) as missing_company_id 
FROM clients 
WHERE data->>'companyId' IS NULL
UNION ALL
SELECT 'leads', COUNT(*) FROM leads WHERE data->>'companyId' IS NULL
UNION ALL
SELECT 'services', COUNT(*) FROM services WHERE data->>'companyId' IS NULL
UNION ALL
SELECT 'categories', COUNT(*) FROM categories WHERE data->>'companyId' IS NULL
UNION ALL
SELECT 'project_members', COUNT(*) FROM project_members WHERE data->>'companyId' IS NULL
UNION ALL
SELECT 'vendor_invoices', COUNT(*) FROM vendor_invoices WHERE data->>'companyId' IS NULL
UNION ALL
SELECT 'client_invoices', COUNT(*) FROM client_invoices WHERE data->>'companyId' IS NULL
UNION ALL
SELECT 'purchases', COUNT(*) FROM purchases WHERE data->>'companyId' IS NULL
UNION ALL
SELECT 'documents', COUNT(*) FROM documents WHERE data->>'companyId' IS NULL
UNION ALL
SELECT 'subscriptions', COUNT(*) FROM subscriptions WHERE data->>'companyId' IS NULL;
