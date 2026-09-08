-- CR-007: data-only, repeatable initialization. Preserve all existing rules and sequences.
INSERT INTO code_generation_rules (code_type, prefix, format, enabled)
VALUES
  ('category', 'CAT', '{prefix}-{seq:000000}', true),
  ('brand', 'BRD', '{prefix}-{seq:000000}', true),
  ('platform', 'PLT', '{prefix}-{seq:000000}', true),
  ('store', 'STR', '{prefix}-{seq:000000}', true)
ON CONFLICT (lower(code_type)) DO NOTHING;

INSERT INTO code_sequences (code_type, current_value, version)
VALUES ('category', 0, 0), ('brand', 0, 0), ('platform', 0, 0), ('store', 0, 0)
ON CONFLICT (lower(code_type)) DO NOTHING;

-- Rollback: revert application changes first; retain these rows and all business codes.
