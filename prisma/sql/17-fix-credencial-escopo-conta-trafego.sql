-- Restaura escopo ContaTrafego em Credencial.
-- O reparo de órfãs em /personas/[slug]/credenciais atribuía personaId a
-- credenciais de afiliados (contaTrafegoId preenchido, categoria em braip/email/…).
-- A listagem de /afiliados/[slug]/credenciais exigia personaId IS NULL e as escondia.
--
-- Idempotente. A app também corrige ao abrir as páginas de credenciais.
--
-- docker exec -i postgres psql -U romulo_db_user -d personal_db < prisma/sql/17-fix-credencial-escopo-conta-trafego.sql

UPDATE creator_engine."Credencial"
SET "personaId" = NULL
WHERE "contaTrafegoId" IS NOT NULL
  AND "personaId" IS NOT NULL;
