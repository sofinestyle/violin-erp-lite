-- CR-013: preserve history; NULL is unknown historical inspection, not false.
ALTER TABLE inbound_orders ADD COLUMN inspection_performed boolean,
  ADD COLUMN inspector_name varchar(100);
ALTER TABLE inbound_order_items ALTER COLUMN batch_no DROP NOT NULL;
ALTER TABLE inbound_orders ADD CONSTRAINT ck_inbound_orders_inspection_information CHECK (
  (inspection_performed IS NULL AND inspector_name IS NULL) OR
  (source_document_type = 'purchase_order' AND inspection_performed IS NOT NULL
    AND (inspection_performed OR inspector_name IS NULL))
);
