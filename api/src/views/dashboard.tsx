/** @jsx jsx */
import { jsx } from 'hono/jsx';
import { Layout } from './layout';

void jsx;

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
    created_at: string;
    total_price_cents: number;
  }>;
}

const statusClass = (status: string) => {
  const s = status.toLowerCase();
  if (s === 'complete') return 'uk-label uk-label-primary';
  if (s === 'cancelled') return 'uk-label uk-label-destructive';
  if (s === 'in_progress' || s === 'enroute') return 'uk-label uk-label-secondary';
  return 'uk-label';
};

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const shortDate = (input: string) => {
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? input : d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
};

export const Dashboard = ({ stats, upcomingJobs, recentBookings }: DashboardProps) => {
  const statCards = [
    { label: 'Jobs Today', value: stats.todayJobs },
    { label: 'Jobs This Week', value: stats.weekJobs },
    { label: 'Total Customers', value: stats.totalCustomers },
    { label: 'Active Territories', value: stats.activeTerritories },
    { label: 'Active Providers', value: stats.activeProviders },
    { label: 'Pending Invoices', value: stats.pendingInvoices },
  ];

  return (
    <Layout title="Dashboard">
      <div class="flex items-center justify-between px-8 py-5 bg-white border-b border-border sticky top-0 z-50">
        <h2 class="text-xl font-semibold">Dashboard</h2>
      </div>

      <div class="p-8">
        <div class="grid gap-6">
          <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {statCards.map((card) => (
              <div class="uk-card uk-card-body" key={card.label}>
                <p class="text-3xl font-semibold leading-none">{card.value}</p>
                <p class="text-sm text-muted-foreground mt-2">{card.label}</p>
              </div>
            ))}
          </div>

          <div class="uk-card uk-card-body">
            <h3 class="text-base font-semibold mb-4">Upcoming Jobs</h3>
            {upcomingJobs.length === 0 ? (
              <p class="text-sm text-muted-foreground">No upcoming jobs in the next 7 days.</p>
            ) : (
              <div class="uk-overflow-auto">
                <table class="uk-table uk-table-divider uk-table-hover uk-table-sm w-full text-sm">
                  <thead>
                    <tr>
                      <th class="text-left">Customer</th>
                      <th class="text-left">Service</th>
                      <th class="text-left">Date</th>
                      <th class="text-left">Time</th>
                      <th class="text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingJobs.map((job) => (
                      <tr key={job.id}>
                        <td>
                          <a
                            href={`/admin/jobs/${job.id}`}
                            class="uk-link font-medium"
                            hx-get={`/admin/jobs/${job.id}`}
                            hx-target="#page-content"
                            hx-select="#page-content"
                            hx-push-url="true"
                          >
                            {job.customer_name}
                          </a>
                        </td>
                        <td>{job.service_name || 'Custom Service'}</td>
                        <td>{shortDate(job.scheduled_date)}</td>
                        <td>{job.scheduled_start_time}</td>
                        <td>
                          <span class={statusClass(job.status)}>{job.status.replace('_', ' ')}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div class="uk-card uk-card-body">
            <h3 class="text-base font-semibold mb-4">Recent Bookings</h3>
            {recentBookings.length === 0 ? (
              <p class="text-sm text-muted-foreground">No recent bookings.</p>
            ) : (
              <div class="uk-overflow-auto">
                <table class="uk-table uk-table-divider uk-table-hover uk-table-sm w-full text-sm">
                  <thead>
                    <tr>
                      <th class="text-left">Customer</th>
                      <th class="text-left">Service</th>
                      <th class="text-left">Booked</th>
                      <th class="text-left">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBookings.map((job) => (
                      <tr key={job.id}>
                        <td>
                          <a
                            href={`/admin/jobs/${job.id}`}
                            class="uk-link font-medium"
                            hx-get={`/admin/jobs/${job.id}`}
                            hx-target="#page-content"
                            hx-select="#page-content"
                            hx-push-url="true"
                          >
                            {job.customer_name}
                          </a>
                        </td>
                        <td>{job.service_name || 'Custom Service'}</td>
                        <td>{shortDate(job.created_at)}</td>
                        <td>{money(job.total_price_cents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};
