interface JobDetailPageProps {
    job: {
        id: string;
        status: string;
        scheduled_date: string;
        scheduled_start_time: string;
        duration_minutes: number;
        base_price_cents: number;
        total_price_cents: number;
        custom_service_name?: string | null;
        created_at: string;
        started_at?: string | null;
        completed_at?: string | null;
    };
    customer?: {
        id: string;
        first_name: string;
        last_name: string;
        email?: string;
        phone?: string;
    };
    service?: {
        id: string;
        name: string;
        description?: string;
    };
    territory?: {
        id: string;
        name: string;
    };
    team: Array<{
        id: string;
        first_name: string;
        last_name: string;
    }>;
    assignedProviderId: string | null;
    notes: Array<{
        text: string;
        timestamp: string;
        completed: number;
        source?: {
            type?: string;
            sms_log_id?: string;
            message_id?: string;
            excerpt?: string;
            received_at?: string;
        };
    }>;
    smsThreadMessage: {
        id: string;
        is_read: number;
        updated_at: string;
        body: string | null;
    } | null;
    lineItems: Array<{
        id: string;
        parent_id: string | null;
        kind: 'service' | 'modifier' | 'rule' | 'custom';
        description: string;
        quantity: number;
        unit_price_cents: number;
        total_cents: number;
        is_custom: number;
    }>;
}
export declare const NotesList: ({ jobId, notes, listId, }: {
    jobId: string;
    notes: JobDetailPageProps["notes"];
    listId?: string;
}) => import("hono/jsx/jsx-dev-runtime").JSX.Element;
export declare const SmsThreadCard: ({ jobId, smsThreadMessage, customerName }: {
    jobId: string;
    smsThreadMessage: JobDetailPageProps["smsThreadMessage"];
    customerName?: string | null;
}) => import("hono/jsx/jsx-dev-runtime").JSX.Element;
export declare const JobDetailPage: ({ job, customer, service, territory, team, assignedProviderId, notes, smsThreadMessage, lineItems }: JobDetailPageProps) => import("hono/jsx/jsx-dev-runtime").JSX.Element;
export {};
//# sourceMappingURL=job-detail.d.ts.map