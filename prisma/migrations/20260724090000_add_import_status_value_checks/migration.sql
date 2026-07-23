-- Database Logical Design v2.1
-- DCR-003: constrain the four existing Import status fields to approved values.
-- Existing unknown values stop this forward-only migration. No data is rewritten.

DO $$
DECLARE
  invalid_rows bigint;
  invalid_values bigint;
BEGIN
  SELECT count(*), count(DISTINCT status)
    INTO invalid_rows, invalid_values
  FROM import_tasks
  WHERE status NOT IN (
    'pending_validation',
    'validation_failed',
    'pending_confirmation',
    'importing',
    'partially_succeeded',
    'succeeded',
    'cancelled',
    'duplicate_file',
    'failed'
  );

  IF invalid_rows > 0 THEN
    RAISE EXCEPTION
      'DCR-003 blocked: import_tasks.status contains % rows across % unapproved values',
      invalid_rows,
      invalid_values
      USING ERRCODE = '23514';
  END IF;

  SELECT count(*), count(DISTINCT validation_status)
    INTO invalid_rows, invalid_values
  FROM import_task_items
  WHERE validation_status NOT IN ('pending', 'valid', 'warning', 'invalid');

  IF invalid_rows > 0 THEN
    RAISE EXCEPTION
      'DCR-003 blocked: import_task_items.validation_status contains % rows across % unapproved values',
      invalid_rows,
      invalid_values
      USING ERRCODE = '23514';
  END IF;

  SELECT count(*), count(DISTINCT execution_status)
    INTO invalid_rows, invalid_values
  FROM import_task_items
  WHERE execution_status NOT IN ('pending', 'processing', 'succeeded', 'failed', 'skipped');

  IF invalid_rows > 0 THEN
    RAISE EXCEPTION
      'DCR-003 blocked: import_task_items.execution_status contains % rows across % unapproved values',
      invalid_rows,
      invalid_values
      USING ERRCODE = '23514';
  END IF;

  SELECT count(*), count(DISTINCT match_status)
    INTO invalid_rows, invalid_values
  FROM shipment_import_matches
  WHERE match_status NOT IN ('pending', 'partially_matched', 'matched');

  IF invalid_rows > 0 THEN
    RAISE EXCEPTION
      'DCR-003 blocked: shipment_import_matches.match_status contains % rows across % unapproved values',
      invalid_rows,
      invalid_values
      USING ERRCODE = '23514';
  END IF;
END
$$;

ALTER TABLE import_tasks
  ADD CONSTRAINT ck_import_tasks_status
  CHECK (
    status IN (
      'pending_validation',
      'validation_failed',
      'pending_confirmation',
      'importing',
      'partially_succeeded',
      'succeeded',
      'cancelled',
      'duplicate_file',
      'failed'
    )
  );

ALTER TABLE import_task_items
  ADD CONSTRAINT ck_import_task_items_validation_status
  CHECK (validation_status IN ('pending', 'valid', 'warning', 'invalid'));

ALTER TABLE import_task_items
  ADD CONSTRAINT ck_import_task_items_execution_status
  CHECK (execution_status IN ('pending', 'processing', 'succeeded', 'failed', 'skipped'));

ALTER TABLE shipment_import_matches
  ADD CONSTRAINT ck_shipment_import_matches_match_status
  CHECK (match_status IN ('pending', 'partially_matched', 'matched'));
