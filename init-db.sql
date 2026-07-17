-- Provisionamento inicial (executado apenas com PGDATA vazio)
-- personal_db já existe via POSTGRES_DB

CREATE EXTENSION IF NOT EXISTS vector;

GRANT ALL ON SCHEMA public TO romulo_db_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO romulo_db_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO romulo_db_user;

CREATE DATABASE landing_page_db OWNER romulo_db_user;

\connect landing_page_db

CREATE EXTENSION IF NOT EXISTS vector;

GRANT ALL ON SCHEMA public TO romulo_db_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO romulo_db_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO romulo_db_user;
