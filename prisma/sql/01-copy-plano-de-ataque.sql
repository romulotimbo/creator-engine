-- Creator Engine — Copia do "plano de ataque" para o schema de negocio
--
-- Estrategia (escolhida): NAO mover a tabela original. A tabela
-- public.creator_engine_state permanece INTACTA (hermes-agent e checklist atual
-- continuam funcionando). Criamos uma COPIA em creator_engine para migrar a
-- aplicacao oportunamente; a sincronizacao/corte definitivo fica para depois.
--
-- Pre-requisito: rodar antes 00-init-schemas.sql (schema creator_engine deve existir).
--
--   psql -U romulo_db_user -d personal_db -f prisma/sql/01-copy-plano-de-ataque.sql
--
-- Idempotente: cria a copia so se nao existir e so popula se estiver vazia.
-- Remover a copia (se necessario):
--   DROP TABLE IF EXISTS creator_engine.creator_engine_state;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'creator_engine_state'
  ) THEN
    RAISE NOTICE 'public.creator_engine_state nao encontrada — nada a copiar.';
    RETURN;
  END IF;

  -- Estrutura (colunas, PK, indices, defaults, constraints) identica a original.
  CREATE TABLE IF NOT EXISTS creator_engine.creator_engine_state
    (LIKE public.creator_engine_state INCLUDING ALL);

  -- Popula apenas se a copia estiver vazia, para nao duplicar em re-execucoes.
  IF NOT EXISTS (SELECT 1 FROM creator_engine.creator_engine_state) THEN
    INSERT INTO creator_engine.creator_engine_state
      SELECT * FROM public.creator_engine_state;
    RAISE NOTICE 'Copia criada e populada em creator_engine.creator_engine_state.';
  ELSE
    RAISE NOTICE 'creator_engine.creator_engine_state ja contem dados — copia preservada.';
  END IF;
END $$;
