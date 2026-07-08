-- Semeia os 3 templates de vídeo (1 por pilar) — idempotente por slug.
-- Seguro para produção: NÃO toca em usuários/personas (ao contrário do seed completo).
-- Rodar: docker exec -i postgres psql -U romulo_db_user -d personal_db -f 05-templates-video.sql
INSERT INTO creator_engine."TemplateVideo"
  (id, slug, nome, descricao, composicao, formatos, ativo, "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'gancho-incongruencia',
   'Gancho da Incongruência (Pilar 1 · Atração)',
   'Choque nos 3s, cena limpa no miolo, texto de impacto/convicção.',
   'gancho-incongruencia',
   ARRAY['VERTICAL_9_16','QUADRADO_1_1','RETRATO_4_5']::creator_engine."FormatoVideo"[],
   true, now(), now()),
  (gen_random_uuid()::text, 'bastidores-disciplina',
   'Bastidores & Disciplina (Pilar 2 · Conexão)',
   'Rotina/treino, legenda em terço inferior, grão sutil e marca dágua.',
   'bastidores-disciplina',
   ARRAY['VERTICAL_9_16','QUADRADO_1_1','RETRATO_4_5']::creator_engine."FormatoVideo"[],
   true, now(), now()),
  (gen_random_uuid()::text, 'provocacao-conversao',
   'Provocação → Conversão (Pilar 3 · Conversão)',
   'Low-key, mistério, encerra em CTA (link na bio).',
   'provocacao-conversao',
   ARRAY['VERTICAL_9_16','QUADRADO_1_1','RETRATO_4_5']::creator_engine."FormatoVideo"[],
   true, now(), now())
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  composicao = EXCLUDED.composicao,
  ativo = true,
  "updatedAt" = now();
