-- Task 7.6 Background Job & Distributed Lock
-- Database Logical Design v2.4
--
-- Forward-only migration:
-- - Adds PostgreSQL-backed Job queue tables.
-- - Adds Worker attempt, result, dead-letter, and scheduler lease tables.
-- - Does not modify business domain tables.
-- - Does not create PostgreSQL enums; Task 7.6 status values are field-level CHECK constraints.

CREATE TABLE jobs (
  id UUID NOT NULL DEFAULT uuidv7(),
  job_type VARCHAR(100) NOT NULL,
  job_key VARCHAR(300) NOT NULL,
  status VARCHAR(50) NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  target_object_type VARCHAR(50),
  target_object_id UUID,
  payload JSONB,
  scheduled_at TIMESTAMPTZ(6) NOT NULL,
  available_at TIMESTAMPTZ(6) NOT NULL,
  started_at TIMESTAMPTZ(6),
  completed_at TIMESTAMPTZ(6),
  locked_until TIMESTAMPTZ(6),
  locked_by VARCHAR(200),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL,
  last_error_code VARCHAR(100),
  last_error_message TEXT,
  idempotency_record_id UUID,
  request_trace_id UUID NOT NULL,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID,
  cancelled_at TIMESTAMPTZ(6),
  CONSTRAINT pk_jobs PRIMARY KEY (id),
  CONSTRAINT uq_jobs_job_type_job_key UNIQUE (job_type, job_key),
  CONSTRAINT fk_jobs_created_by
    FOREIGN KEY (created_by) REFERENCES users (id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_jobs_updated_by
    FOREIGN KEY (updated_by) REFERENCES users (id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_jobs_status
    CHECK (
      status IN (
        'pending',
        'running',
        'retrying',
        'succeeded',
        'failed',
        'dead_letter',
        'cancelled'
      )
    ),
  CONSTRAINT ck_jobs_attempt_policy
    CHECK (
      priority >= 0
      AND attempt_count >= 0
      AND max_attempts >= 1
      AND attempt_count <= max_attempts
    ),
  CONSTRAINT ck_jobs_time_range
    CHECK (
      available_at >= scheduled_at
      AND (started_at IS NULL OR started_at >= created_at)
      AND (completed_at IS NULL OR completed_at >= created_at)
      AND (cancelled_at IS NULL OR cancelled_at >= created_at)
    ),
  CONSTRAINT ck_jobs_target_pair
    CHECK (
      (target_object_type IS NULL AND target_object_id IS NULL)
      OR (target_object_type IS NOT NULL AND target_object_id IS NOT NULL)
    ),
  CONSTRAINT ck_jobs_lock_pair
    CHECK (
      (locked_until IS NULL AND locked_by IS NULL)
      OR (locked_until IS NOT NULL AND locked_by IS NOT NULL)
    )
);

CREATE INDEX idx_jobs_claim
  ON jobs (status, available_at, priority, created_at);

CREATE INDEX idx_jobs_locked_until
  ON jobs (locked_until);

CREATE INDEX idx_jobs_target_created_at
  ON jobs (target_object_type, target_object_id, created_at);

CREATE INDEX idx_jobs_job_type_created_at
  ON jobs (job_type, created_at);

CREATE TABLE job_attempts (
  id UUID NOT NULL DEFAULT uuidv7(),
  job_id UUID NOT NULL,
  attempt_no INTEGER NOT NULL,
  worker_id VARCHAR(200) NOT NULL,
  status VARCHAR(50) NOT NULL,
  started_at TIMESTAMPTZ(6) NOT NULL,
  ended_at TIMESTAMPTZ(6),
  duration_ms INTEGER,
  lease_expires_at TIMESTAMPTZ(6) NOT NULL,
  error_code VARCHAR(100),
  error_message TEXT,
  error_detail JSONB,
  request_trace_id UUID NOT NULL,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_job_attempts PRIMARY KEY (id),
  CONSTRAINT uq_job_attempts_job_id_attempt_no UNIQUE (job_id, attempt_no),
  CONSTRAINT fk_job_attempts_job_id
    FOREIGN KEY (job_id) REFERENCES jobs (id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_job_attempts_status
    CHECK (
      status IN (
        'running',
        'succeeded',
        'failed',
        'timed_out',
        'cancelled'
      )
    ),
  CONSTRAINT ck_job_attempts_attempt_no
    CHECK (attempt_no >= 1),
  CONSTRAINT ck_job_attempts_time_range
    CHECK (ended_at IS NULL OR ended_at >= started_at),
  CONSTRAINT ck_job_attempts_duration
    CHECK (duration_ms IS NULL OR duration_ms >= 0),
  CONSTRAINT ck_job_attempts_failure_error
    CHECK (
      status NOT IN ('failed', 'timed_out')
      OR error_code IS NOT NULL
      OR error_message IS NOT NULL
      OR error_detail IS NOT NULL
    )
);

CREATE INDEX idx_job_attempts_status_started_at
  ON job_attempts (status, started_at);

CREATE TABLE job_results (
  id UUID NOT NULL DEFAULT uuidv7(),
  job_id UUID NOT NULL,
  result_status VARCHAR(50) NOT NULL,
  result_body JSONB,
  resource_type VARCHAR(50),
  resource_id UUID,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_job_results PRIMARY KEY (id),
  CONSTRAINT uq_job_results_job_id UNIQUE (job_id),
  CONSTRAINT fk_job_results_job_id
    FOREIGN KEY (job_id) REFERENCES jobs (id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_job_results_status
    CHECK (result_status IN ('succeeded', 'failed', 'cancelled')),
  CONSTRAINT ck_job_results_resource_pair
    CHECK (
      (resource_type IS NULL AND resource_id IS NULL)
      OR (resource_type IS NOT NULL AND resource_id IS NOT NULL)
    )
);

CREATE INDEX idx_job_results_resource_created_at
  ON job_results (resource_type, resource_id, created_at);

CREATE TABLE job_dead_letters (
  id UUID NOT NULL DEFAULT uuidv7(),
  job_id UUID NOT NULL,
  failed_attempt_id UUID NOT NULL,
  dead_letter_reason TEXT NOT NULL,
  handling_status VARCHAR(50) NOT NULL,
  handled_by UUID,
  handled_at TIMESTAMPTZ(6),
  handling_note TEXT,
  replayed_job_id UUID,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_job_dead_letters PRIMARY KEY (id),
  CONSTRAINT uq_job_dead_letters_job_id UNIQUE (job_id),
  CONSTRAINT fk_job_dead_letters_job_id
    FOREIGN KEY (job_id) REFERENCES jobs (id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_job_dead_letters_failed_attempt_id
    FOREIGN KEY (failed_attempt_id) REFERENCES job_attempts (id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_job_dead_letters_handled_by
    FOREIGN KEY (handled_by) REFERENCES users (id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_job_dead_letters_replayed_job_id
    FOREIGN KEY (replayed_job_id) REFERENCES jobs (id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_job_dead_letters_handling_status
    CHECK (
      handling_status IN (
        'open',
        'in_review',
        'replayed',
        'resolved',
        'ignored'
      )
    ),
  CONSTRAINT ck_job_dead_letters_handled_required
    CHECK (
      handling_status NOT IN ('replayed', 'resolved', 'ignored')
      OR (handled_at IS NOT NULL AND handled_by IS NOT NULL)
    ),
  CONSTRAINT ck_job_dead_letters_replayed_job
    CHECK (
      handling_status <> 'replayed'
      OR replayed_job_id IS NOT NULL
    )
);

CREATE INDEX idx_job_dead_letters_handling_status_created_at
  ON job_dead_letters (handling_status, created_at);

CREATE TABLE scheduler_locks (
  id UUID NOT NULL DEFAULT uuidv7(),
  lock_key VARCHAR(300) NOT NULL,
  owner_id VARCHAR(200) NOT NULL,
  locked_until TIMESTAMPTZ(6) NOT NULL,
  last_acquired_at TIMESTAMPTZ(6) NOT NULL,
  released_at TIMESTAMPTZ(6),
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_scheduler_locks PRIMARY KEY (id),
  CONSTRAINT uq_scheduler_locks_lock_key UNIQUE (lock_key),
  CONSTRAINT ck_scheduler_locks_time_range
    CHECK (
      locked_until >= last_acquired_at
      AND (released_at IS NULL OR released_at >= last_acquired_at)
      AND updated_at >= created_at
    )
);

CREATE INDEX idx_scheduler_locks_locked_until
  ON scheduler_locks (locked_until);
