-- Creator Engine — concede acesso ao schema creator_engine a um usuário do hermes.
--
-- ⚠️ NÃO É NECESSÁRIO no setup atual: o hermes-agent conecta com romulo_db_user,
-- que é o OWNER do schema creator_engine e já tem acesso total. Use este script
-- APENAS se um dia o hermes passar a usar um usuário dedicado (diferente do owner).
--
-- O hermes-agent conecta no mesmo banco (personal_db) com OUTRO usuário.
-- Rode como o owner do schema (romulo_db_user) ou superuser.
--
-- Substitua hermes_db_user pelo usuário real que o hermes-agent usa.
--   psql -U romulo_db_user -d personal_db -v hermes=hermes_db_user -f prisma/sql/02-grants-hermes.sql
-- (ou edite o nome abaixo manualmente)

\set hermes hermes_db_user

GRANT USAGE ON SCHEMA creator_engine TO :hermes;

-- Acesso às tabelas existentes
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA creator_engine TO :hermes;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA creator_engine TO :hermes;

-- Acesso automático a tabelas/sequences criadas NO FUTURO (db push posterior)
ALTER DEFAULT PRIVILEGES IN SCHEMA creator_engine
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :hermes;
ALTER DEFAULT PRIVILEGES IN SCHEMA creator_engine
  GRANT USAGE, SELECT ON SEQUENCES TO :hermes;
