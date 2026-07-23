-- Normaliza o histórico outgoing da Curadoria DMs no banco n8n.
-- Banco alvo: container n8n-postgres, database n8n.
--
-- Preview (default, sem escrita):
--   psql -U n8n_user -d n8n -f 10-curadoria-dms-historico-outgoing.sql
-- Aplicar:
--   psql -U n8n_user -d n8n -v apply=true -f 10-curadoria-dms-historico-outgoing.sql
-- Rollback seletivo:
--   psql -U n8n_user -d n8n -v rollback=true -f 10-curadoria-dms-historico-outgoing.sql

\if :{?apply}
\else
  \set apply false
\endif

\if :{?rollback}
\else
  \set rollback false
\endif

CREATE INDEX IF NOT EXISTS idx_instagram_dm_history_conversation
  ON public.instagram_dm_messages
  (conversation_id, direction, event_type, sent_at DESC, id DESC);

CREATE TEMP VIEW ce_dm_outgoing_backfill_candidates AS
SELECT DISTINCT ON (src.raw_payload->'message'->>'platformMessageId')
  src.id AS source_row_id,
  src.raw_payload->'message'->>'platformMessageId' AS platform_message_id,
  src.raw_payload->'message'->>'id' AS provider_message_id,
  src.raw_payload->'message'->>'conversationId' AS normalized_conversation_id,
  src.raw_payload->'message'->>'text' AS normalized_message_text,
  COALESCE(
    NULLIF(src.raw_payload->'message'->>'sentAt', '')::timestamptz,
    src.sent_at,
    src.created_at
  ) AS message_sent_at,
  src.ig_account_id,
  src.sender_id,
  src.recipient_id,
  src.attachments_json,
  src.timestamp_ms,
  src.raw_payload,
  src.zernio_account_id,
  src.ig_username,
  src.sender_username,
  src.sender_name,
  src.sender_profile_json
FROM public.instagram_dm_messages src
WHERE src.direction = 'outgoing'
  AND src.event_type = 'message.read'
  AND NULLIF(BTRIM(src.raw_payload->'message'->>'platformMessageId'), '') IS NOT NULL
  AND NULLIF(BTRIM(src.raw_payload->'message'->>'conversationId'), '') IS NOT NULL
  AND NULLIF(BTRIM(src.raw_payload->'message'->>'text'), '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.instagram_dm_messages existing
    WHERE existing.direction = 'outgoing'
      AND existing.event_type = 'message.sent'
      AND (
        existing.message_id =
          'backfill:message.sent:' || (src.raw_payload->'message'->>'platformMessageId')
        OR existing.raw_payload->'message'->>'platformMessageId' =
          src.raw_payload->'message'->>'platformMessageId'
      )
  )
ORDER BY
  src.raw_payload->'message'->>'platformMessageId',
  COALESCE(src.sent_at, src.created_at) ASC,
  src.id ASC;

\if :rollback
  BEGIN;

  WITH removed AS (
    DELETE FROM public.instagram_dm_messages
    WHERE direction = 'outgoing'
      AND event_type = 'message.sent'
      AND ingress_context->>'source' = 'creator-engine-backfill-message-read'
    RETURNING id
  )
  SELECT COUNT(*) AS removed_rows FROM removed;

  COMMIT;
\elif :apply
  BEGIN;

  WITH inserted AS (
    INSERT INTO public.instagram_dm_messages (
      message_id,
      ig_account_id,
      sender_id,
      recipient_id,
      message_text,
      attachments_json,
      timestamp_ms,
      raw_payload,
      created_at,
      webhook_event_id,
      zernio_message_id,
      conversation_id,
      zernio_account_id,
      ig_username,
      sender_username,
      sender_name,
      direction,
      event_type,
      sender_profile_json,
      sent_at,
      ingress_context
    )
    SELECT
      'backfill:message.sent:' || c.platform_message_id,
      c.ig_account_id,
      COALESCE(NULLIF(c.raw_payload->'message'->'sender'->>'id', ''), c.sender_id),
      c.recipient_id,
      c.normalized_message_text,
      COALESCE(c.raw_payload->'message'->'attachments', c.attachments_json, '[]'::jsonb),
      c.timestamp_ms,
      c.raw_payload || jsonb_build_object(
        '_creator_engine_backfill',
        jsonb_build_object('source_row_id', c.source_row_id)
      ),
      c.message_sent_at,
      NULL,
      c.provider_message_id,
      c.normalized_conversation_id,
      c.zernio_account_id,
      c.ig_username,
      c.sender_username,
      c.sender_name,
      'outgoing',
      'message.sent',
      c.sender_profile_json,
      c.message_sent_at,
      jsonb_build_object(
        'source', 'creator-engine-backfill-message-read',
        'source_row_id', c.source_row_id
      )
    FROM ce_dm_outgoing_backfill_candidates c
    ON CONFLICT (message_id) DO NOTHING
    RETURNING id
  )
  SELECT COUNT(*) AS inserted_rows FROM inserted;

  COMMIT;
\else
  SELECT
    COUNT(*) AS candidate_rows,
    COUNT(DISTINCT normalized_conversation_id) AS conversations,
    MIN(message_sent_at) AS oldest_message,
    MAX(message_sent_at) AS newest_message
  FROM ce_dm_outgoing_backfill_candidates;

  SELECT
    source_row_id,
    normalized_conversation_id AS conversation_id,
    platform_message_id,
    message_sent_at,
    LEFT(normalized_message_text, 80) AS text_preview
  FROM ce_dm_outgoing_backfill_candidates
  ORDER BY message_sent_at DESC
  LIMIT 10;
\endif
