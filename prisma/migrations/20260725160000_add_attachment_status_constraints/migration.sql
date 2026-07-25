-- Database Change Request 005
-- Database Logical Design v2.3
--
-- Migration preflight audit (PostgreSQL 18.4 isolated development database, 2026-07-25):
-- attachments total rows: 0
-- status NULL rows: 0
-- unknown status rows: 0
-- updated_at earlier than created_at rows: 0
-- attachment_links duplicate constraint groups: 0
--
-- The guard below intentionally stops the migration when unknown lifecycle
-- values or existing integrity anomalies are present. It reports only counts
-- and never maps, rewrites, or deletes historical data.

DO $$
DECLARE
  attachment_count bigint;
  active_count bigint;
  soft_deleted_count bigint;
  pending_physical_delete_count bigint;
  physical_delete_failed_count bigint;
  physically_deleted_count bigint;
  null_status_count bigint;
  unknown_status_count bigint;
  unknown_status_distinct_count bigint;
  invalid_time_count bigint;
  duplicate_link_group_count bigint;
BEGIN
  SELECT
    count(*),
    count(*) FILTER (WHERE status = 'active'),
    count(*) FILTER (WHERE status = 'soft_deleted'),
    count(*) FILTER (WHERE status = 'pending_physical_delete'),
    count(*) FILTER (WHERE status = 'physical_delete_failed'),
    count(*) FILTER (WHERE status = 'physically_deleted'),
    count(*) FILTER (WHERE status IS NULL),
    count(*) FILTER (
      WHERE status IS NOT NULL
        AND status NOT IN (
          'active',
          'soft_deleted',
          'pending_physical_delete',
          'physical_delete_failed',
          'physically_deleted'
        )
    ),
    count(DISTINCT status) FILTER (
      WHERE status IS NOT NULL
        AND status NOT IN (
          'active',
          'soft_deleted',
          'pending_physical_delete',
          'physical_delete_failed',
          'physically_deleted'
        )
    ),
    count(*) FILTER (WHERE updated_at < created_at)
  INTO
    attachment_count,
    active_count,
    soft_deleted_count,
    pending_physical_delete_count,
    physical_delete_failed_count,
    physically_deleted_count,
    null_status_count,
    unknown_status_count,
    unknown_status_distinct_count,
    invalid_time_count
  FROM attachments;

  SELECT count(*)
  INTO duplicate_link_group_count
  FROM (
    SELECT
      attachment_id,
      object_type,
      object_id,
      object_item_id,
      attachment_category
    FROM attachment_links
    GROUP BY
      attachment_id,
      object_type,
      object_id,
      object_item_id,
      attachment_category
    HAVING count(*) > 1
  ) duplicate_groups;

  RAISE NOTICE
    'DCR-005 preflight: total=%, active=%, soft_deleted=%, pending_physical_delete=%, physical_delete_failed=%, physically_deleted=%, null=%, unknown_rows=%, unknown_distinct=%, invalid_time=%, duplicate_link_groups=%',
    attachment_count,
    active_count,
    soft_deleted_count,
    pending_physical_delete_count,
    physical_delete_failed_count,
    physically_deleted_count,
    null_status_count,
    unknown_status_count,
    unknown_status_distinct_count,
    invalid_time_count,
    duplicate_link_group_count;

  IF null_status_count > 0
    OR unknown_status_count > 0
    OR invalid_time_count > 0
    OR duplicate_link_group_count > 0
  THEN
    RAISE EXCEPTION
      'DCR-005 migration blocked: null_status=%, unknown_rows=%, unknown_distinct=%, invalid_time=%, duplicate_link_groups=%',
      null_status_count,
      unknown_status_count,
      unknown_status_distinct_count,
      invalid_time_count,
      duplicate_link_group_count;
  END IF;
END
$$;

ALTER TABLE attachments
  ALTER COLUMN status SET DEFAULT 'active',
  ADD CONSTRAINT ck_attachments_status
    CHECK (
      status IN (
        'active',
        'soft_deleted',
        'pending_physical_delete',
        'physical_delete_failed',
        'physically_deleted'
      )
    );

CREATE INDEX idx_attachments_status_updated_at
  ON attachments (status, updated_at);
