-- Database Change Request 004
-- Database Logical Design v2.2
--
-- Migration preflight audit (PostgreSQL 18.4 development database, 2026-07-25):
-- import_tasks total rows: 0
-- warehouse_id/store_id both NULL: 0
-- warehouse_id/store_id both NOT NULL: 0
-- historical Import files requiring trusted SHA-256 backfill: 0
--
-- The guard below intentionally stops the migration if it is applied to a
-- database containing historical Import rows. A trusted Storage-backed
-- checksum backfill must be completed before such a database can migrate.

DO $$
DECLARE
  import_task_count bigint;
  both_null_count bigint;
  both_nonnull_count bigint;
BEGIN
  SELECT
    count(*),
    count(*) FILTER (WHERE warehouse_id IS NULL AND store_id IS NULL),
    count(*) FILTER (WHERE warehouse_id IS NOT NULL AND store_id IS NOT NULL)
  INTO import_task_count, both_null_count, both_nonnull_count
  FROM import_tasks;

  IF both_null_count > 0 OR both_nonnull_count > 0 THEN
    RAISE EXCEPTION
      'DCR-004 migration blocked: import_tasks target audit failed (both_null=%, both_nonnull=%)',
      both_null_count,
      both_nonnull_count;
  END IF;

  IF import_task_count > 0 THEN
    RAISE EXCEPTION
      'DCR-004 migration blocked: % historical import_tasks rows require trusted Storage SHA-256 backfill',
      import_task_count;
  END IF;
END
$$;

ALTER TABLE import_tasks
  ADD COLUMN file_checksum VARCHAR(128) NOT NULL;

ALTER TABLE import_tasks
  ADD CONSTRAINT ck_import_tasks_file_checksum_format
    CHECK (file_checksum ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT ck_import_tasks_target_exactly_one
    CHECK ((warehouse_id IS NOT NULL) <> (store_id IS NOT NULL));

CREATE UNIQUE INDEX uq_import_tasks_file_checksum_import_type_warehouse
  ON import_tasks (file_checksum, import_type, warehouse_id)
  WHERE warehouse_id IS NOT NULL AND store_id IS NULL;

CREATE UNIQUE INDEX uq_import_tasks_file_checksum_import_type_store
  ON import_tasks (file_checksum, import_type, store_id)
  WHERE store_id IS NOT NULL AND warehouse_id IS NULL;

CREATE TABLE idempotency_records (
  id UUID NOT NULL DEFAULT uuidv7(),
  scope_code VARCHAR(300) NOT NULL,
  idempotency_key_hash VARCHAR(128) NOT NULL,
  request_hash VARCHAR(128) NOT NULL,
  status VARCHAR(50) NOT NULL,
  response_http_status INTEGER,
  response_body JSONB,
  resource_type VARCHAR(50),
  resource_id UUID,
  request_trace_id UUID NOT NULL,
  locked_until TIMESTAMPTZ(6),
  completed_at TIMESTAMPTZ(6),
  expires_at TIMESTAMPTZ(6) NOT NULL,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_idempotency_records PRIMARY KEY (id),
  CONSTRAINT uq_idempotency_records_scope_code_key_hash
    UNIQUE (scope_code, idempotency_key_hash),
  CONSTRAINT ck_idempotency_records_status
    CHECK (status IN ('processing', 'completed', 'failed')),
  CONSTRAINT ck_idempotency_records_hash_format
    CHECK (
      idempotency_key_hash ~ '^[0-9a-f]{64}$'
      AND request_hash ~ '^[0-9a-f]{64}$'
    ),
  CONSTRAINT ck_idempotency_records_http_status
    CHECK (response_http_status IS NULL OR response_http_status BETWEEN 100 AND 599),
  CONSTRAINT ck_idempotency_records_lifecycle
    CHECK (
      (
        (
          status = 'processing'
          AND response_http_status IS NULL
          AND response_body IS NULL
          AND completed_at IS NULL
          AND locked_until IS NOT NULL
        )
        OR
        (
          status IN ('completed', 'failed')
          AND response_http_status IS NOT NULL
          AND completed_at IS NOT NULL
          AND locked_until IS NULL
        )
      )
      AND
      (
        (resource_type IS NULL AND resource_id IS NULL)
        OR
        (
          resource_type IS NOT NULL
          AND btrim(resource_type) = resource_type
          AND length(resource_type) > 0
          AND resource_id IS NOT NULL
        )
      )
    ),
  CONSTRAINT ck_idempotency_records_time_range
    CHECK (
      updated_at >= created_at
      AND expires_at > created_at
      AND (
        locked_until IS NULL
        OR (locked_until > created_at AND locked_until <= expires_at)
      )
      AND (
        completed_at IS NULL
        OR (
          completed_at >= created_at
          AND completed_at <= updated_at
          AND completed_at <= expires_at
        )
      )
    )
);

CREATE INDEX idx_idempotency_records_status_locked_until
  ON idempotency_records (status, locked_until);

CREATE INDEX idx_idempotency_records_expires_at
  ON idempotency_records (expires_at);

CREATE INDEX idx_idempotency_records_resource_created_at
  ON idempotency_records (resource_type, resource_id, created_at);
