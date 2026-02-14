ALTER TABLE jobs ADD COLUMN line_items_json TEXT NOT NULL DEFAULT '[]';

UPDATE jobs
SET line_items_json = json_array(
  json_object(
    'id', lower(hex(randomblob(16))),
    'parent_id', null,
    'kind', 'service',
    'description', COALESCE(custom_service_name, 'Service'),
    'quantity', 1,
    'unit_price_cents', COALESCE(total_price_cents, 0),
    'total_cents', COALESCE(total_price_cents, 0),
    'is_custom', 0
  )
)
WHERE line_items_json = '[]' OR line_items_json IS NULL;
