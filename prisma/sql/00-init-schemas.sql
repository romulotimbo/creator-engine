-- Creator Engine — Inicializacao de schemas
-- Banco: personal_db | Owner: romulo_db_user
-- Separacao de contexto por schema dentro do mesmo database:
--   public         -> apps pessoais
--   creator_engine -> apps de negocio (esta aplicacao)
--   rag            -> base vetorial (pgvector) para LLM/RAG futuro
--
-- Idempotente: pode ser executado mais de uma vez com seguranca.
-- Em deploy novo, replicar estas linhas tambem no init-db.sql do container postgres
-- (o init-db.sql so roda em volume novo; em banco existente, rode este arquivo manualmente).
--   psql -U romulo_db_user -d personal_db -f prisma/sql/00-init-schemas.sql

CREATE SCHEMA IF NOT EXISTS creator_engine AUTHORIZATION romulo_db_user;
CREATE SCHEMA IF NOT EXISTS rag AUTHORIZATION romulo_db_user;

-- Extensao vetorial para o contexto RAG (imagem pgvector/pgvector:pg17).
-- CREATE EXTENSION normalmente exige superuser; rode separadamente como superuser
-- quando for implementar o RAG, para nao falhar este script com o usuario da app:
--   CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA rag;
