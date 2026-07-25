-- Task 7.7 Cache & Event Infrastructure
-- Database Logical Design v2.5
--
-- Forward-only migration:
-- - Adds PostgreSQL-first Event Infrastructure tables.
-- - Adds reliable Outbox, immutable Event History, Consumer Inbox, Delivery Tracking, and Event Dead Letter tables.
-- - Does not modify business domain tables.
-- - Does not create PostgreSQL enums; Task 7.7 status values are field-level CHECK constraints.

CREATE TABLE event_outbox (
  id UUID NOT NULL DEFAULT uuidv7(),
  event_id UUID NOT NULL,
  event_type VARCHAR(150) NOT NULL,
  event_version INTEGER NOT NULL,
  aggregate_type VARCHAR(100),
  aggregate_id UUID,
  producer VARCHAR(100) NOT NULL,
  payload JSONB,
  metadata JSONB,
  request_trace_id UUID NOT NULL,
  actor_user_id UUID,
  status VARCHAR(50) NOT NULL,
  occurred_at TIMESTAMPTZ(6) NOT NULL,
  available_at TIMESTAMPTZ(6) NOT NULL,
  published_at TIMESTAMPTZ(6),
  locked_by VARCHAR(200),
  locked_until TIMESTAMPTZ(6),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL,
  last_error_code VARCHAR(100),
  last_error_message TEXT,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_event_outbox PRIMARY KEY (id),
  CONSTRAINT uq_event_outbox_event_id UNIQUE (event_id),
  CONSTRAINT fk_event_outbox_actor_user_id
    FOREIGN KEY (actor_user_id) REFERENCES users (id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_event_outbox_status
    CHECK (
      status IN (
        'pending',
        'publishing',
        'published',
        'failed',
        'dead_letter',
        'cancelled'
      )
    ),
  CONSTRAINT ck_event_outbox_event_version
    CHECK (event_version >= 1),
  CONSTRAINT ck_event_outbox_attempt_policy
    CHECK (
      attempt_count >= 0
      AND max_attempts >= 1
      AND attempt_count <= max_attempts
    ),
  CONSTRAINT ck_event_outbox_time_range
    CHECK (
      available_at >= occurred_at
      AND (published_at IS NULL OR published_at >= occurred_at)
      AND updated_at >= created_at
    ),
  CONSTRAINT ck_event_outbox_aggregate_pair
    CHECK (
      (aggregate_type IS NULL AND aggregate_id IS NULL)
      OR (aggregate_type IS NOT NULL AND aggregate_id IS NOT NULL)
    ),
  CONSTRAINT ck_event_outbox_lock_pair
    CHECK (
      (locked_until IS NULL AND locked_by IS NULL)
      OR (locked_until IS NOT NULL AND locked_by IS NOT NULL)
    )
);

CREATE INDEX idx_event_outbox_claim
  ON event_outbox (status, available_at, created_at);

CREATE INDEX idx_event_outbox_event_type_created_at
  ON event_outbox (event_type, created_at);

CREATE INDEX idx_event_outbox_aggregate_created_at
  ON event_outbox (aggregate_type, aggregate_id, created_at);

CREATE INDEX idx_event_outbox_locked_until
  ON event_outbox (locked_until);

CREATE INDEX idx_event_outbox_request_trace_id
  ON event_outbox (request_trace_id);

CREATE TABLE event_history (
  id UUID NOT NULL DEFAULT uuidv7(),
  event_id UUID NOT NULL,
  event_type VARCHAR(150) NOT NULL,
  event_version INTEGER NOT NULL,
  aggregate_type VARCHAR(100),
  aggregate_id UUID,
  producer VARCHAR(100) NOT NULL,
  payload JSONB,
  metadata JSONB,
  request_trace_id UUID NOT NULL,
  actor_user_id UUID,
  occurred_at TIMESTAMPTZ(6) NOT NULL,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_event_history PRIMARY KEY (id),
  CONSTRAINT uq_event_history_event_id UNIQUE (event_id),
  CONSTRAINT fk_event_history_actor_user_id
    FOREIGN KEY (actor_user_id) REFERENCES users (id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_event_history_event_version
    CHECK (event_version >= 1),
  CONSTRAINT ck_event_history_occurred_at
    CHECK (occurred_at <= created_at),
  CONSTRAINT ck_event_history_aggregate_pair
    CHECK (
      (aggregate_type IS NULL AND aggregate_id IS NULL)
      OR (aggregate_type IS NOT NULL AND aggregate_id IS NOT NULL)
    ),
  CONSTRAINT ck_event_history_non_empty_codes
    CHECK (
      btrim(event_type) <> ''
      AND btrim(producer) <> ''
      AND event_type = btrim(event_type)
      AND producer = btrim(producer)
    )
);

CREATE INDEX idx_event_history_event_type_occurred_at
  ON event_history (event_type, occurred_at);

CREATE INDEX idx_event_history_aggregate_occurred_at
  ON event_history (aggregate_type, aggregate_id, occurred_at);

CREATE INDEX idx_event_history_request_trace_id
  ON event_history (request_trace_id);

CREATE INDEX idx_event_history_producer_occurred_at
  ON event_history (producer, occurred_at);

CREATE TABLE event_consumptions (
  id UUID NOT NULL DEFAULT uuidv7(),
  event_id UUID NOT NULL,
  consumer_name VARCHAR(150) NOT NULL,
  handler_name VARCHAR(150) NOT NULL,
  status VARCHAR(50) NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL,
  available_at TIMESTAMPTZ(6) NOT NULL,
  started_at TIMESTAMPTZ(6),
  completed_at TIMESTAMPTZ(6),
  locked_by VARCHAR(200),
  locked_until TIMESTAMPTZ(6),
  last_error_code VARCHAR(100),
  last_error_message TEXT,
  last_error_detail JSONB,
  request_trace_id UUID NOT NULL,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_event_consumptions PRIMARY KEY (id),
  CONSTRAINT uq_event_consumptions_event_consumer UNIQUE (event_id, consumer_name),
  CONSTRAINT fk_event_consumptions_event_id
    FOREIGN KEY (event_id) REFERENCES event_history (event_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_event_consumptions_status
    CHECK (
      status IN (
        'pending',
        'running',
        'succeeded',
        'retrying',
        'failed',
        'dead_letter',
        'ignored'
      )
    ),
  CONSTRAINT ck_event_consumptions_attempt_policy
    CHECK (
      attempt_count >= 0
      AND max_attempts >= 1
      AND attempt_count <= max_attempts
    ),
  CONSTRAINT ck_event_consumptions_time_range
    CHECK (
      (started_at IS NULL OR started_at >= created_at)
      AND (completed_at IS NULL OR completed_at >= created_at)
      AND updated_at >= created_at
    ),
  CONSTRAINT ck_event_consumptions_lock_pair
    CHECK (
      (locked_until IS NULL AND locked_by IS NULL)
      OR (locked_until IS NOT NULL AND locked_by IS NOT NULL)
    ),
  CONSTRAINT ck_event_consumptions_completed_required
    CHECK (
      status NOT IN ('succeeded', 'ignored')
      OR completed_at IS NOT NULL
    ),
  CONSTRAINT ck_event_consumptions_failure_error
    CHECK (
      status NOT IN ('failed', 'dead_letter')
      OR last_error_code IS NOT NULL
      OR last_error_message IS NOT NULL
      OR last_error_detail IS NOT NULL
    )
);

CREATE INDEX idx_event_consumptions_consumer_status_available_at
  ON event_consumptions (consumer_name, status, available_at);

CREATE INDEX idx_event_consumptions_status_available_at_created_at
  ON event_consumptions (status, available_at, created_at);

CREATE INDEX idx_event_consumptions_locked_until
  ON event_consumptions (locked_until);

CREATE INDEX idx_event_consumptions_event_id
  ON event_consumptions (event_id);

CREATE INDEX idx_event_consumptions_request_trace_id
  ON event_consumptions (request_trace_id);

CREATE TABLE event_deliveries (
  id UUID NOT NULL DEFAULT uuidv7(),
  event_id UUID NOT NULL,
  delivery_target_type VARCHAR(100) NOT NULL,
  delivery_target VARCHAR(200) NOT NULL,
  status VARCHAR(50) NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL,
  available_at TIMESTAMPTZ(6) NOT NULL,
  delivered_at TIMESTAMPTZ(6),
  locked_by VARCHAR(200),
  locked_until TIMESTAMPTZ(6),
  last_error_code VARCHAR(100),
  last_error_message TEXT,
  response_summary JSONB,
  request_trace_id UUID NOT NULL,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_event_deliveries PRIMARY KEY (id),
  CONSTRAINT uq_event_deliveries_event_target
    UNIQUE (event_id, delivery_target_type, delivery_target),
  CONSTRAINT fk_event_deliveries_event_id
    FOREIGN KEY (event_id) REFERENCES event_history (event_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_event_deliveries_status
    CHECK (
      status IN (
        'pending',
        'delivering',
        'succeeded',
        'retrying',
        'failed',
        'dead_letter',
        'cancelled'
      )
    ),
  CONSTRAINT ck_event_deliveries_attempt_policy
    CHECK (
      attempt_count >= 0
      AND max_attempts >= 1
      AND attempt_count <= max_attempts
    ),
  CONSTRAINT ck_event_deliveries_time_range
    CHECK (
      available_at >= created_at
      AND (delivered_at IS NULL OR delivered_at >= created_at)
      AND updated_at >= created_at
    ),
  CONSTRAINT ck_event_deliveries_lock_pair
    CHECK (
      (locked_until IS NULL AND locked_by IS NULL)
      OR (locked_until IS NOT NULL AND locked_by IS NOT NULL)
    ),
  CONSTRAINT ck_event_deliveries_delivered_required
    CHECK (
      status <> 'succeeded'
      OR delivered_at IS NOT NULL
    ),
  CONSTRAINT ck_event_deliveries_failure_error
    CHECK (
      status NOT IN ('failed', 'dead_letter')
      OR last_error_code IS NOT NULL
      OR last_error_message IS NOT NULL
      OR response_summary IS NOT NULL
    )
);

CREATE INDEX idx_event_deliveries_status_available_at_created_at
  ON event_deliveries (status, available_at, created_at);

CREATE INDEX idx_event_deliveries_target_status_available_at
  ON event_deliveries (delivery_target, status, available_at);

CREATE INDEX idx_event_deliveries_event_id
  ON event_deliveries (event_id);

CREATE INDEX idx_event_deliveries_locked_until
  ON event_deliveries (locked_until);

CREATE INDEX idx_event_deliveries_request_trace_id
  ON event_deliveries (request_trace_id);

CREATE TABLE event_dead_letters (
  id UUID NOT NULL DEFAULT uuidv7(),
  event_id UUID NOT NULL,
  failure_stage VARCHAR(50) NOT NULL,
  consumer_name VARCHAR(150),
  delivery_target VARCHAR(200),
  outbox_id UUID,
  consumption_id UUID,
  delivery_id UUID,
  reason_code VARCHAR(100) NOT NULL,
  reason_message TEXT NOT NULL,
  context JSONB,
  status VARCHAR(50) NOT NULL,
  handled_by UUID,
  handled_at TIMESTAMPTZ(6),
  handling_note TEXT,
  replayed_event_id UUID,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_event_dead_letters PRIMARY KEY (id),
  CONSTRAINT fk_event_dead_letters_event_id
    FOREIGN KEY (event_id) REFERENCES event_history (event_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_event_dead_letters_outbox_id
    FOREIGN KEY (outbox_id) REFERENCES event_outbox (id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_event_dead_letters_consumption_id
    FOREIGN KEY (consumption_id) REFERENCES event_consumptions (id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_event_dead_letters_delivery_id
    FOREIGN KEY (delivery_id) REFERENCES event_deliveries (id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_event_dead_letters_handled_by
    FOREIGN KEY (handled_by) REFERENCES users (id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_event_dead_letters_replayed_event_id
    FOREIGN KEY (replayed_event_id) REFERENCES event_history (event_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_event_dead_letters_status
    CHECK (
      status IN (
        'open',
        'in_review',
        'replayed',
        'resolved',
        'ignored'
      )
    ),
  CONSTRAINT ck_event_dead_letters_failure_stage
    CHECK (failure_stage IN ('publish', 'consume', 'deliver')),
  CONSTRAINT ck_event_dead_letters_reference_present
    CHECK (
      event_id IS NOT NULL
      OR outbox_id IS NOT NULL
      OR consumption_id IS NOT NULL
      OR delivery_id IS NOT NULL
    ),
  CONSTRAINT ck_event_dead_letters_replayed_event
    CHECK (
      status <> 'replayed'
      OR replayed_event_id IS NOT NULL
    ),
  CONSTRAINT ck_event_dead_letters_handled_required
    CHECK (
      updated_at >= created_at
      AND (
        status NOT IN ('resolved', 'ignored', 'replayed')
        OR (handled_at IS NOT NULL AND handled_by IS NOT NULL)
      )
    )
);

CREATE INDEX idx_event_dead_letters_status_created_at
  ON event_dead_letters (status, created_at);

CREATE INDEX idx_event_dead_letters_event_id
  ON event_dead_letters (event_id);

CREATE INDEX idx_event_dead_letters_failure_stage_created_at
  ON event_dead_letters (failure_stage, created_at);

CREATE INDEX idx_event_dead_letters_consumer_status
  ON event_dead_letters (consumer_name, status);

CREATE INDEX idx_event_dead_letters_delivery_target_status
  ON event_dead_letters (delivery_target, status);
