-- CR-014: extend inspection metadata to direct production inbound; preserve historical NULL.
ALTER TABLE inbound_orders DROP CONSTRAINT ck_inbound_orders_inspection_information;
ALTER TABLE inbound_orders ADD CONSTRAINT ck_inbound_orders_inspection_information CHECK (
  (inspection_performed IS NULL AND inspector_name IS NULL) OR
  (source_document_type IN ('purchase_order', 'production_order') AND inspection_performed IS NOT NULL
    AND (inspection_performed OR inspector_name IS NULL))
);
-- NOT VALID retains anomalous legacy rows while guarding every new write.
ALTER TABLE production_order_items ADD CONSTRAINT ck_production_order_items_inbound_limit
  CHECK (inbound_quantity <= planned_quantity) NOT VALID;
