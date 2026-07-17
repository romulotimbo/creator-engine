-- Curadoria de DMs Instagram — usuário restrito para o Creator Engine.
-- Banco real na VPS: container n8n-postgres, database n8n (não personal_db).
-- Idempotente: rodar manualmente no n8n-postgres.
--   docker exec -i n8n-postgres psql -U n8n_user -d n8n < prisma/sql/09-curadoria-dms-grants.sql
--
-- Substitua 'TROQUE_ESTA_SENHA' antes de executar em produção.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ce_dm_curator') THEN
    CREATE ROLE ce_dm_curator LOGIN PASSWORD 'TROQUE_ESTA_SENHA';
  END IF;
END $$;

GRANT CONNECT ON DATABASE n8n TO ce_dm_curator;
GRANT USAGE ON SCHEMA public TO ce_dm_curator;

GRANT SELECT ON TABLE public.instagram_dm_responses TO ce_dm_curator;

-- Leitura de mensagens inbound para janela de 24h (última mensagem do seguidor)
GRANT SELECT ON TABLE public.instagram_dm_messages TO ce_dm_curator;

GRANT UPDATE (final_text, status, reviewed_at, updated_at)
  ON TABLE public.instagram_dm_responses TO ce_dm_curator;

-- N8N_POSTGRES_URL exemplo (não commitar senha real):
-- postgresql://ce_dm_curator:SENHA@n8n-postgres:5432/n8n
