-- CR-011 Approved: preserve historical values; no business-row backfill.
ALTER TABLE inspection_orders
  ADD COLUMN inspector_name VARCHAR(100),
  ALTER COLUMN inspection_warehouse_id DROP NOT NULL,
  ALTER COLUMN inspector_id DROP NOT NULL;
ALTER TABLE purchase_orders ADD CONSTRAINT ck_purchase_orders_workflow_status
  CHECK (status IN ('pending_approval','purchasing','inspected','received','cancelled','draft','approved','rejected','completed','voided'));
ALTER TABLE inspection_orders ADD CONSTRAINT ck_inspection_orders_inspector_name
  CHECK (inspector_name IS NULL OR (char_length(btrim(inspector_name)) BETWEEN 1 AND 100 AND inspector_name = btrim(inspector_name)));
ALTER TABLE inspection_orders ADD CONSTRAINT ck_inspection_orders_source_identity
  CHECK ((source_type = 'production' AND inspection_warehouse_id IS NOT NULL AND inspector_id IS NOT NULL AND inspector_name IS NULL)
    OR (source_type = 'purchase' AND ((inspector_name IS NULL AND inspection_warehouse_id IS NOT NULL AND inspector_id IS NOT NULL)
      OR (inspector_name IS NOT NULL AND inspection_warehouse_id IS NULL AND inspector_id IS NULL))));
