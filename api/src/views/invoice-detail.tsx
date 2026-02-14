/** @jsx jsx */
import { jsx } from 'hono/jsx';
import { Layout } from './layout';

void jsx;

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

type InvoiceLine = {
  id: string;
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  kind: string;
  parent_id: string | null;
  is_custom: number;
};

export const InvoiceDetailPage = ({
  invoice,
  customers,
  jobs,
  lineItems,
}: {
  invoice: {
    id: string;
    invoice_number: string;
    customer_id: string;
    job_id: string | null;
    currency: string;
    due_date: string | null;
    status: string;
    notes: string | null;
    tax_cents: number;
    discount_cents: number;
  };
  customers: Array<{ id: string; first_name: string; last_name: string }>;
  jobs: Array<{ id: string; customer_name: string; scheduled_date: string }>;
  lineItems: InvoiceLine[];
}) => {
  const subtotal = lineItems.reduce((sum, line) => sum + line.total_cents, 0);
  const total = Math.max(0, subtotal + Number(invoice.tax_cents || 0) - Number(invoice.discount_cents || 0));

  return (
    <Layout title={`Invoice ${invoice.invoice_number}`}>
      <div class="flex items-center justify-between px-4 pl-14 py-4 md:px-8 md:pl-8 md:py-5 bg-white border-b border-border sticky top-0 z-50">
        <h2 class="text-xl font-semibold">Edit Invoice</h2>
        <a href="/admin/invoices" class="uk-btn uk-btn-default" hx-get="/admin/invoices" hx-target="#page-content" hx-select="#page-content" hx-push-url="true">Back</a>
      </div>
      <div class="p-4 sm:p-8">
        <div class="grid gap-4" style="max-width: 900px;">
          <div class="uk-card uk-card-body">
            <form hx-post={`/admin/invoices/${invoice.id}`} hx-target="#page-content" hx-select="#page-content" hx-push-url="/admin/invoices" class="grid gap-4 sm:grid-cols-2">
              <div class="grid gap-2">
                <label class="uk-form-label" for="invoice_number">Invoice Number</label>
                <input id="invoice_number" name="invoice_number" class="uk-input" value={invoice.invoice_number} required />
              </div>
              <div class="grid gap-2">
                <label class="uk-form-label" for="currency">Currency</label>
                <select id="currency" name="currency" class="uk-select" required>
                  <option value="CAD" selected={invoice.currency === 'CAD'}>CAD</option>
                  <option value="USD" selected={invoice.currency === 'USD'}>USD</option>
                </select>
              </div>
              <div class="grid gap-2">
                <label class="uk-form-label" for="customer_id">Customer</label>
                <select id="customer_id" name="customer_id" class="uk-select" required>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id} selected={customer.id === invoice.customer_id}>{customer.first_name} {customer.last_name}</option>
                  ))}
                </select>
              </div>
              <div class="grid gap-2">
                <label class="uk-form-label" for="job_id">Job</label>
                <select id="job_id" name="job_id" class="uk-select">
                  <option value="">None</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id} selected={invoice.job_id === job.id}>{job.customer_name} - {job.scheduled_date}</option>
                  ))}
                </select>
              </div>
              <div class="grid gap-2">
                <label class="uk-form-label" for="due_date">Due Date</label>
                <input id="due_date" name="due_date" type="date" class="uk-input" value={invoice.due_date || ''} />
              </div>
              <div class="grid gap-2">
                <label class="uk-form-label" for="status">Status</label>
                <select id="status" name="status" class="uk-select" required>
                  <option value="pending" selected={invoice.status === 'pending'}>Pending</option>
                  <option value="sent" selected={invoice.status === 'sent'}>Sent</option>
                  <option value="paid" selected={invoice.status === 'paid'}>Paid</option>
                  <option value="void" selected={invoice.status === 'void'}>Void</option>
                </select>
              </div>
              <div class="grid gap-2">
                <label class="uk-form-label" for="tax_amount">Tax ($)</label>
                <input id="tax_amount" name="tax_amount" type="number" class="uk-input" step={0.01} min={0} value={(invoice.tax_cents / 100).toFixed(2)} />
              </div>
              <div class="grid gap-2">
                <label class="uk-form-label" for="discount_amount">Discount ($)</label>
                <input id="discount_amount" name="discount_amount" type="number" class="uk-input" step={0.01} min={0} value={(invoice.discount_cents / 100).toFixed(2)} />
              </div>
              <div class="grid gap-2 sm:col-span-2">
                <label class="uk-form-label" for="line_items_preview">Line Items (managed below)</label>
                <textarea id="line_items_preview" name="line_items_preview" rows={5} class="uk-textarea" readonly>{lineItems.map((line) => `${line.description} | ${line.quantity} | ${(line.unit_price_cents / 100).toFixed(2)}`).join('\n')}</textarea>
              </div>
              <div class="grid gap-2 sm:col-span-2">
                <label class="uk-form-label" for="notes">Notes</label>
                <textarea id="notes" name="notes" rows={3} class="uk-textarea">{invoice.notes || ''}</textarea>
              </div>
              <div class="grid gap-1 sm:col-span-2 rounded-md border border-border p-3" style="background:var(--surface-elevated);">
                <p class="text-xs text-muted-foreground">Subtotal {money(subtotal)} • Total {money(total)}</p>
                <input type="hidden" id="total_amount" name="total_amount" value={(total / 100).toFixed(2)} />
              </div>
              <div class="sm:col-span-2 flex items-center gap-2">
                <button type="submit" class="uk-btn uk-btn-primary">Update</button>
                <button type="button" class="delete-btn" hx-post={`/admin/invoices/${invoice.id}/delete`} hx-target="#page-content" data-confirm="arm">Delete</button>
              </div>
            </form>
          </div>

          <div class="uk-card uk-card-body">
            <h3 class="text-base font-semibold mb-4">Custom Lines</h3>
            <div class="grid gap-2 mb-4">
              {lineItems.map((line) => (
                <div key={line.id} class="flex items-start gap-3 p-3 border border-border rounded-md">
                  <div class="flex-1 min-w-0" style={line.parent_id ? 'padding-left:16px;' : ''}>
                    <p class="text-sm font-medium">{line.description}</p>
                    <p class="text-xs text-muted-foreground">{line.kind} • {line.quantity} x {money(line.unit_price_cents)}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-sm font-semibold">{money(line.total_cents)}</p>
                    {line.is_custom ? (
                      <button type="button" class="delete-btn uk-btn uk-btn-small" hx-post={`/admin/invoices/${invoice.id}/line-items/delete`} hx-vals={JSON.stringify({ lineId: line.id })} hx-target="#page-content" hx-select="#page-content" data-confirm="arm">Remove</button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <form hx-post={`/admin/invoices/${invoice.id}/line-items/add`} hx-target="#page-content" hx-select="#page-content" class="grid gap-2 sm:grid-cols-4">
              <input type="text" name="description" class="uk-input sm:col-span-2" placeholder="Custom line description" required />
              <input type="number" name="quantity" class="uk-input" min={1} step={1} value="1" required />
              <input type="number" name="unit_price" class="uk-input" min={0} step={0.01} placeholder="Unit price" required />
              <div class="sm:col-span-4 flex justify-end">
                <button type="submit" class="uk-btn uk-btn-default">Add Custom Line</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
};
