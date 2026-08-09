-- CR-003 Code Generation Storage
-- Forward migration: adds server-side automatic code generation rule and sequence storage.
-- Rollback note: before production rollback, ensure no code generation transaction is running,
-- then drop code_sequences and code_generation_rules in this order.

CREATE TABLE code_generation_rules (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  code_type varchar(50) NOT NULL,
  prefix varchar(20) NOT NULL,
  format varchar(100) NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_code_generation_rules_code_type ON code_generation_rules (lower(code_type));
CREATE INDEX idx_code_generation_rules_enabled_code_type ON code_generation_rules (enabled, code_type);

CREATE TABLE code_sequences (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  code_type varchar(50) NOT NULL,
  current_value bigint NOT NULL DEFAULT 0,
  version integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_code_sequences_current_value_non_negative CHECK (current_value >= 0),
  CONSTRAINT ck_code_sequences_version_non_negative CHECK (version >= 0)
);

CREATE UNIQUE INDEX uq_code_sequences_code_type ON code_sequences (lower(code_type));

INSERT INTO code_generation_rules (code_type, prefix, format, enabled)
VALUES
  ('product', 'PRD', '{prefix}-{seq:000000}', true),
  ('supplier', 'SUP', '{prefix}-{seq:000000}', true),
  ('manufacturer', 'MFR', '{prefix}-{seq:000000}', true),
  ('warehouse', 'WH', '{prefix}-{seq:000000}', true),
  ('sku', '', '{model}-{size}-{color}', true);

INSERT INTO code_sequences (code_type, current_value, version)
VALUES
  ('product', 0, 0),
  ('supplier', 0, 0),
  ('manufacturer', 0, 0),
  ('warehouse', 0, 0);
