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
export declare const InvoiceDetailPage: ({ invoice, customers, jobs, lineItems, }: {
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
    customers: Array<{
        id: string;
        first_name: string;
        last_name: string;
    }>;
    jobs: Array<{
        id: string;
        customer_name: string;
        scheduled_date: string;
    }>;
    lineItems: InvoiceLine[];
}) => import("hono/jsx/jsx-dev-runtime").JSX.Element;
export {};
//# sourceMappingURL=invoice-detail.d.ts.map