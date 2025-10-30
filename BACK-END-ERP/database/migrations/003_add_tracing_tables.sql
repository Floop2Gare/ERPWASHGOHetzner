-- Migration 003: Tables de Traçabilité
-- Date : 22 janvier 2025
-- Description : Ajout des tables pour le monitoring et la traçabilité
-- Status : ⏳ À APPLIQUER

-- Table des logs d'opérations
CREATE TABLE IF NOT EXISTS operation_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id VARCHAR(50) NOT NULL,
    event_id VARCHAR(50),
    operation VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id VARCHAR(50),
    user_id VARCHAR(50),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    additional_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des logs d'API
CREATE TABLE IF NOT EXISTS api_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id VARCHAR(50) NOT NULL,
    method VARCHAR(10) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    status_code INTEGER NOT NULL,
    duration_ms DECIMAL(10,2) NOT NULL,
    user_id VARCHAR(50),
    error_message TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des logs de base de données
CREATE TABLE IF NOT EXISTS database_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id VARCHAR(50) NOT NULL,
    event_id VARCHAR(50),
    operation VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(50),
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des logs Google Calendar
CREATE TABLE IF NOT EXISTS google_calendar_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id VARCHAR(50) NOT NULL,
    event_id VARCHAR(50) NOT NULL,
    operation VARCHAR(100) NOT NULL,
    calendar_id VARCHAR(255) NOT NULL,
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_operation_logs_request_id ON operation_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_timestamp ON operation_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_api_logs_request_id ON api_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_timestamp ON api_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_database_logs_request_id ON database_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_database_logs_timestamp ON database_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_gcal_logs_event_id ON google_calendar_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_gcal_logs_timestamp ON google_calendar_logs(timestamp);

-- RLS pour les tables de logs
ALTER TABLE operation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE database_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_calendar_logs ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour les logs (lecture seule pour les utilisateurs authentifiés)
CREATE POLICY "Authenticated users can read operation_logs" ON operation_logs
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read api_logs" ON api_logs
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read database_logs" ON database_logs
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read google_calendar_logs" ON google_calendar_logs
FOR SELECT
USING (auth.role() = 'authenticated');

-- Écriture des logs uniquement via SERVICE_ROLE_KEY (backend)
CREATE POLICY "Service role can write operation_logs" ON operation_logs
FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Service role can write api_logs" ON api_logs
FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Service role can write database_logs" ON database_logs
FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Service role can write google_calendar_logs" ON google_calendar_logs
FOR ALL
USING (auth.role() = 'service_role');

-- Commentaires
COMMENT ON TABLE operation_logs IS 'Logs des opérations métier avec traçabilité';
COMMENT ON TABLE api_logs IS 'Logs des appels API avec métriques de performance';
COMMENT ON TABLE database_logs IS 'Logs des opérations base de données';
COMMENT ON TABLE google_calendar_logs IS 'Logs des opérations Google Calendar';

