-- CR-004 Product Model Unique Constraint
-- Forward-only migration.
-- Rollback reference:
--   DROP INDEX IF EXISTS uq_products_product_name_en;
--   ALTER TABLE products DROP CONSTRAINT IF EXISTS ck_products_product_name_en_not_blank;
--   ALTER TABLE products ALTER COLUMN product_name_en DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM products
    WHERE product_name_en IS NULL
       OR length(trim(product_name_en)) = 0
  ) THEN
    RAISE EXCEPTION 'CR-004 blocked: products.product_name_en contains NULL or blank values';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT lower(trim(product_name_en)) AS normalized_model
      FROM products
      GROUP BY lower(trim(product_name_en))
      HAVING count(*) > 1
    ) duplicated_models
  ) THEN
    RAISE EXCEPTION 'CR-004 blocked: products.product_name_en contains duplicate values';
  END IF;
END $$;

ALTER TABLE products
  ALTER COLUMN product_name_en SET NOT NULL;

ALTER TABLE products
  ADD CONSTRAINT ck_products_product_name_en_not_blank
  CHECK (length(trim(product_name_en)) > 0);

CREATE UNIQUE INDEX uq_products_product_name_en
  ON products (lower(trim(product_name_en)));
