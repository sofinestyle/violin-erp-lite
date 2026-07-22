-- Frozen Database Logical Design v1.1 physical mapping
-- Generated from Approved/Frozen Phase 3 specifications; do not edit logical structure ad hoc.

CREATE TYPE warehouse_type AS ENUM ('company', 'manufacturer', 'overseas', 'transit', 'pending');
CREATE TYPE production_completion_status AS ENUM ('Draft', 'Confirmed', 'Revoked', 'Voided');

CREATE TABLE product_categories (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  disabled_at timestamptz,
  disabled_by uuid,
  category_code varchar(50) NOT NULL,
  category_name varchar(200) NOT NULL,
  parent_category_id uuid,
  category_level integer NOT NULL,
  sort_order integer NOT NULL,
  description text,
  CONSTRAINT pk_product_categories PRIMARY KEY (id)
);

CREATE TABLE brands (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  disabled_at timestamptz,
  disabled_by uuid,
  brand_code varchar(50) NOT NULL,
  brand_name varchar(200) NOT NULL,
  brand_name_en varchar(300),
  description text,
  CONSTRAINT pk_brands PRIMARY KEY (id)
);

CREATE TABLE products (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  disabled_at timestamptz,
  disabled_by uuid,
  product_code varchar(50) NOT NULL,
  product_name varchar(200) NOT NULL,
  product_name_en varchar(300),
  category_id uuid NOT NULL,
  brand_id uuid NOT NULL,
  product_type varchar(50) NOT NULL,
  description text,
  default_unit varchar(200) NOT NULL,
  CONSTRAINT pk_products PRIMARY KEY (id)
);

CREATE TABLE skus (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  disabled_at timestamptz,
  disabled_by uuid,
  sku_code varchar(100) NOT NULL,
  sku_name varchar(200) NOT NULL,
  product_id uuid NOT NULL,
  size varchar(200),
  color varchar(200),
  specification varchar(200),
  material varchar(200),
  unit varchar(200) NOT NULL,
  barcode varchar(100),
  default_purchase_price numeric(18,4),
  default_production_price numeric(18,4),
  default_sale_price numeric(18,4),
  safety_stock_quantity numeric(18,4) NOT NULL,
  CONSTRAINT pk_skus PRIMARY KEY (id)
);

CREATE TABLE suppliers (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  disabled_at timestamptz,
  disabled_by uuid,
  supplier_code varchar(50) NOT NULL,
  supplier_name varchar(200) NOT NULL,
  short_name varchar(100),
  contact_name varchar(200),
  contact_phone varchar(50),
  contact_email varchar(254),
  address varchar(500),
  settlement_method varchar(50) NOT NULL,
  payment_terms text,
  tax_identifier varchar(255),
  bank_name varchar(255),
  bank_account_name varchar(255),
  bank_account_no varchar(255),
  remark varchar(1000),
  CONSTRAINT pk_suppliers PRIMARY KEY (id)
);

CREATE TABLE manufacturers (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  disabled_at timestamptz,
  disabled_by uuid,
  manufacturer_code varchar(50) NOT NULL,
  manufacturer_name varchar(200) NOT NULL,
  short_name varchar(100),
  contact_name varchar(200),
  contact_phone varchar(50),
  contact_email varchar(254),
  address varchar(500),
  settlement_method varchar(50) NOT NULL,
  payment_terms text,
  production_capacity_note text,
  remark varchar(1000),
  CONSTRAINT pk_manufacturers PRIMARY KEY (id)
);

CREATE TABLE warehouses (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  disabled_at timestamptz,
  disabled_by uuid,
  warehouse_code varchar(50) NOT NULL,
  warehouse_name varchar(200) NOT NULL,
  warehouse_type warehouse_type NOT NULL,
  owner_type varchar(50) NOT NULL,
  manufacturer_id uuid,
  country_code varchar(2),
  province varchar(200),
  city varchar(200),
  address varchar(500),
  contact_name varchar(200),
  contact_phone varchar(50),
  allows_available_stock boolean NOT NULL,
  sort_order integer NOT NULL,
  CONSTRAINT pk_warehouses PRIMARY KEY (id)
);

CREATE TABLE ecommerce_platforms (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  disabled_at timestamptz,
  disabled_by uuid,
  platform_code varchar(50) NOT NULL,
  platform_name varchar(200) NOT NULL,
  platform_type varchar(50) NOT NULL,
  country_code varchar(2),
  is_cross_border boolean NOT NULL,
  description text,
  CONSTRAINT pk_ecommerce_platforms PRIMARY KEY (id)
);

CREATE TABLE stores (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  disabled_at timestamptz,
  disabled_by uuid,
  store_code varchar(50) NOT NULL,
  store_name varchar(200) NOT NULL,
  platform_id uuid NOT NULL,
  external_store_id uuid,
  country_code varchar(2) NOT NULL,
  currency_code varchar(3) NOT NULL,
  operator_name varchar(200),
  remark varchar(1000),
  CONSTRAINT pk_stores PRIMARY KEY (id)
);

CREATE TABLE product_suppliers (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  disabled_at timestamptz,
  disabled_by uuid,
  product_id uuid NOT NULL,
  supplier_id uuid NOT NULL,
  supplier_product_code varchar(50),
  default_unit_price numeric(18,4),
  minimum_order_quantity numeric(18,4),
  lead_time_days integer,
  is_preferred boolean DEFAULT false NOT NULL,
  effective_from date NOT NULL,
  effective_to date,
  remark varchar(1000),
  CONSTRAINT pk_product_suppliers PRIMARY KEY (id)
);

CREATE TABLE product_manufacturers (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  disabled_at timestamptz,
  disabled_by uuid,
  product_id uuid NOT NULL,
  manufacturer_id uuid NOT NULL,
  manufacturer_product_code varchar(50),
  default_processing_price numeric(18,4),
  minimum_order_quantity numeric(18,4),
  lead_time_days integer,
  production_capacity varchar(200),
  is_preferred boolean DEFAULT false NOT NULL,
  effective_from date NOT NULL,
  effective_to date,
  remark varchar(1000),
  CONSTRAINT pk_product_manufacturers PRIMARY KEY (id)
);

CREATE TABLE purchase_orders (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  document_no varchar(50) NOT NULL,
  document_date date NOT NULL,
  status varchar(50) NOT NULL,
  approval_status varchar(50) NOT NULL,
  remark varchar(1000),
  submitted_at timestamptz,
  submitted_by uuid,
  approved_at timestamptz,
  approved_by uuid,
  cancelled_at timestamptz,
  cancelled_by uuid,
  cancel_reason varchar(1000),
  version_no integer NOT NULL,
  supplier_id uuid NOT NULL,
  supplier_code_snapshot varchar(200) NOT NULL,
  supplier_name_snapshot varchar(200) NOT NULL,
  expected_delivery_date date NOT NULL,
  currency_code varchar(3) NOT NULL,
  settlement_method varchar(50) NOT NULL,
  payment_terms_snapshot varchar(200),
  total_quantity numeric(18,4) NOT NULL,
  subtotal_amount numeric(18,4) NOT NULL,
  tax_amount numeric(18,4) NOT NULL,
  total_amount numeric(18,4) NOT NULL,
  paid_amount numeric(18,4) NOT NULL,
  unpaid_amount numeric(18,4) NOT NULL,
  CONSTRAINT pk_purchase_orders PRIMARY KEY (id)
);

CREATE TABLE purchase_order_items (
  id uuid DEFAULT uuidv7() NOT NULL,
  line_no integer NOT NULL,
  sku_id uuid NOT NULL,
  sku_code_snapshot varchar(100) NOT NULL,
  sku_name_snapshot varchar(200) NOT NULL,
  specification_snapshot varchar(200),
  quantity numeric(18,4) NOT NULL,
  remark varchar(1000),
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  purchase_order_id uuid NOT NULL,
  unit_price numeric(18,4) NOT NULL,
  tax_rate numeric(7,4) NOT NULL,
  tax_amount numeric(18,4) NOT NULL,
  line_amount numeric(18,4) NOT NULL,
  expected_delivery_date date,
  received_quantity numeric(18,4) NOT NULL,
  inspected_quantity numeric(18,4) NOT NULL,
  qualified_quantity numeric(18,4) NOT NULL,
  inbound_quantity numeric(18,4) NOT NULL,
  returned_quantity numeric(18,4) NOT NULL,
  CONSTRAINT pk_purchase_order_items PRIMARY KEY (id)
);

CREATE TABLE purchase_payments (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  payment_no varchar(50) NOT NULL,
  purchase_order_id uuid NOT NULL,
  supplier_id uuid NOT NULL,
  payment_date date NOT NULL,
  currency_code varchar(3) NOT NULL,
  payment_amount numeric(18,4) NOT NULL,
  payment_method varchar(50) NOT NULL,
  bank_reference_no varchar(50),
  payee_account_snapshot varchar(255) NOT NULL,
  payment_status varchar(50) NOT NULL,
  attachment_required boolean NOT NULL,
  remark varchar(1000),
  CONSTRAINT pk_purchase_payments PRIMARY KEY (id)
);

CREATE TABLE purchase_returns (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  document_no varchar(50) NOT NULL,
  document_date date NOT NULL,
  status varchar(50) NOT NULL,
  approval_status varchar(50) NOT NULL,
  remark varchar(1000),
  submitted_at timestamptz,
  submitted_by uuid,
  approved_at timestamptz,
  approved_by uuid,
  cancelled_at timestamptz,
  cancelled_by uuid,
  cancel_reason varchar(1000),
  version_no integer NOT NULL,
  supplier_id uuid NOT NULL,
  purchase_order_id uuid NOT NULL,
  source_inbound_order_id uuid NOT NULL,
  return_warehouse_id uuid NOT NULL,
  return_reason varchar(1000) NOT NULL,
  total_quantity numeric(18,4) NOT NULL,
  total_amount numeric(18,4) NOT NULL,
  completed_at timestamptz,
  CONSTRAINT pk_purchase_returns PRIMARY KEY (id)
);

CREATE TABLE purchase_return_items (
  id uuid DEFAULT uuidv7() NOT NULL,
  line_no integer NOT NULL,
  sku_id uuid NOT NULL,
  sku_code_snapshot varchar(100) NOT NULL,
  sku_name_snapshot varchar(200) NOT NULL,
  specification_snapshot varchar(200),
  quantity numeric(18,4) NOT NULL,
  remark varchar(1000),
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  purchase_return_id uuid NOT NULL,
  purchase_order_item_id uuid NOT NULL,
  source_inbound_order_item_id uuid NOT NULL,
  unit_price numeric(18,4) NOT NULL,
  line_amount numeric(18,4) NOT NULL,
  return_reason varchar(1000) NOT NULL,
  inventory_condition varchar(50) NOT NULL,
  CONSTRAINT pk_purchase_return_items PRIMARY KEY (id)
);

CREATE TABLE production_orders (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  document_no varchar(50) NOT NULL,
  document_date date NOT NULL,
  status varchar(50) NOT NULL,
  approval_status varchar(50) NOT NULL,
  remark varchar(1000),
  submitted_at timestamptz,
  submitted_by uuid,
  approved_at timestamptz,
  approved_by uuid,
  cancelled_at timestamptz,
  cancelled_by uuid,
  cancel_reason varchar(1000),
  version_no integer NOT NULL,
  manufacturer_id uuid NOT NULL,
  manufacturer_code_snapshot varchar(200) NOT NULL,
  manufacturer_name_snapshot varchar(200) NOT NULL,
  planned_start_date date NOT NULL,
  expected_completion_date date NOT NULL,
  actual_start_date date,
  actual_completion_date date,
  currency_code varchar(3) NOT NULL,
  total_quantity numeric(18,4) NOT NULL,
  subtotal_amount numeric(18,4) NOT NULL,
  total_amount numeric(18,4) NOT NULL,
  paid_amount numeric(18,4) NOT NULL,
  unpaid_amount numeric(18,4) NOT NULL,
  completion_percentage numeric(7,4) NOT NULL,
  CONSTRAINT pk_production_orders PRIMARY KEY (id)
);

CREATE TABLE production_order_items (
  id uuid DEFAULT uuidv7() NOT NULL,
  line_no integer NOT NULL,
  sku_id uuid NOT NULL,
  sku_code_snapshot varchar(100) NOT NULL,
  sku_name_snapshot varchar(200) NOT NULL,
  specification_snapshot varchar(200),
  quantity numeric(18,4) NOT NULL,
  remark varchar(1000),
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  production_order_id uuid NOT NULL,
  processing_unit_price numeric(18,4) NOT NULL,
  line_amount numeric(18,4) NOT NULL,
  planned_quantity numeric(18,4) NOT NULL,
  completed_quantity numeric(18,4) NOT NULL,
  inspected_quantity numeric(18,4) NOT NULL,
  qualified_quantity numeric(18,4) NOT NULL,
  inbound_quantity numeric(18,4) NOT NULL,
  shipped_quantity numeric(18,4) NOT NULL,
  CONSTRAINT pk_production_order_items PRIMARY KEY (id)
);

CREATE TABLE production_payments (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  payment_no varchar(50) NOT NULL,
  production_order_id uuid NOT NULL,
  manufacturer_id uuid NOT NULL,
  payment_date date NOT NULL,
  currency_code varchar(3) NOT NULL,
  payment_amount numeric(18,4) NOT NULL,
  payment_method varchar(50) NOT NULL,
  bank_reference_no varchar(50),
  payee_account_snapshot varchar(255) NOT NULL,
  payment_status varchar(50) NOT NULL,
  remark varchar(1000),
  CONSTRAINT pk_production_payments PRIMARY KEY (id)
);

CREATE TABLE production_progress_records (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  production_order_id uuid NOT NULL,
  progress_date date NOT NULL,
  progress_stage varchar(200) NOT NULL,
  progress_percentage numeric(7,4) NOT NULL,
  completed_quantity numeric(18,4) NOT NULL,
  estimated_completion_date date,
  progress_description text NOT NULL,
  reported_by_name varchar(200),
  attachment_required boolean NOT NULL,
  CONSTRAINT pk_production_progress_records PRIMARY KEY (id)
);

CREATE TABLE production_completion_records (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  production_order_id uuid NOT NULL,
  completion_batch_no varchar(50) NOT NULL,
  completion_date date NOT NULL,
  warehouse_id uuid NOT NULL,
  total_completed_quantity numeric(18,4) NOT NULL,
  completion_status production_completion_status NOT NULL,
  remark varchar(1000),
  CONSTRAINT pk_production_completion_records PRIMARY KEY (id)
);

CREATE TABLE production_completion_record_items (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  production_completion_record_id uuid NOT NULL,
  line_no integer NOT NULL,
  production_order_item_id uuid NOT NULL,
  sku_id uuid NOT NULL,
  sku_code_snapshot varchar(100) NOT NULL,
  sku_name_snapshot varchar(200) NOT NULL,
  specification_snapshot varchar(200),
  completed_quantity numeric(18,4) NOT NULL,
  batch_no varchar(50),
  remark varchar(1000),
  CONSTRAINT pk_production_completion_record_items PRIMARY KEY (id)
);

CREATE TABLE inspection_orders (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  document_no varchar(50) NOT NULL,
  document_date date NOT NULL,
  status varchar(50) NOT NULL,
  approval_status varchar(50) NOT NULL,
  remark varchar(1000),
  submitted_at timestamptz,
  submitted_by uuid,
  approved_at timestamptz,
  approved_by uuid,
  cancelled_at timestamptz,
  cancelled_by uuid,
  cancel_reason varchar(1000),
  version_no integer NOT NULL,
  source_type varchar(50) NOT NULL,
  purchase_order_id uuid,
  production_order_id uuid,
  inspection_date date NOT NULL,
  inspection_warehouse_id uuid NOT NULL,
  inspector_id uuid NOT NULL,
  total_inspected_quantity numeric(18,4) NOT NULL,
  total_qualified_quantity numeric(18,4) NOT NULL,
  total_unqualified_quantity numeric(18,4) NOT NULL,
  inspection_result varchar(50) NOT NULL,
  unqualified_disposition varchar(200),
  CONSTRAINT pk_inspection_orders PRIMARY KEY (id)
);

CREATE TABLE inspection_order_items (
  id uuid DEFAULT uuidv7() NOT NULL,
  line_no integer NOT NULL,
  sku_id uuid NOT NULL,
  sku_code_snapshot varchar(100) NOT NULL,
  sku_name_snapshot varchar(200) NOT NULL,
  specification_snapshot varchar(200),
  quantity numeric(18,4) NOT NULL,
  remark varchar(1000),
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  inspection_order_id uuid NOT NULL,
  source_item_id uuid NOT NULL,
  inspected_quantity numeric(18,4) NOT NULL,
  qualified_quantity numeric(18,4) NOT NULL,
  unqualified_quantity numeric(18,4) NOT NULL,
  pending_quantity numeric(18,4) NOT NULL,
  defect_category varchar(200),
  defect_description text,
  inspection_result varchar(50) NOT NULL,
  disposition_method varchar(50),
  CONSTRAINT pk_inspection_order_items PRIMARY KEY (id)
);

CREATE TABLE inbound_orders (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  document_no varchar(50) NOT NULL,
  document_date date NOT NULL,
  status varchar(50) NOT NULL,
  approval_status varchar(50) NOT NULL,
  remark varchar(1000),
  submitted_at timestamptz,
  submitted_by uuid,
  approved_at timestamptz,
  approved_by uuid,
  cancelled_at timestamptz,
  cancelled_by uuid,
  cancel_reason varchar(1000),
  version_no integer NOT NULL,
  inbound_type varchar(50) NOT NULL,
  warehouse_id uuid NOT NULL,
  supplier_id uuid,
  manufacturer_id uuid,
  source_document_type varchar(50) NOT NULL,
  source_document_id uuid NOT NULL,
  inspection_order_id uuid,
  total_quantity numeric(18,4) NOT NULL,
  inbound_completed_at timestamptz,
  CONSTRAINT pk_inbound_orders PRIMARY KEY (id)
);

CREATE TABLE inbound_order_items (
  id uuid DEFAULT uuidv7() NOT NULL,
  line_no integer NOT NULL,
  sku_id uuid NOT NULL,
  sku_code_snapshot varchar(100) NOT NULL,
  sku_name_snapshot varchar(200) NOT NULL,
  specification_snapshot varchar(200),
  quantity numeric(18,4) NOT NULL,
  remark varchar(1000),
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  inbound_order_id uuid NOT NULL,
  source_document_item_id uuid NOT NULL,
  inspection_order_item_id uuid,
  batch_no varchar(50) NOT NULL,
  production_date date,
  unit_cost numeric(18,4) NOT NULL,
  line_cost numeric(18,4) NOT NULL,
  inventory_condition varchar(50) NOT NULL,
  CONSTRAINT pk_inbound_order_items PRIMARY KEY (id)
);

CREATE TABLE outbound_orders (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  document_no varchar(50) NOT NULL,
  document_date date NOT NULL,
  status varchar(50) NOT NULL,
  approval_status varchar(50) NOT NULL,
  remark varchar(1000),
  submitted_at timestamptz,
  submitted_by uuid,
  approved_at timestamptz,
  approved_by uuid,
  cancelled_at timestamptz,
  cancelled_by uuid,
  cancel_reason varchar(1000),
  version_no integer NOT NULL,
  outbound_type varchar(50) NOT NULL,
  warehouse_id uuid NOT NULL,
  platform_id uuid,
  store_id uuid,
  external_order_no varchar(100),
  customer_name varchar(200),
  recipient_country varchar(2),
  recipient_address varchar(500),
  total_quantity numeric(18,4) NOT NULL,
  outbound_completed_at timestamptz,
  CONSTRAINT pk_outbound_orders PRIMARY KEY (id)
);

CREATE TABLE outbound_order_items (
  id uuid DEFAULT uuidv7() NOT NULL,
  line_no integer NOT NULL,
  sku_id uuid NOT NULL,
  sku_code_snapshot varchar(100) NOT NULL,
  sku_name_snapshot varchar(200) NOT NULL,
  specification_snapshot varchar(200),
  quantity numeric(18,4) NOT NULL,
  remark varchar(1000),
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  outbound_order_id uuid NOT NULL,
  batch_no varchar(50) NOT NULL,
  unit_cost numeric(18,4) NOT NULL,
  line_cost numeric(18,4) NOT NULL,
  external_sku_code varchar(100),
  external_order_item_no varchar(100),
  CONSTRAINT pk_outbound_order_items PRIMARY KEY (id)
);

CREATE TABLE sales_returns (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  document_no varchar(50) NOT NULL,
  document_date date NOT NULL,
  status varchar(50) NOT NULL,
  approval_status varchar(50) NOT NULL,
  remark varchar(1000),
  submitted_at timestamptz,
  submitted_by uuid,
  approved_at timestamptz,
  approved_by uuid,
  cancelled_at timestamptz,
  cancelled_by uuid,
  cancel_reason varchar(1000),
  version_no integer NOT NULL,
  outbound_order_id uuid NOT NULL,
  store_id uuid NOT NULL,
  return_warehouse_id uuid NOT NULL,
  external_return_no varchar(100),
  return_date date NOT NULL,
  return_reason varchar(1000) NOT NULL,
  total_quantity numeric(18,4) NOT NULL,
  return_result varchar(200),
  CONSTRAINT pk_sales_returns PRIMARY KEY (id)
);

CREATE TABLE sales_return_items (
  id uuid DEFAULT uuidv7() NOT NULL,
  line_no integer NOT NULL,
  sku_id uuid NOT NULL,
  sku_code_snapshot varchar(100) NOT NULL,
  sku_name_snapshot varchar(200) NOT NULL,
  specification_snapshot varchar(200),
  quantity numeric(18,4) NOT NULL,
  remark varchar(1000),
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  sales_return_id uuid NOT NULL,
  outbound_order_item_id uuid NOT NULL,
  returned_quantity numeric(18,4) NOT NULL,
  sellable_quantity numeric(18,4) NOT NULL,
  pending_quantity numeric(18,4) NOT NULL,
  damaged_quantity numeric(18,4) NOT NULL,
  inventory_condition varchar(50) NOT NULL,
  disposition_method varchar(50) NOT NULL,
  CONSTRAINT pk_sales_return_items PRIMARY KEY (id)
);

CREATE TABLE damage_reports (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  document_no varchar(50) NOT NULL,
  document_date date NOT NULL,
  status varchar(50) NOT NULL,
  approval_status varchar(50) NOT NULL,
  remark varchar(1000),
  submitted_at timestamptz,
  submitted_by uuid,
  approved_at timestamptz,
  approved_by uuid,
  cancelled_at timestamptz,
  cancelled_by uuid,
  cancel_reason varchar(1000),
  version_no integer NOT NULL,
  warehouse_id uuid NOT NULL,
  source_document_type varchar(50),
  source_document_id uuid,
  damage_date date NOT NULL,
  damage_reason varchar(1000) NOT NULL,
  total_quantity numeric(18,4) NOT NULL,
  total_loss_amount numeric(18,4) NOT NULL,
  responsible_party varchar(200),
  disposition_method varchar(50) NOT NULL,
  CONSTRAINT pk_damage_reports PRIMARY KEY (id)
);

CREATE TABLE damage_report_items (
  id uuid DEFAULT uuidv7() NOT NULL,
  line_no integer NOT NULL,
  sku_id uuid NOT NULL,
  sku_code_snapshot varchar(100) NOT NULL,
  sku_name_snapshot varchar(200) NOT NULL,
  specification_snapshot varchar(200),
  quantity numeric(18,4) NOT NULL,
  remark varchar(1000),
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  damage_report_id uuid NOT NULL,
  source_document_item_id uuid,
  batch_no varchar(50) NOT NULL,
  unit_cost numeric(18,4) NOT NULL,
  loss_amount numeric(18,4) NOT NULL,
  damage_reason varchar(1000) NOT NULL,
  inventory_condition varchar(50) NOT NULL,
  CONSTRAINT pk_damage_report_items PRIMARY KEY (id)
);

CREATE TABLE cross_border_shipments (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  document_no varchar(50) NOT NULL,
  document_date date NOT NULL,
  status varchar(50) NOT NULL,
  approval_status varchar(50) NOT NULL,
  remark varchar(1000),
  submitted_at timestamptz,
  submitted_by uuid,
  approved_at timestamptz,
  approved_by uuid,
  cancelled_at timestamptz,
  cancelled_by uuid,
  cancel_reason varchar(1000),
  version_no integer NOT NULL,
  production_order_id uuid,
  source_warehouse_id uuid NOT NULL,
  transit_warehouse_id uuid NOT NULL,
  destination_warehouse_id uuid NOT NULL,
  shipment_batch_no varchar(50) NOT NULL,
  carrier_name varchar(200) NOT NULL,
  tracking_no varchar(100) NOT NULL,
  transport_method varchar(50) NOT NULL,
  departure_date date NOT NULL,
  estimated_arrival_date date NOT NULL,
  actual_arrival_date date,
  destination_country varchar(2) NOT NULL,
  total_quantity numeric(18,4) NOT NULL,
  shipment_status varchar(50) NOT NULL,
  CONSTRAINT pk_cross_border_shipments PRIMARY KEY (id)
);

CREATE TABLE cross_border_shipment_items (
  id uuid DEFAULT uuidv7() NOT NULL,
  line_no integer NOT NULL,
  sku_id uuid NOT NULL,
  sku_code_snapshot varchar(100) NOT NULL,
  sku_name_snapshot varchar(200) NOT NULL,
  specification_snapshot varchar(200),
  quantity numeric(18,4) NOT NULL,
  remark varchar(1000),
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  cross_border_shipment_id uuid NOT NULL,
  production_order_item_id uuid,
  batch_no varchar(50) NOT NULL,
  shipped_quantity numeric(18,4) NOT NULL,
  received_quantity numeric(18,4) NOT NULL,
  difference_quantity numeric(18,4) NOT NULL,
  unit_cost numeric(18,4) NOT NULL,
  line_cost numeric(18,4) NOT NULL,
  CONSTRAINT pk_cross_border_shipment_items PRIMARY KEY (id)
);

CREATE TABLE shipment_import_matches (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  cross_border_shipment_id uuid NOT NULL,
  cross_border_shipment_item_id uuid NOT NULL,
  import_task_id uuid NOT NULL,
  import_task_item_id uuid NOT NULL,
  matched_quantity numeric(18,4) NOT NULL,
  received_quantity numeric(18,4) NOT NULL,
  difference_quantity numeric(18,4) NOT NULL,
  match_status varchar(50) NOT NULL,
  matched_at timestamptz,
  matched_by uuid,
  remark varchar(1000),
  CONSTRAINT pk_shipment_import_matches PRIMARY KEY (id)
);

CREATE TABLE inventories (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  sku_id uuid NOT NULL,
  warehouse_id uuid NOT NULL,
  on_hand_quantity numeric(18,4) NOT NULL,
  available_quantity numeric(18,4) NOT NULL,
  reserved_quantity numeric(18,4) NOT NULL,
  pending_quantity numeric(18,4) NOT NULL,
  last_transaction_at timestamptz,
  last_counted_at timestamptz,
  CONSTRAINT pk_inventories PRIMARY KEY (id)
);

CREATE TABLE inventory_transactions (
  id uuid DEFAULT uuidv7() NOT NULL,
  transaction_no varchar(50) NOT NULL,
  transaction_at timestamptz NOT NULL,
  sku_id uuid NOT NULL,
  warehouse_id uuid NOT NULL,
  transaction_type varchar(50) NOT NULL,
  direction varchar(50) NOT NULL,
  quantity numeric(18,4) NOT NULL,
  quantity_before numeric(18,4) NOT NULL,
  quantity_after numeric(18,4) NOT NULL,
  unit_cost numeric(18,4),
  amount numeric(18,4),
  source_document_type varchar(50) NOT NULL,
  source_document_id uuid NOT NULL,
  source_document_item_id uuid NOT NULL,
  related_transaction_id uuid,
  batch_no varchar(50),
  operator_id uuid NOT NULL,
  remark varchar(1000),
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_inventory_transactions PRIMARY KEY (id)
);

CREATE TABLE transfer_orders (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  document_no varchar(50) NOT NULL,
  document_date date NOT NULL,
  status varchar(50) NOT NULL,
  approval_status varchar(50) NOT NULL,
  remark varchar(1000),
  submitted_at timestamptz,
  submitted_by uuid,
  approved_at timestamptz,
  approved_by uuid,
  cancelled_at timestamptz,
  cancelled_by uuid,
  cancel_reason varchar(1000),
  version_no integer NOT NULL,
  source_warehouse_id uuid NOT NULL,
  transit_warehouse_id uuid NOT NULL,
  destination_warehouse_id uuid NOT NULL,
  planned_transfer_date date NOT NULL,
  shipped_at timestamptz,
  received_at timestamptz,
  total_quantity numeric(18,4) NOT NULL,
  CONSTRAINT pk_transfer_orders PRIMARY KEY (id)
);

CREATE TABLE transfer_order_items (
  id uuid DEFAULT uuidv7() NOT NULL,
  line_no integer NOT NULL,
  sku_id uuid NOT NULL,
  sku_code_snapshot varchar(100) NOT NULL,
  sku_name_snapshot varchar(200) NOT NULL,
  specification_snapshot varchar(200),
  quantity numeric(18,4) NOT NULL,
  remark varchar(1000),
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  transfer_order_id uuid NOT NULL,
  batch_no varchar(50) NOT NULL,
  shipped_quantity numeric(18,4) NOT NULL,
  received_quantity numeric(18,4) NOT NULL,
  difference_quantity numeric(18,4) NOT NULL,
  unit_cost numeric(18,4) NOT NULL,
  CONSTRAINT pk_transfer_order_items PRIMARY KEY (id)
);

CREATE TABLE stock_counts (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  document_no varchar(50) NOT NULL,
  document_date date NOT NULL,
  status varchar(50) NOT NULL,
  approval_status varchar(50) NOT NULL,
  remark varchar(1000),
  submitted_at timestamptz,
  submitted_by uuid,
  approved_at timestamptz,
  approved_by uuid,
  cancelled_at timestamptz,
  cancelled_by uuid,
  cancel_reason varchar(1000),
  version_no integer NOT NULL,
  warehouse_id uuid NOT NULL,
  count_date date NOT NULL,
  count_scope varchar(200) NOT NULL,
  started_at timestamptz,
  completed_at timestamptz,
  freeze_inventory boolean NOT NULL,
  total_item_count integer NOT NULL,
  difference_item_count integer NOT NULL,
  CONSTRAINT pk_stock_counts PRIMARY KEY (id)
);

CREATE TABLE stock_count_items (
  id uuid DEFAULT uuidv7() NOT NULL,
  line_no integer NOT NULL,
  sku_id uuid NOT NULL,
  sku_code_snapshot varchar(100) NOT NULL,
  sku_name_snapshot varchar(200) NOT NULL,
  specification_snapshot varchar(200),
  quantity numeric(18,4) NOT NULL,
  remark varchar(1000),
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  stock_count_id uuid NOT NULL,
  batch_no varchar(50),
  book_quantity numeric(18,4) NOT NULL,
  counted_quantity numeric(18,4) NOT NULL,
  difference_quantity numeric(18,4) NOT NULL,
  difference_reason varchar(1000),
  recount_quantity numeric(18,4),
  final_quantity numeric(18,4) NOT NULL,
  CONSTRAINT pk_stock_count_items PRIMARY KEY (id)
);

CREATE TABLE inventory_adjustments (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  document_no varchar(50) NOT NULL,
  document_date date NOT NULL,
  status varchar(50) NOT NULL,
  approval_status varchar(50) NOT NULL,
  remark varchar(1000),
  submitted_at timestamptz,
  submitted_by uuid,
  approved_at timestamptz,
  approved_by uuid,
  cancelled_at timestamptz,
  cancelled_by uuid,
  cancel_reason varchar(1000),
  version_no integer NOT NULL,
  warehouse_id uuid NOT NULL,
  stock_count_id uuid,
  adjustment_type varchar(50) NOT NULL,
  adjustment_reason varchar(1000) NOT NULL,
  total_increase_quantity numeric(18,4) NOT NULL,
  total_decrease_quantity numeric(18,4) NOT NULL,
  adjusted_at timestamptz,
  CONSTRAINT pk_inventory_adjustments PRIMARY KEY (id)
);

CREATE TABLE inventory_adjustment_items (
  id uuid DEFAULT uuidv7() NOT NULL,
  line_no integer NOT NULL,
  sku_id uuid NOT NULL,
  sku_code_snapshot varchar(100) NOT NULL,
  sku_name_snapshot varchar(200) NOT NULL,
  specification_snapshot varchar(200),
  quantity numeric(18,4) NOT NULL,
  remark varchar(1000),
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  inventory_adjustment_id uuid NOT NULL,
  stock_count_item_id uuid,
  batch_no varchar(50),
  quantity_before numeric(18,4) NOT NULL,
  adjustment_quantity numeric(18,4) NOT NULL,
  quantity_after numeric(18,4) NOT NULL,
  adjustment_direction varchar(200) NOT NULL,
  unit_cost numeric(18,4) NOT NULL,
  amount numeric(18,4) NOT NULL,
  CONSTRAINT pk_inventory_adjustment_items PRIMARY KEY (id)
);

CREATE TABLE inventory_alerts (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  alert_no varchar(50) NOT NULL,
  alert_type varchar(50) NOT NULL,
  sku_id uuid NOT NULL,
  warehouse_id uuid,
  threshold_quantity numeric(18,4) NOT NULL,
  current_quantity numeric(18,4) NOT NULL,
  alert_level varchar(50) NOT NULL,
  alert_status varchar(50) NOT NULL,
  generated_at timestamptz NOT NULL,
  viewed_at timestamptz,
  viewed_by uuid,
  handled_at timestamptz,
  handled_by uuid,
  handling_result varchar(1000),
  closed_at timestamptz,
  closed_by uuid,
  CONSTRAINT pk_inventory_alerts PRIMARY KEY (id)
);

CREATE TABLE import_tasks (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  task_no varchar(50) NOT NULL,
  import_type varchar(50) NOT NULL,
  file_name varchar(255) NOT NULL,
  file_reference varchar(1000) NOT NULL,
  warehouse_id uuid,
  store_id uuid,
  status varchar(50) NOT NULL,
  total_rows integer NOT NULL,
  success_rows integer NOT NULL,
  failed_rows integer NOT NULL,
  warning_rows integer NOT NULL,
  started_at timestamptz,
  completed_at timestamptz,
  error_summary text,
  CONSTRAINT pk_import_tasks PRIMARY KEY (id)
);

CREATE TABLE import_task_items (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  import_task_id uuid NOT NULL,
  row_no integer NOT NULL,
  raw_data jsonb NOT NULL,
  matched_sku_id uuid,
  matched_warehouse_id uuid,
  validation_status varchar(50) NOT NULL,
  execution_status varchar(50) NOT NULL,
  error_code varchar(50),
  error_message text,
  result_document_type varchar(50),
  result_document_id uuid,
  processed_at timestamptz,
  CONSTRAINT pk_import_task_items PRIMARY KEY (id)
);

CREATE TABLE users (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  disabled_at timestamptz,
  disabled_by uuid,
  username varchar(100) NOT NULL,
  display_name varchar(200) NOT NULL,
  password_hash varchar(255) NOT NULL,
  email varchar(254),
  phone varchar(50),
  status varchar(50) NOT NULL,
  must_change_password boolean DEFAULT true NOT NULL,
  last_login_at timestamptz,
  failed_login_count integer NOT NULL,
  locked_until timestamptz,
  CONSTRAINT pk_users PRIMARY KEY (id)
);

CREATE TABLE roles (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  disabled_at timestamptz,
  disabled_by uuid,
  role_code varchar(100) NOT NULL,
  role_name varchar(200) NOT NULL,
  description text,
  is_system_role boolean NOT NULL,
  CONSTRAINT pk_roles PRIMARY KEY (id)
);

CREATE TABLE permissions (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  disabled_at timestamptz,
  disabled_by uuid,
  permission_code varchar(100) NOT NULL,
  permission_name varchar(200) NOT NULL,
  module_code varchar(100) NOT NULL,
  action_code varchar(100) NOT NULL,
  description text,
  CONSTRAINT pk_permissions PRIMARY KEY (id)
);

CREATE TABLE user_roles (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  user_id uuid NOT NULL,
  role_id uuid NOT NULL,
  effective_from timestamptz NOT NULL,
  effective_to timestamptz,
  assigned_by uuid NOT NULL,
  assigned_at timestamptz NOT NULL,
  CONSTRAINT pk_user_roles PRIMARY KEY (id)
);

CREATE TABLE role_permissions (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  role_id uuid NOT NULL,
  permission_id uuid NOT NULL,
  granted_by uuid NOT NULL,
  granted_at timestamptz NOT NULL,
  CONSTRAINT pk_role_permissions PRIMARY KEY (id)
);

CREATE TABLE role_warehouses (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  role_id uuid NOT NULL,
  warehouse_id uuid NOT NULL,
  access_level varchar(30) NOT NULL,
  assigned_at timestamptz NOT NULL,
  assigned_by uuid NOT NULL,
  CONSTRAINT pk_role_warehouses PRIMARY KEY (id)
);

CREATE TABLE role_stores (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  role_id uuid NOT NULL,
  store_id uuid NOT NULL,
  access_level varchar(30) NOT NULL,
  assigned_at timestamptz NOT NULL,
  assigned_by uuid NOT NULL,
  CONSTRAINT pk_role_stores PRIMARY KEY (id)
);

CREATE TABLE system_settings (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  disabled_at timestamptz,
  disabled_by uuid,
  setting_key varchar(200) NOT NULL,
  setting_name varchar(200) NOT NULL,
  setting_value varchar(200) NOT NULL,
  setting_group varchar(200) NOT NULL,
  value_format varchar(200) NOT NULL,
  is_sensitive boolean DEFAULT false NOT NULL,
  description text,
  CONSTRAINT pk_system_settings PRIMARY KEY (id)
);

CREATE TABLE backup_tasks (
  id uuid DEFAULT uuidv7() NOT NULL,
  task_no varchar(50) NOT NULL,
  backup_type varchar(50) NOT NULL,
  backup_scope text NOT NULL,
  trigger_type varchar(50) NOT NULL,
  status varchar(50) NOT NULL,
  started_at timestamptz,
  completed_at timestamptz,
  file_reference varchar(1000),
  file_size bigint,
  checksum varchar(128),
  retention_until timestamptz,
  error_message text,
  triggered_by uuid NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_backup_tasks PRIMARY KEY (id)
);

CREATE TABLE attachments (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  original_file_name varchar(255) NOT NULL,
  stored_file_name varchar(255) NOT NULL,
  file_extension varchar(20) NOT NULL,
  mime_type varchar(100) NOT NULL,
  file_size bigint NOT NULL,
  storage_reference varchar(1000) NOT NULL,
  checksum varchar(128) NOT NULL,
  uploaded_at timestamptz NOT NULL,
  uploaded_by uuid NOT NULL,
  is_sensitive boolean DEFAULT false NOT NULL,
  status varchar(50) NOT NULL,
  CONSTRAINT pk_attachments PRIMARY KEY (id)
);

CREATE TABLE attachment_links (
  id uuid DEFAULT uuidv7() NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by uuid NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by uuid NOT NULL,
  attachment_id uuid NOT NULL,
  object_type varchar(50) NOT NULL,
  object_id uuid NOT NULL,
  object_item_id uuid,
  attachment_category varchar(200) NOT NULL,
  sort_order integer NOT NULL,
  linked_at timestamptz NOT NULL,
  linked_by uuid NOT NULL,
  CONSTRAINT pk_attachment_links PRIMARY KEY (id)
);

CREATE TABLE audit_logs (
  id uuid DEFAULT uuidv7() NOT NULL,
  occurred_at timestamptz NOT NULL,
  user_id uuid,
  username_snapshot varchar(200),
  action_code varchar(100) NOT NULL,
  module_code varchar(100) NOT NULL,
  object_type varchar(50) NOT NULL,
  object_id uuid NOT NULL,
  object_no_snapshot varchar(200),
  operation_result varchar(200) NOT NULL,
  before_snapshot jsonb,
  after_snapshot jsonb,
  ip_address varchar(500),
  device_info text,
  request_trace_id uuid NOT NULL,
  failure_reason text,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_audit_logs PRIMARY KEY (id)
);

CREATE TABLE document_status_histories (
  id uuid DEFAULT uuidv7() NOT NULL,
  object_type varchar(50) NOT NULL,
  object_id uuid NOT NULL,
  object_no_snapshot varchar(200) NOT NULL,
  from_status varchar(50),
  to_status varchar(50) NOT NULL,
  changed_at timestamptz NOT NULL,
  changed_by uuid NOT NULL,
  change_reason varchar(1000),
  remark varchar(1000),
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_document_status_histories PRIMARY KEY (id)
);

CREATE TABLE approval_records (
  id uuid DEFAULT uuidv7() NOT NULL,
  object_type varchar(50) NOT NULL,
  object_id uuid NOT NULL,
  object_no_snapshot varchar(200) NOT NULL,
  approval_action varchar(200) NOT NULL,
  approval_result varchar(200) NOT NULL,
  approver_id uuid NOT NULL,
  approved_at timestamptz NOT NULL,
  approval_comment varchar(200),
  previous_approval_record_id uuid,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_approval_records PRIMARY KEY (id)
);

CREATE UNIQUE INDEX uq_product_categories_category_code ON product_categories (lower(category_code));
ALTER TABLE product_categories ADD CONSTRAINT uq_product_categories_parent_category_id_category_name UNIQUE NULLS NOT DISTINCT (parent_category_id, category_name);
CREATE UNIQUE INDEX uq_brands_brand_code ON brands (lower(brand_code));
ALTER TABLE brands ADD CONSTRAINT uq_brands_brand_name UNIQUE (brand_name);
CREATE UNIQUE INDEX uq_products_product_code ON products (lower(product_code));
CREATE UNIQUE INDEX uq_skus_sku_code ON skus (lower(sku_code));
ALTER TABLE skus ADD CONSTRAINT uq_skus_barcode UNIQUE (barcode);
CREATE UNIQUE INDEX uq_suppliers_supplier_code ON suppliers (lower(supplier_code));
ALTER TABLE suppliers ADD CONSTRAINT uq_suppliers_tax_identifier UNIQUE (tax_identifier);
CREATE UNIQUE INDEX uq_manufacturers_manufacturer_code ON manufacturers (lower(manufacturer_code));
CREATE UNIQUE INDEX uq_warehouses_warehouse_code ON warehouses (lower(warehouse_code));
CREATE UNIQUE INDEX uq_ecommerce_platforms_platform_code ON ecommerce_platforms (lower(platform_code));
ALTER TABLE ecommerce_platforms ADD CONSTRAINT uq_ecommerce_platforms_platform_name UNIQUE (platform_name);
CREATE UNIQUE INDEX uq_stores_store_code ON stores (lower(store_code));
ALTER TABLE stores ADD CONSTRAINT uq_stores_platform_id_external_store_id UNIQUE (platform_id, external_store_id);
ALTER TABLE product_suppliers ADD CONSTRAINT uq_product_suppliers_product_id_supplier_id_effective_from UNIQUE (product_id, supplier_id, effective_from);
ALTER TABLE product_manufacturers ADD CONSTRAINT uq_product_manufacturers_product_id_manufacturer_id_ef_99c7ca85 UNIQUE (product_id, manufacturer_id, effective_from);
ALTER TABLE purchase_orders ADD CONSTRAINT uq_purchase_orders_document_no UNIQUE (document_no);
ALTER TABLE purchase_order_items ADD CONSTRAINT uq_purchase_order_items_purchase_order_id_line_no UNIQUE (purchase_order_id, line_no);
ALTER TABLE purchase_payments ADD CONSTRAINT uq_purchase_payments_payment_no UNIQUE (payment_no);
ALTER TABLE purchase_returns ADD CONSTRAINT uq_purchase_returns_document_no UNIQUE (document_no);
ALTER TABLE purchase_return_items ADD CONSTRAINT uq_purchase_return_items_purchase_return_id_line_no UNIQUE (purchase_return_id, line_no);
ALTER TABLE production_orders ADD CONSTRAINT uq_production_orders_document_no UNIQUE (document_no);
ALTER TABLE production_order_items ADD CONSTRAINT uq_production_order_items_production_order_id_line_no UNIQUE (production_order_id, line_no);
ALTER TABLE production_payments ADD CONSTRAINT uq_production_payments_payment_no UNIQUE (payment_no);
ALTER TABLE production_completion_records ADD CONSTRAINT uq_production_completion_records_production_order_id_c_ef9c4cf2 UNIQUE (production_order_id, completion_batch_no);
ALTER TABLE production_completion_record_items ADD CONSTRAINT uq_production_completion_record_items_production_compl_08c3c502 UNIQUE (production_completion_record_id, line_no);
ALTER TABLE production_completion_record_items ADD CONSTRAINT uq_production_completion_record_items_production_compl_74bf806c UNIQUE (production_completion_record_id, production_order_item_id);
ALTER TABLE inspection_orders ADD CONSTRAINT uq_inspection_orders_document_no UNIQUE (document_no);
ALTER TABLE inspection_order_items ADD CONSTRAINT uq_inspection_order_items_inspection_order_id_line_no UNIQUE (inspection_order_id, line_no);
ALTER TABLE inbound_orders ADD CONSTRAINT uq_inbound_orders_document_no UNIQUE (document_no);
ALTER TABLE inbound_order_items ADD CONSTRAINT uq_inbound_order_items_inbound_order_id_line_no UNIQUE (inbound_order_id, line_no);
ALTER TABLE outbound_orders ADD CONSTRAINT uq_outbound_orders_document_no UNIQUE (document_no);
ALTER TABLE outbound_orders ADD CONSTRAINT uq_outbound_orders_store_id_external_order_no UNIQUE (store_id, external_order_no);
ALTER TABLE outbound_order_items ADD CONSTRAINT uq_outbound_order_items_outbound_order_id_line_no UNIQUE (outbound_order_id, line_no);
ALTER TABLE outbound_order_items ADD CONSTRAINT uq_outbound_order_items_outbound_order_id_external_ord_6b04e5ef UNIQUE (outbound_order_id, external_order_item_no);
ALTER TABLE sales_returns ADD CONSTRAINT uq_sales_returns_document_no UNIQUE (document_no);
ALTER TABLE sales_returns ADD CONSTRAINT uq_sales_returns_store_id_external_return_no UNIQUE (store_id, external_return_no);
ALTER TABLE sales_return_items ADD CONSTRAINT uq_sales_return_items_sales_return_id_line_no UNIQUE (sales_return_id, line_no);
ALTER TABLE damage_reports ADD CONSTRAINT uq_damage_reports_document_no UNIQUE (document_no);
ALTER TABLE damage_report_items ADD CONSTRAINT uq_damage_report_items_damage_report_id_line_no UNIQUE (damage_report_id, line_no);
ALTER TABLE cross_border_shipments ADD CONSTRAINT uq_cross_border_shipments_document_no UNIQUE (document_no);
ALTER TABLE cross_border_shipments ADD CONSTRAINT uq_cross_border_shipments_shipment_batch_no UNIQUE (shipment_batch_no);
ALTER TABLE cross_border_shipments ADD CONSTRAINT uq_cross_border_shipments_carrier_name_tracking_no UNIQUE (carrier_name, tracking_no);
ALTER TABLE cross_border_shipment_items ADD CONSTRAINT uq_cross_border_shipment_items_cross_border_shipment_id_line_no UNIQUE (cross_border_shipment_id, line_no);
ALTER TABLE shipment_import_matches ADD CONSTRAINT uq_shipment_import_matches_cross_border_shipment_item__3f7e11e6 UNIQUE (cross_border_shipment_item_id, import_task_item_id);
ALTER TABLE inventories ADD CONSTRAINT uq_inventories_sku_id_warehouse_id UNIQUE (sku_id, warehouse_id);
ALTER TABLE inventory_transactions ADD CONSTRAINT uq_inventory_transactions_transaction_no UNIQUE (transaction_no);
ALTER TABLE transfer_orders ADD CONSTRAINT uq_transfer_orders_document_no UNIQUE (document_no);
ALTER TABLE transfer_order_items ADD CONSTRAINT uq_transfer_order_items_transfer_order_id_line_no UNIQUE (transfer_order_id, line_no);
ALTER TABLE stock_counts ADD CONSTRAINT uq_stock_counts_document_no UNIQUE (document_no);
ALTER TABLE stock_count_items ADD CONSTRAINT uq_stock_count_items_stock_count_id_line_no UNIQUE (stock_count_id, line_no);
ALTER TABLE stock_count_items ADD CONSTRAINT uq_stock_count_items_stock_count_id_sku_id_batch_no UNIQUE NULLS NOT DISTINCT (stock_count_id, sku_id, batch_no);
ALTER TABLE inventory_adjustments ADD CONSTRAINT uq_inventory_adjustments_document_no UNIQUE (document_no);
ALTER TABLE inventory_adjustments ADD CONSTRAINT uq_inventory_adjustments_stock_count_id UNIQUE (stock_count_id);
ALTER TABLE inventory_adjustment_items ADD CONSTRAINT uq_inventory_adjustment_items_inventory_adjustment_id_line_no UNIQUE (inventory_adjustment_id, line_no);
ALTER TABLE inventory_alerts ADD CONSTRAINT uq_inventory_alerts_alert_no UNIQUE (alert_no);
ALTER TABLE import_tasks ADD CONSTRAINT uq_import_tasks_task_no UNIQUE (task_no);
ALTER TABLE import_task_items ADD CONSTRAINT uq_import_task_items_import_task_id_row_no UNIQUE (import_task_id, row_no);
CREATE UNIQUE INDEX uq_users_username ON users (lower(username));
CREATE UNIQUE INDEX uq_roles_role_code ON roles (lower(role_code));
ALTER TABLE roles ADD CONSTRAINT uq_roles_role_name UNIQUE (role_name);
CREATE UNIQUE INDEX uq_permissions_permission_code ON permissions (lower(permission_code));
ALTER TABLE permissions ADD CONSTRAINT uq_permissions_module_code_action_code UNIQUE (module_code, action_code);
ALTER TABLE user_roles ADD CONSTRAINT uq_user_roles_user_id_role_id UNIQUE (user_id, role_id);
ALTER TABLE role_permissions ADD CONSTRAINT uq_role_permissions_role_id_permission_id UNIQUE (role_id, permission_id);
ALTER TABLE role_warehouses ADD CONSTRAINT uq_role_warehouses_role_id_warehouse_id UNIQUE (role_id, warehouse_id);
ALTER TABLE role_stores ADD CONSTRAINT uq_role_stores_role_id_store_id UNIQUE (role_id, store_id);
CREATE UNIQUE INDEX uq_system_settings_setting_key ON system_settings (lower(setting_key));
ALTER TABLE backup_tasks ADD CONSTRAINT uq_backup_tasks_task_no UNIQUE (task_no);
ALTER TABLE attachment_links ADD CONSTRAINT uq_attachment_links_attachment_id_object_type_object_i_f71592b4 UNIQUE NULLS NOT DISTINCT (attachment_id, object_type, object_id, object_item_id, attachment_category);

ALTER TABLE product_categories ADD CONSTRAINT fk_product_categories_parent_category_id FOREIGN KEY (parent_category_id) REFERENCES product_categories(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE products ADD CONSTRAINT fk_products_category_id FOREIGN KEY (category_id) REFERENCES product_categories(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE products ADD CONSTRAINT fk_products_brand_id FOREIGN KEY (brand_id) REFERENCES brands(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE skus ADD CONSTRAINT fk_skus_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE warehouses ADD CONSTRAINT fk_warehouses_manufacturer_id FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE stores ADD CONSTRAINT fk_stores_platform_id FOREIGN KEY (platform_id) REFERENCES ecommerce_platforms(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE product_suppliers ADD CONSTRAINT fk_product_suppliers_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE product_suppliers ADD CONSTRAINT fk_product_suppliers_supplier_id FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE product_manufacturers ADD CONSTRAINT fk_product_manufacturers_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE product_manufacturers ADD CONSTRAINT fk_product_manufacturers_manufacturer_id FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE purchase_orders ADD CONSTRAINT fk_purchase_orders_supplier_id FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE purchase_order_items ADD CONSTRAINT fk_purchase_order_items_purchase_order_id FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON UPDATE RESTRICT ON DELETE CASCADE;
ALTER TABLE purchase_order_items ADD CONSTRAINT fk_purchase_order_items_sku_id FOREIGN KEY (sku_id) REFERENCES skus(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE purchase_payments ADD CONSTRAINT fk_purchase_payments_purchase_order_id FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE purchase_payments ADD CONSTRAINT fk_purchase_payments_supplier_id FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE purchase_returns ADD CONSTRAINT fk_purchase_returns_supplier_id FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE purchase_returns ADD CONSTRAINT fk_purchase_returns_purchase_order_id FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE purchase_returns ADD CONSTRAINT fk_purchase_returns_source_inbound_order_id FOREIGN KEY (source_inbound_order_id) REFERENCES inbound_orders(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE purchase_returns ADD CONSTRAINT fk_purchase_returns_return_warehouse_id FOREIGN KEY (return_warehouse_id) REFERENCES warehouses(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE purchase_return_items ADD CONSTRAINT fk_purchase_return_items_purchase_return_id FOREIGN KEY (purchase_return_id) REFERENCES purchase_returns(id) ON UPDATE RESTRICT ON DELETE CASCADE;
ALTER TABLE purchase_return_items ADD CONSTRAINT fk_purchase_return_items_purchase_order_item_id FOREIGN KEY (purchase_order_item_id) REFERENCES purchase_order_items(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE purchase_return_items ADD CONSTRAINT fk_purchase_return_items_source_inbound_order_item_id FOREIGN KEY (source_inbound_order_item_id) REFERENCES inbound_order_items(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE purchase_return_items ADD CONSTRAINT fk_purchase_return_items_sku_id FOREIGN KEY (sku_id) REFERENCES skus(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production_orders ADD CONSTRAINT fk_production_orders_manufacturer_id FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production_order_items ADD CONSTRAINT fk_production_order_items_production_order_id FOREIGN KEY (production_order_id) REFERENCES production_orders(id) ON UPDATE RESTRICT ON DELETE CASCADE;
ALTER TABLE production_order_items ADD CONSTRAINT fk_production_order_items_sku_id FOREIGN KEY (sku_id) REFERENCES skus(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production_payments ADD CONSTRAINT fk_production_payments_production_order_id FOREIGN KEY (production_order_id) REFERENCES production_orders(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production_payments ADD CONSTRAINT fk_production_payments_manufacturer_id FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production_progress_records ADD CONSTRAINT fk_production_progress_records_production_order_id FOREIGN KEY (production_order_id) REFERENCES production_orders(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production_completion_records ADD CONSTRAINT fk_production_completion_records_production_order_id FOREIGN KEY (production_order_id) REFERENCES production_orders(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production_completion_records ADD CONSTRAINT fk_production_completion_records_warehouse_id FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production_completion_record_items ADD CONSTRAINT fk_production_completion_record_items_production_compl_8c1f949b FOREIGN KEY (production_completion_record_id) REFERENCES production_completion_records(id) ON UPDATE RESTRICT ON DELETE CASCADE;
ALTER TABLE production_completion_record_items ADD CONSTRAINT fk_production_completion_record_items_production_order_item_id FOREIGN KEY (production_order_item_id) REFERENCES production_order_items(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production_completion_record_items ADD CONSTRAINT fk_production_completion_record_items_sku_id FOREIGN KEY (sku_id) REFERENCES skus(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inspection_orders ADD CONSTRAINT fk_inspection_orders_purchase_order_id FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inspection_orders ADD CONSTRAINT fk_inspection_orders_production_order_id FOREIGN KEY (production_order_id) REFERENCES production_orders(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inspection_orders ADD CONSTRAINT fk_inspection_orders_inspection_warehouse_id FOREIGN KEY (inspection_warehouse_id) REFERENCES warehouses(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inspection_orders ADD CONSTRAINT fk_inspection_orders_inspector_id FOREIGN KEY (inspector_id) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inspection_order_items ADD CONSTRAINT fk_inspection_order_items_inspection_order_id FOREIGN KEY (inspection_order_id) REFERENCES inspection_orders(id) ON UPDATE RESTRICT ON DELETE CASCADE;
ALTER TABLE inspection_order_items ADD CONSTRAINT fk_inspection_order_items_sku_id FOREIGN KEY (sku_id) REFERENCES skus(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inbound_orders ADD CONSTRAINT fk_inbound_orders_warehouse_id FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inbound_orders ADD CONSTRAINT fk_inbound_orders_supplier_id FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inbound_orders ADD CONSTRAINT fk_inbound_orders_manufacturer_id FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inbound_orders ADD CONSTRAINT fk_inbound_orders_inspection_order_id FOREIGN KEY (inspection_order_id) REFERENCES inspection_orders(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inbound_order_items ADD CONSTRAINT fk_inbound_order_items_inbound_order_id FOREIGN KEY (inbound_order_id) REFERENCES inbound_orders(id) ON UPDATE RESTRICT ON DELETE CASCADE;
ALTER TABLE inbound_order_items ADD CONSTRAINT fk_inbound_order_items_inspection_order_item_id FOREIGN KEY (inspection_order_item_id) REFERENCES inspection_order_items(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inbound_order_items ADD CONSTRAINT fk_inbound_order_items_sku_id FOREIGN KEY (sku_id) REFERENCES skus(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE outbound_orders ADD CONSTRAINT fk_outbound_orders_warehouse_id FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE outbound_orders ADD CONSTRAINT fk_outbound_orders_platform_id FOREIGN KEY (platform_id) REFERENCES ecommerce_platforms(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE outbound_orders ADD CONSTRAINT fk_outbound_orders_store_id FOREIGN KEY (store_id) REFERENCES stores(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE outbound_order_items ADD CONSTRAINT fk_outbound_order_items_outbound_order_id FOREIGN KEY (outbound_order_id) REFERENCES outbound_orders(id) ON UPDATE RESTRICT ON DELETE CASCADE;
ALTER TABLE outbound_order_items ADD CONSTRAINT fk_outbound_order_items_sku_id FOREIGN KEY (sku_id) REFERENCES skus(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE sales_returns ADD CONSTRAINT fk_sales_returns_outbound_order_id FOREIGN KEY (outbound_order_id) REFERENCES outbound_orders(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE sales_returns ADD CONSTRAINT fk_sales_returns_store_id FOREIGN KEY (store_id) REFERENCES stores(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE sales_returns ADD CONSTRAINT fk_sales_returns_return_warehouse_id FOREIGN KEY (return_warehouse_id) REFERENCES warehouses(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE sales_return_items ADD CONSTRAINT fk_sales_return_items_sales_return_id FOREIGN KEY (sales_return_id) REFERENCES sales_returns(id) ON UPDATE RESTRICT ON DELETE CASCADE;
ALTER TABLE sales_return_items ADD CONSTRAINT fk_sales_return_items_outbound_order_item_id FOREIGN KEY (outbound_order_item_id) REFERENCES outbound_order_items(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE sales_return_items ADD CONSTRAINT fk_sales_return_items_sku_id FOREIGN KEY (sku_id) REFERENCES skus(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE damage_reports ADD CONSTRAINT fk_damage_reports_warehouse_id FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE damage_report_items ADD CONSTRAINT fk_damage_report_items_damage_report_id FOREIGN KEY (damage_report_id) REFERENCES damage_reports(id) ON UPDATE RESTRICT ON DELETE CASCADE;
ALTER TABLE damage_report_items ADD CONSTRAINT fk_damage_report_items_sku_id FOREIGN KEY (sku_id) REFERENCES skus(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE cross_border_shipments ADD CONSTRAINT fk_cross_border_shipments_production_order_id FOREIGN KEY (production_order_id) REFERENCES production_orders(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE cross_border_shipments ADD CONSTRAINT fk_cross_border_shipments_source_warehouse_id FOREIGN KEY (source_warehouse_id) REFERENCES warehouses(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE cross_border_shipments ADD CONSTRAINT fk_cross_border_shipments_transit_warehouse_id FOREIGN KEY (transit_warehouse_id) REFERENCES warehouses(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE cross_border_shipments ADD CONSTRAINT fk_cross_border_shipments_destination_warehouse_id FOREIGN KEY (destination_warehouse_id) REFERENCES warehouses(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE cross_border_shipment_items ADD CONSTRAINT fk_cross_border_shipment_items_cross_border_shipment_id FOREIGN KEY (cross_border_shipment_id) REFERENCES cross_border_shipments(id) ON UPDATE RESTRICT ON DELETE CASCADE;
ALTER TABLE cross_border_shipment_items ADD CONSTRAINT fk_cross_border_shipment_items_production_order_item_id FOREIGN KEY (production_order_item_id) REFERENCES production_order_items(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE cross_border_shipment_items ADD CONSTRAINT fk_cross_border_shipment_items_sku_id FOREIGN KEY (sku_id) REFERENCES skus(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE shipment_import_matches ADD CONSTRAINT fk_shipment_import_matches_cross_border_shipment_id FOREIGN KEY (cross_border_shipment_id) REFERENCES cross_border_shipments(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE shipment_import_matches ADD CONSTRAINT fk_shipment_import_matches_cross_border_shipment_item_id FOREIGN KEY (cross_border_shipment_item_id) REFERENCES cross_border_shipment_items(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE shipment_import_matches ADD CONSTRAINT fk_shipment_import_matches_import_task_id FOREIGN KEY (import_task_id) REFERENCES import_tasks(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE shipment_import_matches ADD CONSTRAINT fk_shipment_import_matches_import_task_item_id FOREIGN KEY (import_task_item_id) REFERENCES import_task_items(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE shipment_import_matches ADD CONSTRAINT fk_shipment_import_matches_matched_by FOREIGN KEY (matched_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inventories ADD CONSTRAINT fk_inventories_sku_id FOREIGN KEY (sku_id) REFERENCES skus(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inventories ADD CONSTRAINT fk_inventories_warehouse_id FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inventory_transactions ADD CONSTRAINT fk_inventory_transactions_sku_id FOREIGN KEY (sku_id) REFERENCES skus(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inventory_transactions ADD CONSTRAINT fk_inventory_transactions_warehouse_id FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inventory_transactions ADD CONSTRAINT fk_inventory_transactions_related_transaction_id FOREIGN KEY (related_transaction_id) REFERENCES inventory_transactions(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inventory_transactions ADD CONSTRAINT fk_inventory_transactions_operator_id FOREIGN KEY (operator_id) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE transfer_orders ADD CONSTRAINT fk_transfer_orders_source_warehouse_id FOREIGN KEY (source_warehouse_id) REFERENCES warehouses(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE transfer_orders ADD CONSTRAINT fk_transfer_orders_transit_warehouse_id FOREIGN KEY (transit_warehouse_id) REFERENCES warehouses(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE transfer_orders ADD CONSTRAINT fk_transfer_orders_destination_warehouse_id FOREIGN KEY (destination_warehouse_id) REFERENCES warehouses(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE transfer_order_items ADD CONSTRAINT fk_transfer_order_items_transfer_order_id FOREIGN KEY (transfer_order_id) REFERENCES transfer_orders(id) ON UPDATE RESTRICT ON DELETE CASCADE;
ALTER TABLE transfer_order_items ADD CONSTRAINT fk_transfer_order_items_sku_id FOREIGN KEY (sku_id) REFERENCES skus(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE stock_counts ADD CONSTRAINT fk_stock_counts_warehouse_id FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE stock_count_items ADD CONSTRAINT fk_stock_count_items_stock_count_id FOREIGN KEY (stock_count_id) REFERENCES stock_counts(id) ON UPDATE RESTRICT ON DELETE CASCADE;
ALTER TABLE stock_count_items ADD CONSTRAINT fk_stock_count_items_sku_id FOREIGN KEY (sku_id) REFERENCES skus(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inventory_adjustments ADD CONSTRAINT fk_inventory_adjustments_warehouse_id FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inventory_adjustments ADD CONSTRAINT fk_inventory_adjustments_stock_count_id FOREIGN KEY (stock_count_id) REFERENCES stock_counts(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inventory_adjustment_items ADD CONSTRAINT fk_inventory_adjustment_items_inventory_adjustment_id FOREIGN KEY (inventory_adjustment_id) REFERENCES inventory_adjustments(id) ON UPDATE RESTRICT ON DELETE CASCADE;
ALTER TABLE inventory_adjustment_items ADD CONSTRAINT fk_inventory_adjustment_items_stock_count_item_id FOREIGN KEY (stock_count_item_id) REFERENCES stock_count_items(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inventory_adjustment_items ADD CONSTRAINT fk_inventory_adjustment_items_sku_id FOREIGN KEY (sku_id) REFERENCES skus(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inventory_alerts ADD CONSTRAINT fk_inventory_alerts_sku_id FOREIGN KEY (sku_id) REFERENCES skus(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inventory_alerts ADD CONSTRAINT fk_inventory_alerts_warehouse_id FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inventory_alerts ADD CONSTRAINT fk_inventory_alerts_viewed_by FOREIGN KEY (viewed_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inventory_alerts ADD CONSTRAINT fk_inventory_alerts_handled_by FOREIGN KEY (handled_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inventory_alerts ADD CONSTRAINT fk_inventory_alerts_closed_by FOREIGN KEY (closed_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE import_tasks ADD CONSTRAINT fk_import_tasks_warehouse_id FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE import_tasks ADD CONSTRAINT fk_import_tasks_store_id FOREIGN KEY (store_id) REFERENCES stores(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE import_task_items ADD CONSTRAINT fk_import_task_items_import_task_id FOREIGN KEY (import_task_id) REFERENCES import_tasks(id) ON UPDATE RESTRICT ON DELETE CASCADE;
ALTER TABLE import_task_items ADD CONSTRAINT fk_import_task_items_matched_sku_id FOREIGN KEY (matched_sku_id) REFERENCES skus(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE import_task_items ADD CONSTRAINT fk_import_task_items_matched_warehouse_id FOREIGN KEY (matched_warehouse_id) REFERENCES warehouses(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE user_roles ADD CONSTRAINT fk_user_roles_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE CASCADE;
ALTER TABLE user_roles ADD CONSTRAINT fk_user_roles_role_id FOREIGN KEY (role_id) REFERENCES roles(id) ON UPDATE RESTRICT ON DELETE CASCADE;
ALTER TABLE user_roles ADD CONSTRAINT fk_user_roles_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE role_permissions ADD CONSTRAINT fk_role_permissions_role_id FOREIGN KEY (role_id) REFERENCES roles(id) ON UPDATE RESTRICT ON DELETE CASCADE;
ALTER TABLE role_permissions ADD CONSTRAINT fk_role_permissions_permission_id FOREIGN KEY (permission_id) REFERENCES permissions(id) ON UPDATE RESTRICT ON DELETE CASCADE;
ALTER TABLE role_permissions ADD CONSTRAINT fk_role_permissions_granted_by FOREIGN KEY (granted_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE role_warehouses ADD CONSTRAINT fk_role_warehouses_role_id FOREIGN KEY (role_id) REFERENCES roles(id) ON UPDATE RESTRICT ON DELETE CASCADE;
ALTER TABLE role_warehouses ADD CONSTRAINT fk_role_warehouses_warehouse_id FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE role_warehouses ADD CONSTRAINT fk_role_warehouses_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE role_stores ADD CONSTRAINT fk_role_stores_role_id FOREIGN KEY (role_id) REFERENCES roles(id) ON UPDATE RESTRICT ON DELETE CASCADE;
ALTER TABLE role_stores ADD CONSTRAINT fk_role_stores_store_id FOREIGN KEY (store_id) REFERENCES stores(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE role_stores ADD CONSTRAINT fk_role_stores_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE backup_tasks ADD CONSTRAINT fk_backup_tasks_triggered_by FOREIGN KEY (triggered_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE attachments ADD CONSTRAINT fk_attachments_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE attachment_links ADD CONSTRAINT fk_attachment_links_attachment_id FOREIGN KEY (attachment_id) REFERENCES attachments(id) ON UPDATE RESTRICT ON DELETE CASCADE;
ALTER TABLE attachment_links ADD CONSTRAINT fk_attachment_links_linked_by FOREIGN KEY (linked_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE audit_logs ADD CONSTRAINT fk_audit_logs_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE document_status_histories ADD CONSTRAINT fk_document_status_histories_changed_by FOREIGN KEY (changed_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE approval_records ADD CONSTRAINT fk_approval_records_approver_id FOREIGN KEY (approver_id) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE approval_records ADD CONSTRAINT fk_approval_records_previous_approval_record_id FOREIGN KEY (previous_approval_record_id) REFERENCES approval_records(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE product_categories ADD CONSTRAINT fk_product_categories_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE product_categories ADD CONSTRAINT fk_product_categories_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE product_categories ADD CONSTRAINT fk_product_categories_disabled_by FOREIGN KEY (disabled_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE brands ADD CONSTRAINT fk_brands_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE brands ADD CONSTRAINT fk_brands_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE brands ADD CONSTRAINT fk_brands_disabled_by FOREIGN KEY (disabled_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE products ADD CONSTRAINT fk_products_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE products ADD CONSTRAINT fk_products_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE products ADD CONSTRAINT fk_products_disabled_by FOREIGN KEY (disabled_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE skus ADD CONSTRAINT fk_skus_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE skus ADD CONSTRAINT fk_skus_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE skus ADD CONSTRAINT fk_skus_disabled_by FOREIGN KEY (disabled_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE suppliers ADD CONSTRAINT fk_suppliers_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE suppliers ADD CONSTRAINT fk_suppliers_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE suppliers ADD CONSTRAINT fk_suppliers_disabled_by FOREIGN KEY (disabled_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE manufacturers ADD CONSTRAINT fk_manufacturers_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE manufacturers ADD CONSTRAINT fk_manufacturers_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE manufacturers ADD CONSTRAINT fk_manufacturers_disabled_by FOREIGN KEY (disabled_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE warehouses ADD CONSTRAINT fk_warehouses_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE warehouses ADD CONSTRAINT fk_warehouses_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE warehouses ADD CONSTRAINT fk_warehouses_disabled_by FOREIGN KEY (disabled_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ecommerce_platforms ADD CONSTRAINT fk_ecommerce_platforms_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ecommerce_platforms ADD CONSTRAINT fk_ecommerce_platforms_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ecommerce_platforms ADD CONSTRAINT fk_ecommerce_platforms_disabled_by FOREIGN KEY (disabled_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE stores ADD CONSTRAINT fk_stores_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE stores ADD CONSTRAINT fk_stores_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE stores ADD CONSTRAINT fk_stores_disabled_by FOREIGN KEY (disabled_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE product_suppliers ADD CONSTRAINT fk_product_suppliers_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE product_suppliers ADD CONSTRAINT fk_product_suppliers_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE product_suppliers ADD CONSTRAINT fk_product_suppliers_disabled_by FOREIGN KEY (disabled_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE product_manufacturers ADD CONSTRAINT fk_product_manufacturers_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE product_manufacturers ADD CONSTRAINT fk_product_manufacturers_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE product_manufacturers ADD CONSTRAINT fk_product_manufacturers_disabled_by FOREIGN KEY (disabled_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE purchase_orders ADD CONSTRAINT fk_purchase_orders_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE purchase_orders ADD CONSTRAINT fk_purchase_orders_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE purchase_orders ADD CONSTRAINT fk_purchase_orders_submitted_by FOREIGN KEY (submitted_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE purchase_orders ADD CONSTRAINT fk_purchase_orders_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE purchase_orders ADD CONSTRAINT fk_purchase_orders_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE purchase_order_items ADD CONSTRAINT fk_purchase_order_items_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE purchase_order_items ADD CONSTRAINT fk_purchase_order_items_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE purchase_payments ADD CONSTRAINT fk_purchase_payments_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE purchase_payments ADD CONSTRAINT fk_purchase_payments_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE purchase_returns ADD CONSTRAINT fk_purchase_returns_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE purchase_returns ADD CONSTRAINT fk_purchase_returns_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE purchase_returns ADD CONSTRAINT fk_purchase_returns_submitted_by FOREIGN KEY (submitted_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE purchase_returns ADD CONSTRAINT fk_purchase_returns_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE purchase_returns ADD CONSTRAINT fk_purchase_returns_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE purchase_return_items ADD CONSTRAINT fk_purchase_return_items_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE purchase_return_items ADD CONSTRAINT fk_purchase_return_items_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production_orders ADD CONSTRAINT fk_production_orders_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production_orders ADD CONSTRAINT fk_production_orders_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production_orders ADD CONSTRAINT fk_production_orders_submitted_by FOREIGN KEY (submitted_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production_orders ADD CONSTRAINT fk_production_orders_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production_orders ADD CONSTRAINT fk_production_orders_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production_order_items ADD CONSTRAINT fk_production_order_items_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production_order_items ADD CONSTRAINT fk_production_order_items_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production_payments ADD CONSTRAINT fk_production_payments_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production_payments ADD CONSTRAINT fk_production_payments_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production_progress_records ADD CONSTRAINT fk_production_progress_records_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production_progress_records ADD CONSTRAINT fk_production_progress_records_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production_completion_records ADD CONSTRAINT fk_production_completion_records_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production_completion_records ADD CONSTRAINT fk_production_completion_records_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production_completion_record_items ADD CONSTRAINT fk_production_completion_record_items_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production_completion_record_items ADD CONSTRAINT fk_production_completion_record_items_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inspection_orders ADD CONSTRAINT fk_inspection_orders_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inspection_orders ADD CONSTRAINT fk_inspection_orders_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inspection_orders ADD CONSTRAINT fk_inspection_orders_submitted_by FOREIGN KEY (submitted_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inspection_orders ADD CONSTRAINT fk_inspection_orders_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inspection_orders ADD CONSTRAINT fk_inspection_orders_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inspection_order_items ADD CONSTRAINT fk_inspection_order_items_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inspection_order_items ADD CONSTRAINT fk_inspection_order_items_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inbound_orders ADD CONSTRAINT fk_inbound_orders_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inbound_orders ADD CONSTRAINT fk_inbound_orders_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inbound_orders ADD CONSTRAINT fk_inbound_orders_submitted_by FOREIGN KEY (submitted_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inbound_orders ADD CONSTRAINT fk_inbound_orders_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inbound_orders ADD CONSTRAINT fk_inbound_orders_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inbound_order_items ADD CONSTRAINT fk_inbound_order_items_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inbound_order_items ADD CONSTRAINT fk_inbound_order_items_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE outbound_orders ADD CONSTRAINT fk_outbound_orders_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE outbound_orders ADD CONSTRAINT fk_outbound_orders_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE outbound_orders ADD CONSTRAINT fk_outbound_orders_submitted_by FOREIGN KEY (submitted_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE outbound_orders ADD CONSTRAINT fk_outbound_orders_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE outbound_orders ADD CONSTRAINT fk_outbound_orders_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE outbound_order_items ADD CONSTRAINT fk_outbound_order_items_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE outbound_order_items ADD CONSTRAINT fk_outbound_order_items_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE sales_returns ADD CONSTRAINT fk_sales_returns_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE sales_returns ADD CONSTRAINT fk_sales_returns_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE sales_returns ADD CONSTRAINT fk_sales_returns_submitted_by FOREIGN KEY (submitted_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE sales_returns ADD CONSTRAINT fk_sales_returns_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE sales_returns ADD CONSTRAINT fk_sales_returns_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE sales_return_items ADD CONSTRAINT fk_sales_return_items_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE sales_return_items ADD CONSTRAINT fk_sales_return_items_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE damage_reports ADD CONSTRAINT fk_damage_reports_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE damage_reports ADD CONSTRAINT fk_damage_reports_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE damage_reports ADD CONSTRAINT fk_damage_reports_submitted_by FOREIGN KEY (submitted_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE damage_reports ADD CONSTRAINT fk_damage_reports_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE damage_reports ADD CONSTRAINT fk_damage_reports_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE damage_report_items ADD CONSTRAINT fk_damage_report_items_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE damage_report_items ADD CONSTRAINT fk_damage_report_items_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE cross_border_shipments ADD CONSTRAINT fk_cross_border_shipments_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE cross_border_shipments ADD CONSTRAINT fk_cross_border_shipments_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE cross_border_shipments ADD CONSTRAINT fk_cross_border_shipments_submitted_by FOREIGN KEY (submitted_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE cross_border_shipments ADD CONSTRAINT fk_cross_border_shipments_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE cross_border_shipments ADD CONSTRAINT fk_cross_border_shipments_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE cross_border_shipment_items ADD CONSTRAINT fk_cross_border_shipment_items_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE cross_border_shipment_items ADD CONSTRAINT fk_cross_border_shipment_items_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE shipment_import_matches ADD CONSTRAINT fk_shipment_import_matches_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE shipment_import_matches ADD CONSTRAINT fk_shipment_import_matches_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inventories ADD CONSTRAINT fk_inventories_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inventories ADD CONSTRAINT fk_inventories_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE transfer_orders ADD CONSTRAINT fk_transfer_orders_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE transfer_orders ADD CONSTRAINT fk_transfer_orders_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE transfer_orders ADD CONSTRAINT fk_transfer_orders_submitted_by FOREIGN KEY (submitted_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE transfer_orders ADD CONSTRAINT fk_transfer_orders_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE transfer_orders ADD CONSTRAINT fk_transfer_orders_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE transfer_order_items ADD CONSTRAINT fk_transfer_order_items_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE transfer_order_items ADD CONSTRAINT fk_transfer_order_items_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE stock_counts ADD CONSTRAINT fk_stock_counts_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE stock_counts ADD CONSTRAINT fk_stock_counts_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE stock_counts ADD CONSTRAINT fk_stock_counts_submitted_by FOREIGN KEY (submitted_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE stock_counts ADD CONSTRAINT fk_stock_counts_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE stock_counts ADD CONSTRAINT fk_stock_counts_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE stock_count_items ADD CONSTRAINT fk_stock_count_items_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE stock_count_items ADD CONSTRAINT fk_stock_count_items_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inventory_adjustments ADD CONSTRAINT fk_inventory_adjustments_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inventory_adjustments ADD CONSTRAINT fk_inventory_adjustments_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inventory_adjustments ADD CONSTRAINT fk_inventory_adjustments_submitted_by FOREIGN KEY (submitted_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inventory_adjustments ADD CONSTRAINT fk_inventory_adjustments_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inventory_adjustments ADD CONSTRAINT fk_inventory_adjustments_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inventory_adjustment_items ADD CONSTRAINT fk_inventory_adjustment_items_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inventory_adjustment_items ADD CONSTRAINT fk_inventory_adjustment_items_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inventory_alerts ADD CONSTRAINT fk_inventory_alerts_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inventory_alerts ADD CONSTRAINT fk_inventory_alerts_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE import_tasks ADD CONSTRAINT fk_import_tasks_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE import_tasks ADD CONSTRAINT fk_import_tasks_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE import_task_items ADD CONSTRAINT fk_import_task_items_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE import_task_items ADD CONSTRAINT fk_import_task_items_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE users ADD CONSTRAINT fk_users_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE users ADD CONSTRAINT fk_users_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE users ADD CONSTRAINT fk_users_disabled_by FOREIGN KEY (disabled_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE roles ADD CONSTRAINT fk_roles_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE roles ADD CONSTRAINT fk_roles_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE roles ADD CONSTRAINT fk_roles_disabled_by FOREIGN KEY (disabled_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE permissions ADD CONSTRAINT fk_permissions_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE permissions ADD CONSTRAINT fk_permissions_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE permissions ADD CONSTRAINT fk_permissions_disabled_by FOREIGN KEY (disabled_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE user_roles ADD CONSTRAINT fk_user_roles_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE user_roles ADD CONSTRAINT fk_user_roles_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE role_permissions ADD CONSTRAINT fk_role_permissions_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE role_permissions ADD CONSTRAINT fk_role_permissions_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE role_warehouses ADD CONSTRAINT fk_role_warehouses_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE role_warehouses ADD CONSTRAINT fk_role_warehouses_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE role_stores ADD CONSTRAINT fk_role_stores_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE role_stores ADD CONSTRAINT fk_role_stores_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE system_settings ADD CONSTRAINT fk_system_settings_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE system_settings ADD CONSTRAINT fk_system_settings_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE system_settings ADD CONSTRAINT fk_system_settings_disabled_by FOREIGN KEY (disabled_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE attachments ADD CONSTRAINT fk_attachments_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE attachments ADD CONSTRAINT fk_attachments_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE attachment_links ADD CONSTRAINT fk_attachment_links_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE attachment_links ADD CONSTRAINT fk_attachment_links_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE purchase_order_items ADD CONSTRAINT ck_purchase_order_items_line_no_range CHECK (line_no >= 1);
ALTER TABLE purchase_return_items ADD CONSTRAINT ck_purchase_return_items_line_no_range CHECK (line_no >= 1);
ALTER TABLE production_order_items ADD CONSTRAINT ck_production_order_items_line_no_range CHECK (line_no >= 1);
ALTER TABLE production_completion_record_items ADD CONSTRAINT ck_production_completion_record_items_line_no_range CHECK (line_no >= 1);
ALTER TABLE inspection_order_items ADD CONSTRAINT ck_inspection_order_items_line_no_range CHECK (line_no >= 1);
ALTER TABLE inbound_order_items ADD CONSTRAINT ck_inbound_order_items_line_no_range CHECK (line_no >= 1);
ALTER TABLE outbound_order_items ADD CONSTRAINT ck_outbound_order_items_line_no_range CHECK (line_no >= 1);
ALTER TABLE sales_return_items ADD CONSTRAINT ck_sales_return_items_line_no_range CHECK (line_no >= 1);
ALTER TABLE damage_report_items ADD CONSTRAINT ck_damage_report_items_line_no_range CHECK (line_no >= 1);
ALTER TABLE cross_border_shipment_items ADD CONSTRAINT ck_cross_border_shipment_items_line_no_range CHECK (line_no >= 1);
ALTER TABLE transfer_order_items ADD CONSTRAINT ck_transfer_order_items_line_no_range CHECK (line_no >= 1);
ALTER TABLE stock_count_items ADD CONSTRAINT ck_stock_count_items_line_no_range CHECK (line_no >= 1);
ALTER TABLE inventory_adjustment_items ADD CONSTRAINT ck_inventory_adjustment_items_line_no_range CHECK (line_no >= 1);
ALTER TABLE purchase_order_items ADD CONSTRAINT ck_purchase_order_items_quantity_positive CHECK (quantity > 0);
ALTER TABLE purchase_return_items ADD CONSTRAINT ck_purchase_return_items_quantity_positive CHECK (quantity > 0);
ALTER TABLE production_order_items ADD CONSTRAINT ck_production_order_items_quantity_positive CHECK (quantity > 0);
ALTER TABLE inspection_order_items ADD CONSTRAINT ck_inspection_order_items_quantity_positive CHECK (quantity > 0);
ALTER TABLE inbound_order_items ADD CONSTRAINT ck_inbound_order_items_quantity_positive CHECK (quantity > 0);
ALTER TABLE outbound_order_items ADD CONSTRAINT ck_outbound_order_items_quantity_positive CHECK (quantity > 0);
ALTER TABLE sales_return_items ADD CONSTRAINT ck_sales_return_items_quantity_positive CHECK (quantity > 0);
ALTER TABLE damage_report_items ADD CONSTRAINT ck_damage_report_items_quantity_positive CHECK (quantity > 0);
ALTER TABLE cross_border_shipment_items ADD CONSTRAINT ck_cross_border_shipment_items_quantity_positive CHECK (quantity > 0);
ALTER TABLE transfer_order_items ADD CONSTRAINT ck_transfer_order_items_quantity_positive CHECK (quantity > 0);
ALTER TABLE stock_count_items ADD CONSTRAINT ck_stock_count_items_quantity_positive CHECK (quantity > 0);
ALTER TABLE inventory_adjustment_items ADD CONSTRAINT ck_inventory_adjustment_items_quantity_positive CHECK (quantity > 0);
ALTER TABLE purchase_orders ADD CONSTRAINT ck_purchase_orders_version_no_range CHECK (version_no >= 1);
ALTER TABLE purchase_returns ADD CONSTRAINT ck_purchase_returns_version_no_range CHECK (version_no >= 1);
ALTER TABLE production_orders ADD CONSTRAINT ck_production_orders_version_no_range CHECK (version_no >= 1);
ALTER TABLE inspection_orders ADD CONSTRAINT ck_inspection_orders_version_no_range CHECK (version_no >= 1);
ALTER TABLE inbound_orders ADD CONSTRAINT ck_inbound_orders_version_no_range CHECK (version_no >= 1);
ALTER TABLE outbound_orders ADD CONSTRAINT ck_outbound_orders_version_no_range CHECK (version_no >= 1);
ALTER TABLE sales_returns ADD CONSTRAINT ck_sales_returns_version_no_range CHECK (version_no >= 1);
ALTER TABLE damage_reports ADD CONSTRAINT ck_damage_reports_version_no_range CHECK (version_no >= 1);
ALTER TABLE cross_border_shipments ADD CONSTRAINT ck_cross_border_shipments_version_no_range CHECK (version_no >= 1);
ALTER TABLE transfer_orders ADD CONSTRAINT ck_transfer_orders_version_no_range CHECK (version_no >= 1);
ALTER TABLE stock_counts ADD CONSTRAINT ck_stock_counts_version_no_range CHECK (version_no >= 1);
ALTER TABLE inventory_adjustments ADD CONSTRAINT ck_inventory_adjustments_version_no_range CHECK (version_no >= 1);
ALTER TABLE product_categories ADD CONSTRAINT ck_product_categories_category_level_range CHECK (category_level >= 1);
ALTER TABLE product_categories ADD CONSTRAINT ck_product_categories_sort_order_range CHECK (sort_order >= 0);
ALTER TABLE warehouses ADD CONSTRAINT ck_warehouses_sort_order_range CHECK (sort_order >= 0);
ALTER TABLE attachment_links ADD CONSTRAINT ck_attachment_links_sort_order_range CHECK (sort_order >= 0);
ALTER TABLE import_task_items ADD CONSTRAINT ck_import_task_items_row_no_range CHECK (row_no >= 1);
ALTER TABLE product_suppliers ADD CONSTRAINT ck_product_suppliers_lead_time_days_range CHECK (lead_time_days IS NULL OR lead_time_days >= 0);
ALTER TABLE product_manufacturers ADD CONSTRAINT ck_product_manufacturers_lead_time_days_range CHECK (lead_time_days IS NULL OR lead_time_days >= 0);
ALTER TABLE product_suppliers ADD CONSTRAINT ck_product_suppliers_effective_date_range CHECK (effective_to IS NULL OR effective_to >= effective_from);
ALTER TABLE product_manufacturers ADD CONSTRAINT ck_product_manufacturers_effective_date_range CHECK (effective_to IS NULL OR effective_to >= effective_from);
ALTER TABLE product_categories ADD CONSTRAINT ck_product_categories_active_fields CHECK ((is_active AND disabled_at IS NULL AND disabled_by IS NULL) OR (NOT is_active AND disabled_at IS NOT NULL AND disabled_by IS NOT NULL AND disabled_at >= created_at));
ALTER TABLE brands ADD CONSTRAINT ck_brands_active_fields CHECK ((is_active AND disabled_at IS NULL AND disabled_by IS NULL) OR (NOT is_active AND disabled_at IS NOT NULL AND disabled_by IS NOT NULL AND disabled_at >= created_at));
ALTER TABLE products ADD CONSTRAINT ck_products_active_fields CHECK ((is_active AND disabled_at IS NULL AND disabled_by IS NULL) OR (NOT is_active AND disabled_at IS NOT NULL AND disabled_by IS NOT NULL AND disabled_at >= created_at));
ALTER TABLE skus ADD CONSTRAINT ck_skus_active_fields CHECK ((is_active AND disabled_at IS NULL AND disabled_by IS NULL) OR (NOT is_active AND disabled_at IS NOT NULL AND disabled_by IS NOT NULL AND disabled_at >= created_at));
ALTER TABLE suppliers ADD CONSTRAINT ck_suppliers_active_fields CHECK ((is_active AND disabled_at IS NULL AND disabled_by IS NULL) OR (NOT is_active AND disabled_at IS NOT NULL AND disabled_by IS NOT NULL AND disabled_at >= created_at));
ALTER TABLE manufacturers ADD CONSTRAINT ck_manufacturers_active_fields CHECK ((is_active AND disabled_at IS NULL AND disabled_by IS NULL) OR (NOT is_active AND disabled_at IS NOT NULL AND disabled_by IS NOT NULL AND disabled_at >= created_at));
ALTER TABLE warehouses ADD CONSTRAINT ck_warehouses_active_fields CHECK ((is_active AND disabled_at IS NULL AND disabled_by IS NULL) OR (NOT is_active AND disabled_at IS NOT NULL AND disabled_by IS NOT NULL AND disabled_at >= created_at));
ALTER TABLE ecommerce_platforms ADD CONSTRAINT ck_ecommerce_platforms_active_fields CHECK ((is_active AND disabled_at IS NULL AND disabled_by IS NULL) OR (NOT is_active AND disabled_at IS NOT NULL AND disabled_by IS NOT NULL AND disabled_at >= created_at));
ALTER TABLE stores ADD CONSTRAINT ck_stores_active_fields CHECK ((is_active AND disabled_at IS NULL AND disabled_by IS NULL) OR (NOT is_active AND disabled_at IS NOT NULL AND disabled_by IS NOT NULL AND disabled_at >= created_at));
ALTER TABLE product_suppliers ADD CONSTRAINT ck_product_suppliers_active_fields CHECK ((is_active AND disabled_at IS NULL AND disabled_by IS NULL) OR (NOT is_active AND disabled_at IS NOT NULL AND disabled_by IS NOT NULL AND disabled_at >= created_at));
ALTER TABLE product_manufacturers ADD CONSTRAINT ck_product_manufacturers_active_fields CHECK ((is_active AND disabled_at IS NULL AND disabled_by IS NULL) OR (NOT is_active AND disabled_at IS NOT NULL AND disabled_by IS NOT NULL AND disabled_at >= created_at));
ALTER TABLE users ADD CONSTRAINT ck_users_active_fields CHECK ((is_active AND disabled_at IS NULL AND disabled_by IS NULL) OR (NOT is_active AND disabled_at IS NOT NULL AND disabled_by IS NOT NULL AND disabled_at >= created_at));
ALTER TABLE roles ADD CONSTRAINT ck_roles_active_fields CHECK ((is_active AND disabled_at IS NULL AND disabled_by IS NULL) OR (NOT is_active AND disabled_at IS NOT NULL AND disabled_by IS NOT NULL AND disabled_at >= created_at));
ALTER TABLE permissions ADD CONSTRAINT ck_permissions_active_fields CHECK ((is_active AND disabled_at IS NULL AND disabled_by IS NULL) OR (NOT is_active AND disabled_at IS NOT NULL AND disabled_by IS NOT NULL AND disabled_at >= created_at));
ALTER TABLE system_settings ADD CONSTRAINT ck_system_settings_active_fields CHECK ((is_active AND disabled_at IS NULL AND disabled_by IS NULL) OR (NOT is_active AND disabled_at IS NOT NULL AND disabled_by IS NOT NULL AND disabled_at >= created_at));
ALTER TABLE purchase_orders ADD CONSTRAINT ck_purchase_orders_action_fields CHECK (((submitted_at IS NULL AND submitted_by IS NULL) OR (submitted_at IS NOT NULL AND submitted_by IS NOT NULL AND submitted_at >= created_at)) AND ((approved_at IS NULL AND approved_by IS NULL) OR (approved_at IS NOT NULL AND approved_by IS NOT NULL AND submitted_at IS NOT NULL AND approved_at >= submitted_at)) AND ((cancelled_at IS NULL AND cancelled_by IS NULL AND cancel_reason IS NULL) OR (cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL AND cancel_reason IS NOT NULL AND cancelled_at >= created_at)));
ALTER TABLE purchase_returns ADD CONSTRAINT ck_purchase_returns_action_fields CHECK (((submitted_at IS NULL AND submitted_by IS NULL) OR (submitted_at IS NOT NULL AND submitted_by IS NOT NULL AND submitted_at >= created_at)) AND ((approved_at IS NULL AND approved_by IS NULL) OR (approved_at IS NOT NULL AND approved_by IS NOT NULL AND submitted_at IS NOT NULL AND approved_at >= submitted_at)) AND ((cancelled_at IS NULL AND cancelled_by IS NULL AND cancel_reason IS NULL) OR (cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL AND cancel_reason IS NOT NULL AND cancelled_at >= created_at)));
ALTER TABLE production_orders ADD CONSTRAINT ck_production_orders_action_fields CHECK (((submitted_at IS NULL AND submitted_by IS NULL) OR (submitted_at IS NOT NULL AND submitted_by IS NOT NULL AND submitted_at >= created_at)) AND ((approved_at IS NULL AND approved_by IS NULL) OR (approved_at IS NOT NULL AND approved_by IS NOT NULL AND submitted_at IS NOT NULL AND approved_at >= submitted_at)) AND ((cancelled_at IS NULL AND cancelled_by IS NULL AND cancel_reason IS NULL) OR (cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL AND cancel_reason IS NOT NULL AND cancelled_at >= created_at)));
ALTER TABLE inspection_orders ADD CONSTRAINT ck_inspection_orders_action_fields CHECK (((submitted_at IS NULL AND submitted_by IS NULL) OR (submitted_at IS NOT NULL AND submitted_by IS NOT NULL AND submitted_at >= created_at)) AND ((approved_at IS NULL AND approved_by IS NULL) OR (approved_at IS NOT NULL AND approved_by IS NOT NULL AND submitted_at IS NOT NULL AND approved_at >= submitted_at)) AND ((cancelled_at IS NULL AND cancelled_by IS NULL AND cancel_reason IS NULL) OR (cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL AND cancel_reason IS NOT NULL AND cancelled_at >= created_at)));
ALTER TABLE inbound_orders ADD CONSTRAINT ck_inbound_orders_action_fields CHECK (((submitted_at IS NULL AND submitted_by IS NULL) OR (submitted_at IS NOT NULL AND submitted_by IS NOT NULL AND submitted_at >= created_at)) AND ((approved_at IS NULL AND approved_by IS NULL) OR (approved_at IS NOT NULL AND approved_by IS NOT NULL AND submitted_at IS NOT NULL AND approved_at >= submitted_at)) AND ((cancelled_at IS NULL AND cancelled_by IS NULL AND cancel_reason IS NULL) OR (cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL AND cancel_reason IS NOT NULL AND cancelled_at >= created_at)));
ALTER TABLE outbound_orders ADD CONSTRAINT ck_outbound_orders_action_fields CHECK (((submitted_at IS NULL AND submitted_by IS NULL) OR (submitted_at IS NOT NULL AND submitted_by IS NOT NULL AND submitted_at >= created_at)) AND ((approved_at IS NULL AND approved_by IS NULL) OR (approved_at IS NOT NULL AND approved_by IS NOT NULL AND submitted_at IS NOT NULL AND approved_at >= submitted_at)) AND ((cancelled_at IS NULL AND cancelled_by IS NULL AND cancel_reason IS NULL) OR (cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL AND cancel_reason IS NOT NULL AND cancelled_at >= created_at)));
ALTER TABLE sales_returns ADD CONSTRAINT ck_sales_returns_action_fields CHECK (((submitted_at IS NULL AND submitted_by IS NULL) OR (submitted_at IS NOT NULL AND submitted_by IS NOT NULL AND submitted_at >= created_at)) AND ((approved_at IS NULL AND approved_by IS NULL) OR (approved_at IS NOT NULL AND approved_by IS NOT NULL AND submitted_at IS NOT NULL AND approved_at >= submitted_at)) AND ((cancelled_at IS NULL AND cancelled_by IS NULL AND cancel_reason IS NULL) OR (cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL AND cancel_reason IS NOT NULL AND cancelled_at >= created_at)));
ALTER TABLE damage_reports ADD CONSTRAINT ck_damage_reports_action_fields CHECK (((submitted_at IS NULL AND submitted_by IS NULL) OR (submitted_at IS NOT NULL AND submitted_by IS NOT NULL AND submitted_at >= created_at)) AND ((approved_at IS NULL AND approved_by IS NULL) OR (approved_at IS NOT NULL AND approved_by IS NOT NULL AND submitted_at IS NOT NULL AND approved_at >= submitted_at)) AND ((cancelled_at IS NULL AND cancelled_by IS NULL AND cancel_reason IS NULL) OR (cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL AND cancel_reason IS NOT NULL AND cancelled_at >= created_at)));
ALTER TABLE cross_border_shipments ADD CONSTRAINT ck_cross_border_shipments_action_fields CHECK (((submitted_at IS NULL AND submitted_by IS NULL) OR (submitted_at IS NOT NULL AND submitted_by IS NOT NULL AND submitted_at >= created_at)) AND ((approved_at IS NULL AND approved_by IS NULL) OR (approved_at IS NOT NULL AND approved_by IS NOT NULL AND submitted_at IS NOT NULL AND approved_at >= submitted_at)) AND ((cancelled_at IS NULL AND cancelled_by IS NULL AND cancel_reason IS NULL) OR (cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL AND cancel_reason IS NOT NULL AND cancelled_at >= created_at)));
ALTER TABLE transfer_orders ADD CONSTRAINT ck_transfer_orders_action_fields CHECK (((submitted_at IS NULL AND submitted_by IS NULL) OR (submitted_at IS NOT NULL AND submitted_by IS NOT NULL AND submitted_at >= created_at)) AND ((approved_at IS NULL AND approved_by IS NULL) OR (approved_at IS NOT NULL AND approved_by IS NOT NULL AND submitted_at IS NOT NULL AND approved_at >= submitted_at)) AND ((cancelled_at IS NULL AND cancelled_by IS NULL AND cancel_reason IS NULL) OR (cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL AND cancel_reason IS NOT NULL AND cancelled_at >= created_at)));
ALTER TABLE stock_counts ADD CONSTRAINT ck_stock_counts_action_fields CHECK (((submitted_at IS NULL AND submitted_by IS NULL) OR (submitted_at IS NOT NULL AND submitted_by IS NOT NULL AND submitted_at >= created_at)) AND ((approved_at IS NULL AND approved_by IS NULL) OR (approved_at IS NOT NULL AND approved_by IS NOT NULL AND submitted_at IS NOT NULL AND approved_at >= submitted_at)) AND ((cancelled_at IS NULL AND cancelled_by IS NULL AND cancel_reason IS NULL) OR (cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL AND cancel_reason IS NOT NULL AND cancelled_at >= created_at)));
ALTER TABLE inventory_adjustments ADD CONSTRAINT ck_inventory_adjustments_action_fields CHECK (((submitted_at IS NULL AND submitted_by IS NULL) OR (submitted_at IS NOT NULL AND submitted_by IS NOT NULL AND submitted_at >= created_at)) AND ((approved_at IS NULL AND approved_by IS NULL) OR (approved_at IS NOT NULL AND approved_by IS NOT NULL AND submitted_at IS NOT NULL AND approved_at >= submitted_at)) AND ((cancelled_at IS NULL AND cancelled_by IS NULL AND cancel_reason IS NULL) OR (cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL AND cancel_reason IS NOT NULL AND cancelled_at >= created_at)));
ALTER TABLE product_categories ADD CONSTRAINT ck_product_categories_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE brands ADD CONSTRAINT ck_brands_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE products ADD CONSTRAINT ck_products_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE skus ADD CONSTRAINT ck_skus_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE suppliers ADD CONSTRAINT ck_suppliers_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE manufacturers ADD CONSTRAINT ck_manufacturers_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE warehouses ADD CONSTRAINT ck_warehouses_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE ecommerce_platforms ADD CONSTRAINT ck_ecommerce_platforms_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE stores ADD CONSTRAINT ck_stores_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE product_suppliers ADD CONSTRAINT ck_product_suppliers_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE product_manufacturers ADD CONSTRAINT ck_product_manufacturers_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE purchase_orders ADD CONSTRAINT ck_purchase_orders_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE purchase_order_items ADD CONSTRAINT ck_purchase_order_items_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE purchase_payments ADD CONSTRAINT ck_purchase_payments_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE purchase_returns ADD CONSTRAINT ck_purchase_returns_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE purchase_return_items ADD CONSTRAINT ck_purchase_return_items_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE production_orders ADD CONSTRAINT ck_production_orders_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE production_order_items ADD CONSTRAINT ck_production_order_items_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE production_payments ADD CONSTRAINT ck_production_payments_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE production_progress_records ADD CONSTRAINT ck_production_progress_records_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE production_completion_records ADD CONSTRAINT ck_production_completion_records_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE production_completion_record_items ADD CONSTRAINT ck_production_completion_record_items_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE inspection_orders ADD CONSTRAINT ck_inspection_orders_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE inspection_order_items ADD CONSTRAINT ck_inspection_order_items_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE inbound_orders ADD CONSTRAINT ck_inbound_orders_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE inbound_order_items ADD CONSTRAINT ck_inbound_order_items_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE outbound_orders ADD CONSTRAINT ck_outbound_orders_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE outbound_order_items ADD CONSTRAINT ck_outbound_order_items_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE sales_returns ADD CONSTRAINT ck_sales_returns_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE sales_return_items ADD CONSTRAINT ck_sales_return_items_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE damage_reports ADD CONSTRAINT ck_damage_reports_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE damage_report_items ADD CONSTRAINT ck_damage_report_items_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE cross_border_shipments ADD CONSTRAINT ck_cross_border_shipments_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE cross_border_shipment_items ADD CONSTRAINT ck_cross_border_shipment_items_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE shipment_import_matches ADD CONSTRAINT ck_shipment_import_matches_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE inventories ADD CONSTRAINT ck_inventories_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE transfer_orders ADD CONSTRAINT ck_transfer_orders_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE transfer_order_items ADD CONSTRAINT ck_transfer_order_items_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE stock_counts ADD CONSTRAINT ck_stock_counts_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE stock_count_items ADD CONSTRAINT ck_stock_count_items_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE inventory_adjustments ADD CONSTRAINT ck_inventory_adjustments_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE inventory_adjustment_items ADD CONSTRAINT ck_inventory_adjustment_items_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE inventory_alerts ADD CONSTRAINT ck_inventory_alerts_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE import_tasks ADD CONSTRAINT ck_import_tasks_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE import_task_items ADD CONSTRAINT ck_import_task_items_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE users ADD CONSTRAINT ck_users_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE roles ADD CONSTRAINT ck_roles_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE permissions ADD CONSTRAINT ck_permissions_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE user_roles ADD CONSTRAINT ck_user_roles_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE role_permissions ADD CONSTRAINT ck_role_permissions_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE role_warehouses ADD CONSTRAINT ck_role_warehouses_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE role_stores ADD CONSTRAINT ck_role_stores_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE system_settings ADD CONSTRAINT ck_system_settings_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE attachments ADD CONSTRAINT ck_attachments_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE attachment_links ADD CONSTRAINT ck_attachment_links_updated_at_range CHECK (updated_at >= created_at);
ALTER TABLE skus ADD CONSTRAINT ck_skus_price_and_safety_stock_nonnegative CHECK ((default_purchase_price IS NULL OR default_purchase_price >= 0) AND (default_production_price IS NULL OR default_production_price >= 0) AND (default_sale_price IS NULL OR default_sale_price >= 0) AND safety_stock_quantity >= 0);
ALTER TABLE product_suppliers ADD CONSTRAINT ck_product_suppliers_commercial_values_nonnegative CHECK ((default_unit_price IS NULL OR default_unit_price >= 0) AND (minimum_order_quantity IS NULL OR minimum_order_quantity >= 0));
ALTER TABLE product_manufacturers ADD CONSTRAINT ck_product_manufacturers_commercial_values_nonnegative CHECK ((default_processing_price IS NULL OR default_processing_price >= 0) AND (minimum_order_quantity IS NULL OR minimum_order_quantity >= 0));
ALTER TABLE purchase_orders ADD CONSTRAINT ck_purchase_orders_values_nonnegative CHECK (total_quantity >= 0 AND subtotal_amount >= 0 AND tax_amount >= 0 AND total_amount >= 0 AND paid_amount >= 0 AND unpaid_amount >= 0);
ALTER TABLE purchase_orders ADD CONSTRAINT ck_purchase_orders_payment_balance CHECK (paid_amount <= total_amount AND unpaid_amount = total_amount - paid_amount);
ALTER TABLE purchase_orders ADD CONSTRAINT ck_purchase_orders_delivery_date_range CHECK (expected_delivery_date >= document_date);
ALTER TABLE purchase_order_items ADD CONSTRAINT ck_purchase_order_items_values_nonnegative CHECK (unit_price >= 0 AND tax_rate >= 0 AND tax_amount >= 0 AND line_amount >= 0 AND received_quantity >= 0 AND inspected_quantity >= 0 AND qualified_quantity >= 0 AND inbound_quantity >= 0 AND returned_quantity >= 0);
ALTER TABLE purchase_payments ADD CONSTRAINT ck_purchase_payments_payment_amount_positive CHECK (payment_amount > 0);
ALTER TABLE purchase_returns ADD CONSTRAINT ck_purchase_returns_values_nonnegative CHECK (total_quantity >= 0 AND total_amount >= 0);
ALTER TABLE purchase_return_items ADD CONSTRAINT ck_purchase_return_items_values_nonnegative CHECK (unit_price >= 0 AND line_amount >= 0);
ALTER TABLE production_orders ADD CONSTRAINT ck_production_orders_values_nonnegative CHECK (total_quantity >= 0 AND subtotal_amount >= 0 AND total_amount >= 0 AND paid_amount >= 0 AND unpaid_amount >= 0);
ALTER TABLE production_orders ADD CONSTRAINT ck_production_orders_payment_balance CHECK (paid_amount <= total_amount AND unpaid_amount = total_amount - paid_amount);
ALTER TABLE production_orders ADD CONSTRAINT ck_production_orders_completion_percentage_range CHECK (completion_percentage BETWEEN 0 AND 100);
ALTER TABLE production_orders ADD CONSTRAINT ck_production_orders_date_range CHECK (expected_completion_date >= planned_start_date AND (actual_completion_date IS NULL OR (actual_start_date IS NOT NULL AND actual_completion_date >= actual_start_date)));
ALTER TABLE production_order_items ADD CONSTRAINT ck_production_order_items_values_nonnegative CHECK (processing_unit_price >= 0 AND line_amount >= 0 AND planned_quantity >= 0 AND completed_quantity >= 0 AND inspected_quantity >= 0 AND qualified_quantity >= 0 AND inbound_quantity >= 0 AND shipped_quantity >= 0);
ALTER TABLE production_payments ADD CONSTRAINT ck_production_payments_payment_amount_positive CHECK (payment_amount > 0);
ALTER TABLE production_progress_records ADD CONSTRAINT ck_production_progress_records_values_nonnegative CHECK (completed_quantity >= 0);
ALTER TABLE production_progress_records ADD CONSTRAINT ck_production_progress_records_percentage_range CHECK (progress_percentage BETWEEN 0 AND 100);
ALTER TABLE production_progress_records ADD CONSTRAINT ck_production_progress_records_date_range CHECK (estimated_completion_date IS NULL OR estimated_completion_date >= progress_date);
ALTER TABLE production_completion_records ADD CONSTRAINT ck_production_completion_records_quantity_positive CHECK (total_completed_quantity > 0);
ALTER TABLE production_completion_record_items ADD CONSTRAINT ck_production_completion_record_items_quantity_positive CHECK (completed_quantity > 0);
ALTER TABLE inspection_orders ADD CONSTRAINT ck_inspection_orders_source_complete CHECK (source_type IS NOT NULL AND ((purchase_order_id IS NOT NULL AND production_order_id IS NULL) OR (purchase_order_id IS NULL AND production_order_id IS NOT NULL)));
ALTER TABLE inspection_orders ADD CONSTRAINT ck_inspection_orders_quantities_nonnegative CHECK (total_inspected_quantity >= 0 AND total_qualified_quantity >= 0 AND total_unqualified_quantity >= 0);
ALTER TABLE inspection_orders ADD CONSTRAINT ck_inspection_orders_quantity_balance CHECK (total_inspected_quantity = total_qualified_quantity + total_unqualified_quantity);
ALTER TABLE inspection_order_items ADD CONSTRAINT ck_inspection_order_items_quantities_nonnegative CHECK (inspected_quantity >= 0 AND qualified_quantity >= 0 AND unqualified_quantity >= 0 AND pending_quantity >= 0);
ALTER TABLE inspection_order_items ADD CONSTRAINT ck_inspection_order_items_quantity_balance CHECK (inspected_quantity = qualified_quantity + unqualified_quantity + pending_quantity);
ALTER TABLE inbound_orders ADD CONSTRAINT ck_inbound_orders_source_complete CHECK ((source_document_type IS NULL AND source_document_id IS NULL) OR (source_document_type IS NOT NULL AND source_document_id IS NOT NULL));
ALTER TABLE inbound_orders ADD CONSTRAINT ck_inbound_orders_total_quantity_nonnegative CHECK (total_quantity >= 0);
ALTER TABLE inbound_order_items ADD CONSTRAINT ck_inbound_order_items_cost_nonnegative CHECK (unit_cost >= 0 AND line_cost >= 0);
ALTER TABLE outbound_orders ADD CONSTRAINT ck_outbound_orders_total_quantity_nonnegative CHECK (total_quantity >= 0);
ALTER TABLE outbound_order_items ADD CONSTRAINT ck_outbound_order_items_cost_nonnegative CHECK (unit_cost >= 0 AND line_cost >= 0);
ALTER TABLE sales_returns ADD CONSTRAINT ck_sales_returns_total_quantity_nonnegative CHECK (total_quantity >= 0);
ALTER TABLE sales_return_items ADD CONSTRAINT ck_sales_return_items_quantities_nonnegative CHECK (returned_quantity >= 0 AND sellable_quantity >= 0 AND pending_quantity >= 0 AND damaged_quantity >= 0);
ALTER TABLE sales_return_items ADD CONSTRAINT ck_sales_return_items_quantity_balance CHECK (returned_quantity = sellable_quantity + pending_quantity + damaged_quantity);
ALTER TABLE damage_reports ADD CONSTRAINT ck_damage_reports_source_complete CHECK ((source_document_type IS NULL AND source_document_id IS NULL) OR (source_document_type IS NOT NULL AND source_document_id IS NOT NULL));
ALTER TABLE damage_reports ADD CONSTRAINT ck_damage_reports_values_nonnegative CHECK (total_quantity >= 0 AND total_loss_amount >= 0);
ALTER TABLE damage_report_items ADD CONSTRAINT ck_damage_report_items_values_nonnegative CHECK (unit_cost >= 0 AND loss_amount >= 0);
ALTER TABLE cross_border_shipments ADD CONSTRAINT ck_cross_border_shipments_total_quantity_nonnegative CHECK (total_quantity >= 0);
ALTER TABLE cross_border_shipments ADD CONSTRAINT ck_cross_border_shipments_warehouse_roles_distinct CHECK (source_warehouse_id <> transit_warehouse_id AND source_warehouse_id <> destination_warehouse_id AND transit_warehouse_id <> destination_warehouse_id);
ALTER TABLE cross_border_shipments ADD CONSTRAINT ck_cross_border_shipments_date_range CHECK (estimated_arrival_date >= departure_date AND (actual_arrival_date IS NULL OR actual_arrival_date >= departure_date));
ALTER TABLE cross_border_shipment_items ADD CONSTRAINT ck_cross_border_shipment_items_values_nonnegative CHECK (shipped_quantity >= 0 AND received_quantity >= 0 AND unit_cost >= 0 AND line_cost >= 0);
ALTER TABLE shipment_import_matches ADD CONSTRAINT ck_shipment_import_matches_values_nonnegative CHECK (matched_quantity >= 0 AND received_quantity >= 0);
ALTER TABLE inventories ADD CONSTRAINT ck_inventories_quantities_nonnegative CHECK (on_hand_quantity >= 0 AND available_quantity >= 0 AND reserved_quantity >= 0 AND pending_quantity >= 0);
ALTER TABLE inventories ADD CONSTRAINT ck_inventories_quantity_balance CHECK (available_quantity = on_hand_quantity - reserved_quantity - pending_quantity);
ALTER TABLE inventory_transactions ADD CONSTRAINT ck_inventory_transactions_quantity_positive CHECK (quantity > 0);
ALTER TABLE inventory_transactions ADD CONSTRAINT ck_inventory_transactions_balance_nonnegative CHECK (quantity_before >= 0 AND quantity_after >= 0);
ALTER TABLE inventory_transactions ADD CONSTRAINT ck_inventory_transactions_source_complete CHECK (source_document_type IS NOT NULL AND source_document_id IS NOT NULL AND source_document_item_id IS NOT NULL);
ALTER TABLE inventory_transactions ADD CONSTRAINT ck_inventory_transactions_related_not_self CHECK (related_transaction_id IS NULL OR related_transaction_id <> id);
ALTER TABLE inventory_transactions ADD CONSTRAINT ck_inventory_transactions_cost_nonnegative CHECK ((unit_cost IS NULL OR unit_cost >= 0) AND (amount IS NULL OR amount >= 0));
ALTER TABLE transfer_orders ADD CONSTRAINT ck_transfer_orders_total_quantity_nonnegative CHECK (total_quantity >= 0);
ALTER TABLE transfer_orders ADD CONSTRAINT ck_transfer_orders_warehouse_roles_distinct CHECK (source_warehouse_id <> transit_warehouse_id AND source_warehouse_id <> destination_warehouse_id AND transit_warehouse_id <> destination_warehouse_id);
ALTER TABLE transfer_orders ADD CONSTRAINT ck_transfer_orders_time_range CHECK (received_at IS NULL OR (shipped_at IS NOT NULL AND received_at >= shipped_at));
ALTER TABLE transfer_order_items ADD CONSTRAINT ck_transfer_order_items_values_nonnegative CHECK (shipped_quantity >= 0 AND received_quantity >= 0 AND unit_cost >= 0);
ALTER TABLE stock_counts ADD CONSTRAINT ck_stock_counts_counts_nonnegative CHECK (total_item_count >= 0 AND difference_item_count >= 0 AND difference_item_count <= total_item_count);
ALTER TABLE stock_counts ADD CONSTRAINT ck_stock_counts_time_range CHECK (completed_at IS NULL OR (started_at IS NOT NULL AND completed_at >= started_at));
ALTER TABLE stock_count_items ADD CONSTRAINT ck_stock_count_items_quantities_nonnegative CHECK (book_quantity >= 0 AND counted_quantity >= 0 AND (recount_quantity IS NULL OR recount_quantity >= 0) AND final_quantity >= 0);
ALTER TABLE inventory_adjustments ADD CONSTRAINT ck_inventory_adjustments_totals_nonnegative CHECK (total_increase_quantity >= 0 AND total_decrease_quantity >= 0);
ALTER TABLE inventory_adjustment_items ADD CONSTRAINT ck_inventory_adjustment_items_values_nonnegative CHECK (quantity_before >= 0 AND quantity_after >= 0 AND unit_cost >= 0 AND amount >= 0);
ALTER TABLE inventory_alerts ADD CONSTRAINT ck_inventory_alerts_quantities_nonnegative CHECK (threshold_quantity >= 0 AND current_quantity >= 0);
ALTER TABLE import_tasks ADD CONSTRAINT ck_import_tasks_row_counts_nonnegative CHECK (total_rows >= 0 AND success_rows >= 0 AND failed_rows >= 0 AND warning_rows >= 0);
ALTER TABLE import_tasks ADD CONSTRAINT ck_import_tasks_row_count_balance CHECK (success_rows + failed_rows <= total_rows AND warning_rows <= total_rows);
ALTER TABLE import_tasks ADD CONSTRAINT ck_import_tasks_time_range CHECK (completed_at IS NULL OR (started_at IS NOT NULL AND completed_at >= started_at));
ALTER TABLE import_task_items ADD CONSTRAINT ck_import_task_items_result_complete CHECK ((result_document_type IS NULL AND result_document_id IS NULL) OR (result_document_type IS NOT NULL AND result_document_id IS NOT NULL));
ALTER TABLE users ADD CONSTRAINT ck_users_failed_login_count_nonnegative CHECK (failed_login_count >= 0);
ALTER TABLE backup_tasks ADD CONSTRAINT ck_backup_tasks_file_size_nonnegative CHECK (file_size IS NULL OR file_size >= 0);
ALTER TABLE backup_tasks ADD CONSTRAINT ck_backup_tasks_time_range CHECK (completed_at IS NULL OR (started_at IS NOT NULL AND completed_at >= started_at));
ALTER TABLE backup_tasks ADD CONSTRAINT ck_backup_tasks_retention_range CHECK (retention_until IS NULL OR (completed_at IS NOT NULL AND retention_until >= completed_at));
ALTER TABLE attachments ADD CONSTRAINT ck_attachments_file_size_nonnegative CHECK (file_size >= 0);
ALTER TABLE document_status_histories ADD CONSTRAINT ck_document_status_histories_status_changed CHECK (from_status IS NULL OR from_status <> to_status);
ALTER TABLE approval_records ADD CONSTRAINT ck_approval_records_previous_not_self CHECK (previous_approval_record_id IS NULL OR previous_approval_record_id <> id);
ALTER TABLE warehouses ADD CONSTRAINT ck_warehouses_manufacturer_required CHECK (warehouse_type <> 'manufacturer' OR manufacturer_id IS NOT NULL);
ALTER TABLE warehouses ADD CONSTRAINT ck_warehouses_country_required CHECK (warehouse_type <> 'overseas' OR country_code IS NOT NULL);
ALTER TABLE warehouses ADD CONSTRAINT ck_warehouses_available_stock_role CHECK (warehouse_type NOT IN ('transit', 'pending') OR allows_available_stock = false);

CREATE INDEX idx_product_categories_parent_category_id_sort_order ON product_categories (parent_category_id, sort_order);
CREATE INDEX idx_products_category_id_is_active ON products (category_id, is_active);
CREATE INDEX idx_products_brand_id_is_active ON products (brand_id, is_active);
CREATE INDEX idx_skus_product_id_is_active ON skus (product_id, is_active);
CREATE INDEX idx_skus_is_active_sku_name ON skus (is_active, sku_name);
CREATE INDEX idx_warehouses_warehouse_type_is_active ON warehouses (warehouse_type, is_active);
CREATE INDEX idx_warehouses_manufacturer_id_is_active ON warehouses (manufacturer_id, is_active);
CREATE INDEX idx_stores_platform_id_is_active ON stores (platform_id, is_active);
CREATE INDEX idx_product_suppliers_supplier_id_is_active ON product_suppliers (supplier_id, is_active);
CREATE INDEX idx_product_suppliers_product_id_is_preferred_is_active ON product_suppliers (product_id, is_preferred, is_active);
CREATE INDEX idx_product_manufacturers_manufacturer_id_is_active ON product_manufacturers (manufacturer_id, is_active);
CREATE INDEX idx_product_manufacturers_product_id_is_preferred_is_active ON product_manufacturers (product_id, is_preferred, is_active);
CREATE INDEX idx_purchase_orders_supplier_id_status_document_date ON purchase_orders (supplier_id, status, document_date);
CREATE INDEX idx_purchase_orders_approval_status_document_date ON purchase_orders (approval_status, document_date);
CREATE INDEX idx_purchase_order_items_sku_id ON purchase_order_items (sku_id);
CREATE INDEX idx_purchase_payments_purchase_order_id_payment_date ON purchase_payments (purchase_order_id, payment_date);
CREATE INDEX idx_purchase_payments_supplier_id_payment_date ON purchase_payments (supplier_id, payment_date);
CREATE INDEX idx_purchase_returns_purchase_order_id_status ON purchase_returns (purchase_order_id, status);
CREATE INDEX idx_purchase_returns_source_inbound_order_id ON purchase_returns (source_inbound_order_id);
CREATE INDEX idx_purchase_return_items_sku_id ON purchase_return_items (sku_id);
CREATE INDEX idx_production_orders_manufacturer_id_status_document_date ON production_orders (manufacturer_id, status, document_date);
CREATE INDEX idx_production_orders_approval_status_document_date ON production_orders (approval_status, document_date);
CREATE INDEX idx_production_order_items_sku_id ON production_order_items (sku_id);
CREATE INDEX idx_production_payments_production_order_id_payment_date ON production_payments (production_order_id, payment_date);
CREATE INDEX idx_production_progress_records_production_order_id_pr_5bb7281f ON production_progress_records (production_order_id, progress_date);
CREATE INDEX idx_production_completion_records_production_order_id__7f8a4f48 ON production_completion_records (production_order_id, completion_date);
CREATE INDEX idx_production_completion_record_items_production_order_item_id ON production_completion_record_items (production_order_item_id);
CREATE INDEX idx_production_completion_record_items_sku_id ON production_completion_record_items (sku_id);
CREATE INDEX idx_inspection_orders_source_type_purchase_order_id ON inspection_orders (source_type, purchase_order_id);
CREATE INDEX idx_inspection_orders_source_type_production_order_id ON inspection_orders (source_type, production_order_id);
CREATE INDEX idx_inspection_orders_inspection_warehouse_id_status_d_7fc5dbd2 ON inspection_orders (inspection_warehouse_id, status, document_date);
CREATE INDEX idx_inspection_order_items_source_item_id ON inspection_order_items (source_item_id);
CREATE INDEX idx_inspection_order_items_sku_id ON inspection_order_items (sku_id);
CREATE INDEX idx_inbound_orders_warehouse_id_status_document_date ON inbound_orders (warehouse_id, status, document_date);
CREATE INDEX idx_inbound_orders_source_document_type_source_document_id ON inbound_orders (source_document_type, source_document_id);
CREATE INDEX idx_inbound_order_items_source_document_item_id ON inbound_order_items (source_document_item_id);
CREATE INDEX idx_inbound_order_items_sku_id ON inbound_order_items (sku_id);
CREATE INDEX idx_outbound_orders_warehouse_id_status_document_date ON outbound_orders (warehouse_id, status, document_date);
CREATE INDEX idx_outbound_orders_store_id_status_document_date ON outbound_orders (store_id, status, document_date);
CREATE INDEX idx_outbound_order_items_sku_id ON outbound_order_items (sku_id);
CREATE INDEX idx_sales_returns_outbound_order_id_status ON sales_returns (outbound_order_id, status);
CREATE INDEX idx_sales_returns_store_id_document_date ON sales_returns (store_id, document_date);
CREATE INDEX idx_sales_return_items_outbound_order_item_id ON sales_return_items (outbound_order_item_id);
CREATE INDEX idx_sales_return_items_sku_id ON sales_return_items (sku_id);
CREATE INDEX idx_damage_reports_warehouse_id_status_document_date ON damage_reports (warehouse_id, status, document_date);
CREATE INDEX idx_damage_reports_source_document_type_source_document_id ON damage_reports (source_document_type, source_document_id);
CREATE INDEX idx_damage_report_items_source_document_item_id ON damage_report_items (source_document_item_id);
CREATE INDEX idx_damage_report_items_sku_id ON damage_report_items (sku_id);
CREATE INDEX idx_cross_border_shipments_source_warehouse_id_status__074bfe23 ON cross_border_shipments (source_warehouse_id, status, document_date);
CREATE INDEX idx_cross_border_shipments_destination_warehouse_id_st_b3bf02e3 ON cross_border_shipments (destination_warehouse_id, status, document_date);
CREATE INDEX idx_cross_border_shipments_production_order_id ON cross_border_shipments (production_order_id);
CREATE INDEX idx_cross_border_shipment_items_sku_id ON cross_border_shipment_items (sku_id);
CREATE INDEX idx_shipment_import_matches_import_task_id ON shipment_import_matches (import_task_id);
CREATE INDEX idx_shipment_import_matches_cross_border_shipment_id ON shipment_import_matches (cross_border_shipment_id);
CREATE INDEX idx_inventories_warehouse_id_sku_id ON inventories (warehouse_id, sku_id);
CREATE INDEX idx_inventory_transactions_sku_id_warehouse_id_created_at ON inventory_transactions (sku_id, warehouse_id, created_at);
CREATE INDEX idx_inventory_transactions_warehouse_id_created_at ON inventory_transactions (warehouse_id, created_at);
CREATE INDEX idx_inventory_transactions_source_document_type_source_4ae307e5 ON inventory_transactions (source_document_type, source_document_id);
CREATE INDEX idx_inventory_transactions_source_document_type_source_3dec522a ON inventory_transactions (source_document_type, source_document_id, source_document_item_id);
CREATE INDEX idx_inventory_transactions_related_transaction_id ON inventory_transactions (related_transaction_id);
CREATE INDEX idx_transfer_orders_source_warehouse_id_status_document_date ON transfer_orders (source_warehouse_id, status, document_date);
CREATE INDEX idx_transfer_orders_destination_warehouse_id_status_do_6c8f3386 ON transfer_orders (destination_warehouse_id, status, document_date);
CREATE INDEX idx_transfer_order_items_sku_id ON transfer_order_items (sku_id);
CREATE INDEX idx_stock_counts_warehouse_id_status_document_date ON stock_counts (warehouse_id, status, document_date);
CREATE INDEX idx_stock_count_items_sku_id ON stock_count_items (sku_id);
CREATE INDEX idx_inventory_adjustments_warehouse_id_status_document_date ON inventory_adjustments (warehouse_id, status, document_date);
CREATE INDEX idx_inventory_adjustments_stock_count_id ON inventory_adjustments (stock_count_id);
CREATE INDEX idx_inventory_adjustment_items_sku_id ON inventory_adjustment_items (sku_id);
CREATE INDEX idx_inventory_alerts_alert_status_warehouse_id ON inventory_alerts (alert_status, warehouse_id);
CREATE INDEX idx_inventory_alerts_sku_id_alert_status ON inventory_alerts (sku_id, alert_status);
CREATE INDEX idx_inventory_alerts_created_at ON inventory_alerts (created_at);
CREATE INDEX idx_import_tasks_status_created_at ON import_tasks (status, created_at);
CREATE INDEX idx_import_tasks_warehouse_id_created_at ON import_tasks (warehouse_id, created_at);
CREATE INDEX idx_import_tasks_store_id_created_at ON import_tasks (store_id, created_at);
CREATE INDEX idx_import_task_items_matched_sku_id ON import_task_items (matched_sku_id);
CREATE INDEX idx_import_task_items_result_document_type_result_document_id ON import_task_items (result_document_type, result_document_id);
CREATE INDEX idx_user_roles_role_id ON user_roles (role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions (permission_id);
CREATE INDEX idx_role_warehouses_warehouse_id ON role_warehouses (warehouse_id);
CREATE INDEX idx_role_stores_store_id ON role_stores (store_id);
CREATE INDEX idx_attachments_uploaded_by_created_at ON attachments (uploaded_by, created_at);
CREATE INDEX idx_attachment_links_object_type_object_id ON attachment_links (object_type, object_id);
CREATE INDEX idx_attachment_links_object_type_object_id_object_item_id ON attachment_links (object_type, object_id, object_item_id);
CREATE INDEX idx_audit_logs_object_type_object_id_created_at ON audit_logs (object_type, object_id, created_at);
CREATE INDEX idx_audit_logs_user_id_created_at ON audit_logs (user_id, created_at);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at);
CREATE INDEX idx_document_status_histories_object_type_object_id_created_at ON document_status_histories (object_type, object_id, created_at);
CREATE INDEX idx_approval_records_object_type_object_id_created_at ON approval_records (object_type, object_id, created_at);
CREATE INDEX idx_approval_records_approver_id_created_at ON approval_records (approver_id, created_at);
CREATE INDEX idx_backup_tasks_status_created_at ON backup_tasks (status, created_at);
