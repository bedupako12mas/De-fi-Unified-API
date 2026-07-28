CREATE TABLE IF NOT EXISTS api_requests (
  id          BIGSERIAL   PRIMARY KEY,
  protocol    TEXT        NOT NULL,
  network     TEXT        NOT NULL,
  contract    TEXT        NOT NULL,
  fn          TEXT        NOT NULL,
  params      JSONB       NOT NULL,
  response    JSONB       NOT NULL,
  status      INTEGER     NOT NULL,
  duration_ms INTEGER     NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_requests_protocol_fn_created
  ON api_requests (protocol, fn, created_at);
