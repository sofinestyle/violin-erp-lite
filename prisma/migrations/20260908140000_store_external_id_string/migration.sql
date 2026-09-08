-- CR-008 Approved: external platform identifier is business text, not an internal UUID.
-- Preserve historical UUID values and the existing platform-scoped unique constraint.
ALTER TABLE "stores"
  ALTER COLUMN "external_store_id" TYPE VARCHAR(100)
  USING "external_store_id"::text;
