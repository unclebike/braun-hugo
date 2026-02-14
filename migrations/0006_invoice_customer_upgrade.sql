-- Forward-looking invoice and customer upgrades for payment sync readiness.

ALTER TABLE invoices ADD COLUMN invoice_number TEXT;
ALTER TABLE invoices ADD COLUMN currency TEXT NOT NULL DEFAULT 'CAD';
ALTER TABLE invoices ADD COLUMN subtotal_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN tax_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN discount_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN total_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN line_items_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE invoices ADD COLUMN notes TEXT;
ALTER TABLE invoices ADD COLUMN sent_at TEXT;
ALTER TABLE invoices ADD COLUMN external_provider TEXT;
ALTER TABLE invoices ADD COLUMN external_reference TEXT;
ALTER TABLE invoices ADD COLUMN external_sync_status TEXT NOT NULL DEFAULT 'local_only';

-- Keep existing records coherent.
UPDATE invoices
SET subtotal_cents = COALESCE(amount_cents, 0),
    total_cents = COALESCE(amount_cents, 0)
WHERE subtotal_cents = 0 AND total_cents = 0;

WITH numbered AS (
  SELECT id, printf('INV-%06d', ROW_NUMBER() OVER (ORDER BY datetime(created_at) ASC, id ASC)) AS generated_number
  FROM invoices
)
UPDATE invoices
SET invoice_number = (
  SELECT generated_number FROM numbered WHERE numbered.id = invoices.id
)
WHERE invoice_number IS NULL OR TRIM(invoice_number) = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date_status ON invoices(due_date, status);
CREATE INDEX IF NOT EXISTS idx_invoices_external_provider_ref ON invoices(external_provider, external_reference);

-- Existing production data can contain shared family phone numbers/emails.
-- Keep these as search indexes; dedupe is enforced in app logic instead of hard DB uniqueness.
CREATE INDEX IF NOT EXISTS idx_customers_email_ci ON customers(LOWER(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_phone_e164 ON customers(phone_e164) WHERE phone_e164 IS NOT NULL;
