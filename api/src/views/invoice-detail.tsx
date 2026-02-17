import { jsx } from 'hono/jsx';
import { Layout } from './layout';

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const invoiceStatusClass = (status: string) => {
  const s = (status || '').toLowerCase();
  if (s === 'paid') return 'uk-label uk-label-primary';
  if (s === 'void') return 'uk-label uk-label-destructive';
  if (s === 'pending') return 'uk-label uk-label-secondary';
  return 'uk-label';
};

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
  const customerName = (() => {
    const c = customers.find(cu => cu.id === invoice.customer_id);
    return c ? `${c.first_name} ${c.last_name}`.trim() : 'Customer';
  })();
  const jobLabel = (() => {
    if (!invoice.job_id) return null;
    const j = jobs.find(jb => jb.id === invoice.job_id);
    return j ? `${j.customer_name} - ${j.scheduled_date}` : 'Linked job';
  })();

  return (
    <Layout title={`Invoice ${invoice.invoice_number}`}>
      <div class="flex items-start justify-between gap-3 px-4 pl-14 py-4 md:px-8 md:pl-8 md:py-5 bg-white border-b border-border sticky top-0 z-50">
        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <h2 class="text-xl font-extrabold truncate">Invoice {invoice.invoice_number}</h2>
            <span class={invoiceStatusClass(invoice.status)}>{invoice.status}</span>
          </div>
          <p class="text-sm text-muted-foreground truncate" style="margin:2px 0 0;">{customerName}{jobLabel ? ` | ${jobLabel}` : ''}{invoice.due_date ? ` | Due ${invoice.due_date}` : ''}</p>
        </div>
        <div class="flex items-center gap-2">
          <button type="submit" form="invoice-form" class="uk-btn uk-btn-primary uk-btn-sm">Save</button>
          <a href="/admin/invoices" class="uk-btn uk-btn-default uk-btn-sm" hx-get="/admin/invoices" hx-target="#page-content" hx-select="#page-content" hx-push-url="true">Back</a>
        </div>
      </div>

      <div class="p-4 sm:p-8" style="padding-bottom: calc(40px + var(--safe-bottom));">
        <div>
          <div class="mx-auto" style="max-width: 1120px;">
            <div class="grid gap-4 lg:grid-cols-[1fr,360px] lg:gap-6">
              <div class="grid gap-4">
                <div class="uk-card uk-card-body" style="background:var(--surface-0);">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <p class="text-[10px] uppercase tracking-wide text-muted-foreground">Amount due</p>
                      <p class="text-3xl font-extrabold" style="margin:0;">{money(total)}</p>
                      <p class="text-xs text-muted-foreground" style="margin:6px 0 0;">Subtotal {money(subtotal)} • Tax {money(Number(invoice.tax_cents || 0))} • Discount {money(Number(invoice.discount_cents || 0))}</p>
                    </div>
                    <div class="text-right">
                      <p class="text-[10px] uppercase tracking-wide text-muted-foreground">Status</p>
                      <span class={invoiceStatusClass(invoice.status)}>{invoice.status}</span>
                      {invoice.due_date ? (
                        <p class="text-xs text-muted-foreground" style="margin:8px 0 0;">Due {invoice.due_date}</p>
                      ) : null}
                    </div>
                  </div>
                  <input type="hidden" id="total_amount" name="total_amount" form="invoice-form" value={(total / 100).toFixed(2)} />
                </div>

                <div class="uk-card uk-card-body">
                  <div class="flex items-center justify-between mb-4">
                    <h3 class="text-base font-semibold" style="margin:0;">Line items</h3>
                    <span class="text-sm font-semibold">{money(subtotal)}</span>
                  </div>
                  <div class="grid gap-2 mb-4">
                    {lineItems.length === 0 ? (
                      <p class="text-sm text-muted-foreground">No line items.</p>
                    ) : (
                      lineItems.map((line) => (
                        <div key={line.id} class="flex items-start gap-3 p-3 border border-border rounded-md">
                          <div class="flex-1 min-w-0" style={line.parent_id ? 'padding-left:16px;' : ''}>
                            <p class="text-sm font-medium" style="margin:0;">{line.description}</p>
                            <p class="text-xs text-muted-foreground" style="margin:4px 0 0;">{line.kind} • {line.quantity} x {money(line.unit_price_cents)}</p>
                          </div>
                          <div class="text-right">
                            <p class="text-sm font-semibold" style="margin:0;">{money(line.total_cents)}</p>
                            {line.is_custom ? (
                              <button type="button" class="delete-btn uk-btn uk-btn-small" hx-post={`/admin/invoices/${invoice.id}/line-items/delete`} hx-vals={JSON.stringify({ lineId: line.id })} hx-target="#page-content" hx-select="#page-content" data-confirm="arm">Remove</button>
                            ) : null}
                          </div>
                        </div>
                      ))
                    )}
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

              <aside class="grid gap-4 lg:sticky" style="top: 92px;">
                <details class="uk-card uk-card-body" open>
                  <summary class="text-base font-semibold cursor-pointer">Invoice details</summary>
                  <form
                    id="invoice-form"
                    hx-post={`/admin/invoices/${invoice.id}`}
                    hx-target="#page-content"
                    hx-select="#page-content"
                    hx-push-url="/admin/invoices"
                    class="pt-4 grid gap-4"
                  >
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
                    <div class="grid gap-2">
                      <label class="uk-form-label" for="notes">Notes</label>
                      <textarea id="notes" name="notes" rows={4} class="uk-textarea">{invoice.notes || ''}</textarea>
                    </div>
                  </form>
                </details>

                <details class="uk-card uk-card-body">
                  <summary class="text-base font-semibold cursor-pointer">Danger zone</summary>
                  <div class="pt-4">
                    <button type="button" class="delete-btn" hx-post={`/admin/invoices/${invoice.id}/delete`} hx-target="#page-content" data-confirm="arm">Delete invoice</button>
                  </div>
                </details>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
