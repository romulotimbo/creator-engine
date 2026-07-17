export const CURADORIA_HISTORICO_COUNT_SQL = `
  SELECT COUNT(*)::text AS total
  FROM instagram_dm_messages
  WHERE conversation_id = $1
    AND (
      (direction = 'incoming' AND event_type = 'message.received')
      OR (direction = 'outgoing' AND event_type = 'message.sent')
    )
`

export const CURADORIA_HISTORICO_MESSAGES_SQL = `
  SELECT id, direction, message_text, sent_at, sender_username
  FROM (
    SELECT id, direction, message_text,
           COALESCE(sent_at, created_at) AS sent_at,
           sender_username
    FROM instagram_dm_messages
    WHERE conversation_id = $1
      AND (
        (direction = 'incoming' AND event_type = 'message.received')
        OR (direction = 'outgoing' AND event_type = 'message.sent')
      )
    ORDER BY COALESCE(sent_at, created_at) DESC, id DESC
    LIMIT $2
  ) recent_messages
  ORDER BY sent_at ASC, id ASC
`
