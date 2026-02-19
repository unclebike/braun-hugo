// biome-ignore lint/correctness/noUnusedImports: jsx is used by JSX pragma transform
import { jsx } from 'hono/jsx';
import { formatTorontoDate } from '../utils/datetime';
// biome-ignore lint/correctness/noUnusedImports: StatusIcon is reserved for header icons
import { StatusBadge, StatusIcon } from './components';
import { Layout } from './layout';

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

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const shortDate = (input: string) => {
  return formatTorontoDate(input, { month: 'short', day: 'numeric' }) || input;
};

const shortTime = (input: string) => {
  const [hourText = '', minuteText = ''] = input.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return input;
  const period = hour >= 12 ? 'PM' : 'AM';
  const clockHour = hour % 12 || 12;
  return `${clockHour}:${String(minute).padStart(2, '0')} ${period}`;
};

export const Dashboard = ({ stats, upcomingJobs, recentBookings, recentMessages }: DashboardProps) => {
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
      <div class="page-header">
        <h2>Dashboard</h2>
        <div class="page-header-actions">
          <a
            href="/admin/jobs/new"
            class="uk-btn uk-btn-primary uk-btn-sm"
            hx-get="/admin/jobs/new"
            hx-target="#page-content"
            hx-select="#page-content"
            hx-push-url="true"
          >
            + New Job
          </a>
        </div>
      </div>

      <div class="p-4 md:p-8">
        <div class="grid gap-4 md:gap-6">
          <div class="grid grid-cols-2 gap-2.5 md:gap-4 xl:grid-cols-3">
            {statCards.map((card) => (
              <div class="uk-card uk-card-body" key={card.label}>
                <p class="text-2xl md:text-3xl font-semibold leading-none">{card.value}</p>
                <p class="text-xs md:text-sm text-muted-foreground mt-1.5 md:mt-2">{card.label}</p>
              </div>
            ))}
          </div>

          <div class="uk-card uk-card-body">
            <h3 class="text-base font-semibold mb-4">Upcoming Jobs</h3>
            {upcomingJobs.length === 0 ? (
              <p class="text-sm text-muted-foreground">No upcoming jobs in the next 7 days.</p>
            ) : (
              <>
                <div class="grid gap-2.5 md:hidden">
                  {upcomingJobs.map((job) => (
                    <article class="rounded-md border border-border p-3" key={job.id}>
                      <div class="flex items-start justify-between gap-3">
                        <a
                          href={`/admin/jobs/${job.id}`}
                          class="uk-link font-medium leading-tight min-w-0 flex-1 break-words"
                          hx-get={`/admin/jobs/${job.id}`}
                          hx-target="#page-content"
                          hx-select="#page-content"
                          hx-push-url="true"
                        >
                          {job.customer_name}
                        </a>
                        <span class="shrink-0"><StatusBadge status={job.status} /></span>
                      </div>
                      <p class="text-xs text-muted-foreground mt-1.5">
                        {shortDate(job.scheduled_date)} at {shortTime(job.scheduled_start_time)}
                      </p>
                    </article>
                  ))}
                </div>
                <div class="uk-overflow-auto hidden md:block">
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
                          <StatusBadge status={job.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </>
            )}
          </div>

          <div class="uk-card uk-card-body">
            <h3 class="text-base font-semibold mb-4">Recent Bookings</h3>
            {recentBookings.length === 0 ? (
              <p class="text-sm text-muted-foreground">No recent bookings.</p>
            ) : (
              <>
                <div class="grid gap-2.5 md:hidden">
                  {recentBookings.map((job) => (
                    <article class="rounded-md border border-border p-3" key={job.id}>
                      <div class="flex items-start justify-between gap-3">
                        <a
                          href={`/admin/jobs/${job.id}`}
                          class="uk-link font-medium leading-tight min-w-0 flex-1 break-words"
                          hx-get={`/admin/jobs/${job.id}`}
                          hx-target="#page-content"
                          hx-select="#page-content"
                          hx-push-url="true"
                        >
                          {job.customer_name}
                        </a>
                        <span class="shrink-0"><StatusBadge status={job.status} /></span>
                      </div>
                      <p class="text-xs text-muted-foreground mt-1 truncate">{job.service_name || 'Custom Service'}</p>
                      <div class="flex items-center justify-between mt-1.5 text-xs text-muted-foreground">
                        <span>Booked {shortDate(job.created_at)}</span>
                        <span class="font-medium text-foreground shrink-0 ml-2">{money(job.total_price_cents)}</span>
                      </div>
                    </article>
                  ))}
                </div>
                <div class="uk-overflow-auto hidden md:block">
                <table class="uk-table uk-table-divider uk-table-hover uk-table-sm w-full text-sm">
                  <thead>
                    <tr>
                      <th class="text-left">Customer</th>
                      <th class="text-left">Service</th>
                      <th class="text-left">Territory</th>
                      <th class="text-left">Status</th>
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
                        <td>{job.territory_name || '-'}</td>
                        <td>
                          <StatusBadge status={job.status} />
                        </td>
                        <td>{shortDate(job.created_at)}</td>
                        <td>{money(job.total_price_cents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </>
            )}
          </div>

          <div class="uk-card uk-card-body">
            <h3 class="text-base font-semibold mb-4">Recent Messages</h3>
            {recentMessages.length === 0 ? (
              <p class="text-sm text-muted-foreground">No recent messages.</p>
            ) : (
              <>
                <div class="grid gap-2.5 md:hidden">
                  {recentMessages.map((msg) => (
                    <article class="rounded-md border border-border p-3" key={msg.id}>
                      <div class="flex items-start justify-between gap-3">
                        <a
                          href={`/admin/inbox/${msg.id}`}
                          class={`uk-link leading-tight min-w-0 flex-1 break-words ${msg.is_read === 0 ? 'font-semibold' : 'font-medium'}`}
                          hx-get={`/admin/inbox/${msg.id}`}
                          hx-target="#page-content"
                          hx-select="#page-content"
                          hx-push-url="true"
                        >
                          {(msg.first_name && msg.last_name) ? `${msg.first_name} ${msg.last_name}` : msg.email || 'Unknown'}
                        </a>
                        <span class={`shrink-0 ${msg.is_read === 0 ? 'uk-label' : 'uk-label uk-label-primary'}`}><span class="badge-label">{msg.is_read === 0 ? 'Unread' : 'Read'}</span></span>
                      </div>
                      <p class="text-sm mt-1 truncate min-w-0">{msg.subject}</p>
                      <p class="text-xs text-muted-foreground mt-1.5">{shortDate(msg.created_at)}</p>
                    </article>
                  ))}
                </div>
                <div class="uk-overflow-auto hidden md:block">
                <table class="uk-table uk-table-divider uk-table-hover uk-table-sm w-full text-sm">
                  <thead>
                    <tr>
                      <th class="text-left">From</th>
                      <th class="text-left">Subject</th>
                      <th class="text-left">Date</th>
                      <th class="text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentMessages.map((msg) => (
                      <tr key={msg.id} class={msg.is_read === 0 ? 'font-semibold' : ''}>
                        <td>
                          <a
                            href={`/admin/inbox/${msg.id}`}
                            class="uk-link font-medium"
                            hx-get={`/admin/inbox/${msg.id}`}
                            hx-target="#page-content"
                            hx-select="#page-content"
                            hx-push-url="true"
                          >
                            {(msg.first_name && msg.last_name) ? `${msg.first_name} ${msg.last_name}` : msg.email || 'Unknown'}
                          </a>
                        </td>
                        <td class="truncate max-w-xs">{msg.subject}</td>
                        <td>{shortDate(msg.created_at)}</td>
                        <td>
                          <span class={msg.is_read === 0 ? 'uk-label' : 'uk-label uk-label-primary'}><span class="badge-label">{msg.is_read === 0 ? 'Unread' : 'Read'}</span></span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};
