interface DashboardProps {
    stats: {
        todayJobs: number;
        weekJobs: number;
        totalCustomers: number;
        activeTerritories: number;
        activeProviders: number;
        pendingInvoices: number;
    };
    upcomingJobs: Array<{
        id: string;
        customer_name: string;
        service_name?: string;
        scheduled_date: string;
        scheduled_start_time: string;
        status: string;
    }>;
    recentBookings: Array<{
        id: string;
        customer_name: string;
        service_name?: string;
        territory_name?: string;
        status: string;
        created_at: string;
        total_price_cents: number;
    }>;
    recentMessages: Array<{
        id: string;
        first_name?: string;
        last_name?: string;
        email?: string;
        subject: string;
        is_read: number;
        created_at: string;
    }>;
}
export declare const Dashboard: ({ stats, upcomingJobs, recentBookings, recentMessages }: DashboardProps) => import("hono/jsx/jsx-dev-runtime").JSX.Element;
export {};
//# sourceMappingURL=dashboard.d.ts.map