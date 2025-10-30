-- Script SQL pour créer toutes les tables de l'ERP Wash&Go
-- À exécuter dans l'éditeur SQL de Supabase

-- Table des entreprises
CREATE TABLE IF NOT EXISTS companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    invoice_logo_url TEXT,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    postal_code VARCHAR(10) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    siret VARCHAR(14) NOT NULL,
    vat_enabled BOOLEAN DEFAULT false,
    vat_rate DECIMAL(5,2) DEFAULT 20.00,
    is_default BOOLEAN DEFAULT false,
    document_header_title VARCHAR(255),
    bank_name VARCHAR(255),
    bank_address TEXT,
    iban VARCHAR(34),
    bic VARCHAR(11),
    planning_user VARCHAR(100),
    website VARCHAR(255),
    legal_notes TEXT,
    vat_number VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des clients
CREATE TABLE IF NOT EXISTS clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('company', 'individual')),
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    siret VARCHAR(14) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'Prospect' CHECK (status IN ('Actif', 'Prospect')),
    tags TEXT[] DEFAULT '{}',
    last_service TIMESTAMP WITH TIME ZONE,
    contacts JSONB DEFAULT '[]'::jsonb, -- Stockage des contacts en JSONB
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des contacts clients (alternative à JSONB)
CREATE TABLE IF NOT EXISTS client_contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    roles TEXT[] DEFAULT '{}',
    is_billing_default BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des services
CREATE TABLE IF NOT EXISTS services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    base_duration INTEGER NOT NULL DEFAULT 0, -- en minutes
    active BOOLEAN DEFAULT true,
    options JSONB DEFAULT '[]'::jsonb, -- Stockage des options en JSONB
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des options de services (alternative à JSONB)
CREATE TABLE IF NOT EXISTS service_options (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    label VARCHAR(255) NOT NULL,
    description TEXT,
    extra_price DECIMAL(10,2) NOT NULL,
    extra_duration INTEGER NOT NULL,
    tva_pct DECIMAL(5,2),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des engagements/prestations
CREATE TABLE IF NOT EXISTS engagements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    option_ids UUID[] DEFAULT '{}',
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'brouillon',
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    kind VARCHAR(50) DEFAULT 'service',
    support_type VARCHAR(100) NOT NULL,
    support_detail TEXT,
    additional_charge DECIMAL(10,2) DEFAULT 0,
    contact_ids UUID[] DEFAULT '{}',
    assigned_user_ids UUID[] DEFAULT '{}',
    send_history JSONB DEFAULT '[]'::jsonb,
    invoice_number VARCHAR(50),
    invoice_vat_enabled BOOLEAN,
    quote_number VARCHAR(50),
    quote_status VARCHAR(50),
    mobile_duration_minutes INTEGER,
    mobile_completion_comment TEXT,
    planning_user VARCHAR(100),
    start_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des leads (prospects)
CREATE TABLE IF NOT EXISTS leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    company VARCHAR(255),
    contact VARCHAR(255),
    source VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Nouveau',
    segment VARCHAR(100),
    owner VARCHAR(100),
    tags TEXT[] DEFAULT '{}',
    address TEXT,
    city VARCHAR(100),
    notes TEXT,
    activities JSONB DEFAULT '[]'::jsonb,
    next_step_date TIMESTAMP WITH TIME ZONE,
    next_step_note TEXT,
    last_contact TIMESTAMP WITH TIME ZONE,
    estimated_value DECIMAL(10,2),
    company_id UUID REFERENCES companies(id),
    support_type VARCHAR(100),
    support_detail TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des utilisateurs d'authentification
CREATE TABLE IF NOT EXISTS auth_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    pages TEXT[] DEFAULT '{}',
    permissions TEXT[] DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des documents (PDF)
CREATE TABLE IF NOT EXISTS documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    engagement_id UUID REFERENCES engagements(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('invoice', 'quote')),
    file_path TEXT NOT NULL,
    file_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_type ON clients(type);

CREATE INDEX IF NOT EXISTS idx_engagements_scheduled_at ON engagements(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_engagements_status ON engagements(status);
CREATE INDEX IF NOT EXISTS idx_engagements_client_id ON engagements(client_id);
CREATE INDEX IF NOT EXISTS idx_engagements_service_id ON engagements(service_id);
CREATE INDEX IF NOT EXISTS idx_engagements_company_id ON engagements(company_id);

CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(active);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_owner ON leads(owner);
CREATE INDEX IF NOT EXISTS idx_leads_company_id ON leads(company_id);

CREATE INDEX IF NOT EXISTS idx_companies_is_default ON companies(is_default);

CREATE INDEX IF NOT EXISTS idx_auth_users_username ON auth_users(username);
CREATE INDEX IF NOT EXISTS idx_documents_engagement_id ON documents(engagement_id);

CREATE INDEX IF NOT EXISTS idx_client_contacts_client_id ON client_contacts(client_id);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_client_contacts_updated_at ON client_contacts;
CREATE TRIGGER update_client_contacts_updated_at BEFORE UPDATE ON client_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_services_updated_at ON services;
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_service_options_updated_at ON service_options;
CREATE TRIGGER update_service_options_updated_at BEFORE UPDATE ON service_options FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_engagements_updated_at ON engagements;
CREATE TRIGGER update_engagements_updated_at BEFORE UPDATE ON engagements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_auth_users_updated_at ON auth_users;
CREATE TRIGGER update_auth_users_updated_at BEFORE UPDATE ON auth_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) - Sécurité au niveau des lignes
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Politiques RLS (à adapter selon vos besoins)
-- Pour l'instant, on autorise tout (à sécuriser en production)
DROP POLICY IF EXISTS "Allow all operations" ON companies;
CREATE POLICY "Allow all operations" ON companies FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all operations" ON clients;
CREATE POLICY "Allow all operations" ON clients FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all operations" ON client_contacts;
CREATE POLICY "Allow all operations" ON client_contacts FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all operations" ON services;
CREATE POLICY "Allow all operations" ON services FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all operations" ON service_options;
CREATE POLICY "Allow all operations" ON service_options FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all operations" ON engagements;
CREATE POLICY "Allow all operations" ON engagements FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all operations" ON leads;
CREATE POLICY "Allow all operations" ON leads FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all operations" ON auth_users;
CREATE POLICY "Allow all operations" ON auth_users FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all operations" ON documents;
CREATE POLICY "Allow all operations" ON documents FOR ALL USING (true);

-- Commentaires sur les tables
COMMENT ON TABLE companies IS 'Entreprises (Wash&Go France, Île-de-France, etc.)';
COMMENT ON TABLE clients IS 'Clients (entreprises ou particuliers)';
COMMENT ON TABLE client_contacts IS 'Contacts des clients (personnes de contact)';
COMMENT ON TABLE services IS 'Services proposés (Lavage Voiture, etc.)';
COMMENT ON TABLE service_options IS 'Options des services (extra, durées, prix)';
COMMENT ON TABLE engagements IS 'Engagements/Rendez-vous/Prestations';
COMMENT ON TABLE leads IS 'Prospects/Leads commerciaux';
COMMENT ON TABLE auth_users IS 'Utilisateurs du système avec rôles et permissions';
COMMENT ON TABLE documents IS 'Documents générés (factures, devis, PDF)';
