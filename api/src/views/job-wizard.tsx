/** @jsx jsx */
import { jsx } from 'hono/jsx';
import { Layout } from './layout';
import { formatTorontoDate } from '../utils/datetime';

void jsx;

export interface WizardState {
  customer_id?: string;
  customer_name?: string;
  customer_email?: string;
  address_line1?: string;
  address_city?: string;
  address_state?: string;
  address_postal?: string;
  address_lat?: string;
  address_lng?: string;
  territory_id?: string;
  territory_name?: string;
  service_id?: string;
  service_name?: string;
  service_price?: string;
  service_duration?: string;
  date?: string;
  time?: string;
  provider_id?: string;
}

export interface NewJobProps {
  customer?: { id: string; first_name: string; last_name: string; email?: string; phone?: string };
  territories: Array<{ id: string; name: string }>;
  services: Array<{ id: string; name: string; description?: string; base_price_cents: number; base_duration_minutes: number }>;
  dates: string[];
  timeslots: string[];
  providers: Array<{ id: string; first_name: string; last_name: string; role: string; is_available: boolean }>;
  addressLine1?: string;
  selectedTerritoryId?: string;
  selectedServiceId?: string;
  selectedDate?: string;
  selectedTime?: string;
  selectedProviderId?: string;
  error?: string;
}

type WizardFlowProps = {
  step: number;
  state: WizardState;
  customer?: { id: string; first_name: string; last_name: string; email?: string; phone?: string };
  services?: Array<{ id: string; name: string; description?: string; base_price_cents: number; base_duration_minutes: number }>;
  timeslots?: Array<{ date: string; start_time: string; available: boolean }>;
  providers?: Array<{ id: string; first_name: string; last_name: string; role: string; is_available: boolean }>;
  error?: string;
};

const hasStep = (props: NewJobProps | WizardFlowProps): props is WizardFlowProps => {
  return 'step' in props;
};

const formatDateChip = (date: string) => {
  return formatTorontoDate(date, { weekday: 'short', month: 'short', day: 'numeric' }) || date;
};

const queryFromQuickProps = (props: NewJobProps) => {
  const query = new URLSearchParams();
  if (props.customer?.id) query.set('customer_id', props.customer.id);
  if (props.addressLine1) query.set('address_line1', props.addressLine1);
  if (props.selectedTerritoryId) query.set('territory_id', props.selectedTerritoryId);
  if (props.selectedServiceId) query.set('service_id', props.selectedServiceId);
  if (props.selectedDate) query.set('date', props.selectedDate);
  if (props.selectedTime) query.set('time', props.selectedTime);
  if (props.selectedProviderId) query.set('provider_id', props.selectedProviderId);
  return query;
};

const statePairs = (state: WizardState) => {
  const keys: Array<keyof WizardState> = [
    'customer_id', 'customer_name', 'customer_email',
    'address_line1', 'address_city', 'address_state', 'address_postal', 'address_lat', 'address_lng',
    'territory_id', 'territory_name',
    'service_id', 'service_name', 'service_price', 'service_duration',
    'date', 'time', 'provider_id',
  ];
  return keys.map((key) => ({ key, value: state[key] || '' }));
};

const HiddenWizardStateInputs = ({ state }: { state: WizardState }) => {
  return (
    <div>
      {statePairs(state).map((pair) => (
        <input key={pair.key} type="hidden" name={pair.key} value={pair.value} />
      ))}
    </div>
  );
};

const quickCreateBody = (props: NewJobProps) => {
  const query = queryFromQuickProps(props);
  const selectedService = props.services.find((s) => s.id === props.selectedServiceId);
  return (
    <div class="grid gap-6" style="max-width: 980px;">
      <div id="wizard-error-panel">
        {props.error && (
          <div class="uk-card uk-card-body" style="border: 1px solid #fecaca; background: #fff1f2;">
            <p class="text-sm" style="color: #b91c1c;">{props.error}</p>
          </div>
        )}
      </div>

      <div id="wizard-customer-panel" class="uk-card uk-card-body">
        <h3 class="text-base font-semibold mb-4">1. Customer</h3>
        <div class="grid gap-3 sm:grid-cols-2 items-end">
          <div class="grid gap-2 sm:col-span-2">
            <label class="uk-form-label" for="customer-search">Find Customer</label>
            <input id="customer-search" name="q" class="uk-input" placeholder="Search name or email" hx-get="/admin/api/customers/search" hx-trigger="input changed delay:300ms" hx-target="#customer-results" autocomplete="off" />
            <div id="customer-results"></div>
          </div>
          <div class="sm:col-span-2 text-sm">
            {props.customer ? (
              <span class="uk-label">{props.customer.first_name} {props.customer.last_name} ({props.customer.email || 'no email'})</span>
            ) : (
              <span class="text-muted-foreground">No customer selected.</span>
            )}
          </div>
        </div>
      </div>

      <div id="wizard-address-panel" class="uk-card uk-card-body">
        <h3 class="text-base font-semibold mb-4">2. Address</h3>
        <form
          hx-get="/admin/jobs/new"
          hx-target="#page-content"
          hx-select="#page-content"
          hx-push-url="true"
          class="grid gap-3"
        >
          {props.customer?.id && <input type="hidden" name="customer_id" value={props.customer.id} />}
          {props.selectedTerritoryId && <input type="hidden" name="territory_id" value={props.selectedTerritoryId} />}
          {props.selectedServiceId && <input type="hidden" name="service_id" value={props.selectedServiceId} />}
          {props.selectedDate && <input type="hidden" name="date" value={props.selectedDate} />}
          {props.selectedTime && <input type="hidden" name="time" value={props.selectedTime} />}
          {props.selectedProviderId && <input type="hidden" name="provider_id" value={props.selectedProviderId} />}

          <label class="uk-form-label" for="addr-line1">Address</label>
          <input id="addr-line1" name="address_line1" class="uk-input" value={props.addressLine1 || ''} placeholder="Start typing address" hx-get="/admin/api/address/search" hx-trigger="input changed delay:300ms" hx-target="#address-results" />
          <input id="addr-city" type="hidden" name="address_city" value="" />
          <input id="addr-state" type="hidden" name="address_state" value="" />
          <input id="addr-postal" type="hidden" name="address_postal" value="" />
          <input id="addr-lat" type="hidden" name="address_lat" value="" />
          <input id="addr-lng" type="hidden" name="address_lng" value="" />
          <div id="address-results"></div>
          <button type="submit" class="uk-btn uk-btn-default" style="width: fit-content;">Use Address</button>
        </form>
      </div>

      <div id="wizard-territory-panel" class="uk-card uk-card-body">
        <h3 class="text-base font-semibold mb-4">3. Territory</h3>
        <form hx-get="/admin/jobs/new" hx-target="#page-content" hx-select="#page-content" hx-push-url="true" class="grid gap-3">
          {props.customer?.id && <input type="hidden" name="customer_id" value={props.customer.id} />}
          {props.addressLine1 && <input type="hidden" name="address_line1" value={props.addressLine1} />}
          {props.selectedServiceId && <input type="hidden" name="service_id" value={props.selectedServiceId} />}
          {props.selectedDate && <input type="hidden" name="date" value={props.selectedDate} />}
          {props.selectedTime && <input type="hidden" name="time" value={props.selectedTime} />}
          {props.selectedProviderId && <input type="hidden" name="provider_id" value={props.selectedProviderId} />}

          <select name="territory_id" class="uk-select" required>
            <option value="">Select territory...</option>
            {props.territories.map((t) => <option key={t.id} value={t.id} selected={props.selectedTerritoryId === t.id}>{t.name}</option>)}
          </select>
          <button type="submit" class="uk-btn uk-btn-default" style="width: fit-content;">Select Territory</button>
        </form>
      </div>

      <div id="wizard-service-panel" class="uk-card uk-card-body">
        <h3 class="text-base font-semibold mb-4">4. Service</h3>
        <form hx-get="/admin/jobs/new" hx-target="#page-content" hx-select="#page-content" hx-push-url="true" class="grid gap-3">
          {props.customer?.id && <input type="hidden" name="customer_id" value={props.customer.id} />}
          {props.addressLine1 && <input type="hidden" name="address_line1" value={props.addressLine1} />}
          {props.selectedTerritoryId && <input type="hidden" name="territory_id" value={props.selectedTerritoryId} />}
          {props.selectedDate && <input type="hidden" name="date" value={props.selectedDate} />}
          {props.selectedTime && <input type="hidden" name="time" value={props.selectedTime} />}
          {props.selectedProviderId && <input type="hidden" name="provider_id" value={props.selectedProviderId} />}

          <select name="service_id" class="uk-select" required>
            <option value="">Select service...</option>
            {props.services.map((s) => <option key={s.id} value={s.id} selected={props.selectedServiceId === s.id}>{s.name}</option>)}
          </select>
          {selectedService && (
            <p class="text-sm text-muted-foreground">{selectedService.base_duration_minutes} min • ${(selectedService.base_price_cents / 100).toFixed(2)}</p>
          )}
          <button type="submit" class="uk-btn uk-btn-default" style="width: fit-content;">Select Service</button>
        </form>
      </div>

      <div id="wizard-date-panel" class="uk-card uk-card-body">
        <h3 class="text-base font-semibold mb-4">5. Date</h3>
        <div class="flex flex-wrap gap-2">
          {props.dates.map((date) => {
            const q = new URLSearchParams(query);
            q.set('date', date);
            q.delete('time');
            q.delete('provider_id');
            const active = props.selectedDate === date;
            return (
              <a
                key={date}
                href={`/admin/jobs/new?${q.toString()}`}
                class={active ? 'uk-btn uk-btn-primary uk-btn-sm' : 'uk-btn uk-btn-default uk-btn-sm'}
                hx-get={`/admin/jobs/new?${q.toString()}`}
                hx-target="#page-content"
                hx-select="#page-content"
                hx-push-url="true"
              >
                {formatDateChip(date)}
              </a>
            );
          })}
        </div>
      </div>

      <div id="wizard-time-panel" class="uk-card uk-card-body">
        <h3 class="text-base font-semibold mb-4">6. Time</h3>
        {props.timeslots.length === 0 ? (
          <p class="text-sm text-muted-foreground">Select a service and date first.</p>
        ) : (
          <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {props.timeslots.map((time) => {
              const q = new URLSearchParams(query);
              q.set('time', time);
              q.delete('provider_id');
              const active = props.selectedTime === time;
              return (
                <a
                  key={time}
                  href={`/admin/jobs/new?${q.toString()}`}
                  class={active ? 'uk-btn uk-btn-primary uk-btn-sm' : 'uk-btn uk-btn-default uk-btn-sm'}
                  hx-get={`/admin/jobs/new?${q.toString()}`}
                  hx-target="#page-content"
                  hx-select="#page-content"
                  hx-push-url="true"
                >
                  {time}
                </a>
              );
            })}
          </div>
        )}
      </div>

      <div id="wizard-provider-panel" class="uk-card uk-card-body">
        <h3 class="text-base font-semibold mb-4">7. Provider</h3>
        <form hx-get="/admin/jobs/new" hx-target="#page-content" hx-select="#page-content" hx-push-url="true" class="grid gap-3">
          {props.customer?.id && <input type="hidden" name="customer_id" value={props.customer.id} />}
          {props.addressLine1 && <input type="hidden" name="address_line1" value={props.addressLine1} />}
          {props.selectedTerritoryId && <input type="hidden" name="territory_id" value={props.selectedTerritoryId} />}
          {props.selectedServiceId && <input type="hidden" name="service_id" value={props.selectedServiceId} />}
          {props.selectedDate && <input type="hidden" name="date" value={props.selectedDate} />}
          {props.selectedTime && <input type="hidden" name="time" value={props.selectedTime} />}

          <select name="provider_id" class="uk-select">
            <option value="">Auto-assign later</option>
            {props.providers.map((p) => (
              <option key={p.id} value={p.id} selected={props.selectedProviderId === p.id}>
                {p.first_name} {p.last_name} {p.is_available ? '' : '(unavailable)'}
              </option>
            ))}
          </select>
          <button type="submit" class="uk-btn uk-btn-default" style="width: fit-content;">Select Provider</button>
        </form>
      </div>

      <div id="wizard-submit-panel" class="uk-card uk-card-body">
        <h3 class="text-base font-semibold mb-4">8. Create Job</h3>
        <form hx-post="/admin/jobs/quick-create" hx-target="#page-content" hx-select="#page-content" hx-push-url="true" class="grid gap-3">
          <input type="hidden" name="customer_id" value={props.customer?.id || ''} />
          <input type="hidden" name="address_line1" value={props.addressLine1 || ''} />
          <input type="hidden" name="territory_id" value={props.selectedTerritoryId || ''} />
          <input type="hidden" name="service_id" value={props.selectedServiceId || ''} />
          <input type="hidden" name="date" value={props.selectedDate || ''} />
          <input type="hidden" name="time" value={props.selectedTime || ''} />
          <input type="hidden" name="provider_id" value={props.selectedProviderId || ''} />
          <button type="submit" class="uk-btn uk-btn-primary">Create Job</button>
        </form>
      </div>

      <script>{`
        (function () {
          if (window.__jobWizardCustomerBind) return;
          window.__jobWizardCustomerBind = true;
          document.addEventListener('click', function (e) {
            var item = e.target.closest('.customer-result');
            if (!item) return;
            var data = item.dataset;
            var params = new URLSearchParams(window.location.search);
            if (data.id) params.set('customer_id', data.id);
            if (params.get('error')) params.delete('error');
            var url = '/admin/jobs/new?' + params.toString();
            if (window.htmx) {
              window.htmx.ajax('GET', url, { target: '#page-content', swap: 'innerHTML' });
              window.history.pushState({}, '', url);
            } else {
              window.location.href = url;
            }
          });
        })();
      `}</script>
    </div>
  );
};

const wizardFlowBody = (props: WizardFlowProps) => {
  return (
    <div class="grid gap-6" style="max-width: 800px;">
      {props.error && (
        <div class="uk-card uk-card-body" style="border: 1px solid #fecaca; background: #fff1f2;">
          <p class="text-sm" style="color: #b91c1c;">{props.error}</p>
        </div>
      )}

      {props.step === 1 && (
        <div class="uk-card uk-card-body">
          <h3 class="text-base font-semibold mb-4">Step 1: Customer & Address</h3>
          <form hx-post="/admin/jobs/wizard/step1-address" hx-target="#page-content" hx-select="#page-content" class="grid gap-4">
            <input type="hidden" name="customer_id" value={props.state.customer_id || props.customer?.id || ''} />
            <input type="hidden" name="customer_name" value={props.state.customer_name || `${props.customer?.first_name || ''} ${props.customer?.last_name || ''}`.trim()} />
            <input type="hidden" name="customer_email" value={props.state.customer_email || props.customer?.email || ''} />
            <div class="text-sm">
              <span class="text-muted-foreground">Customer:</span>{' '}
              <span class="font-medium">{props.state.customer_name || `${props.customer?.first_name || ''} ${props.customer?.last_name || ''}`.trim() || 'Unknown'}</span>
            </div>
            <div class="grid gap-2">
              <label class="uk-form-label" for="wizard-address">Address line 1</label>
              <input id="wizard-address" name="address_line1" class="uk-input" value={props.state.address_line1 || ''} hx-get="/admin/api/address/search" hx-trigger="input changed delay:300ms" hx-target="#address-results" />
              <div id="address-results"></div>
            </div>
            <input id="addr-city" type="hidden" name="address_city" value={props.state.address_city || ''} />
            <input id="addr-state" type="hidden" name="address_state" value={props.state.address_state || ''} />
            <input id="addr-postal" type="hidden" name="address_postal" value={props.state.address_postal || ''} />
            <input id="addr-lat" type="hidden" name="address_lat" value={props.state.address_lat || ''} />
            <input id="addr-lng" type="hidden" name="address_lng" value={props.state.address_lng || ''} />
            <button type="submit" class="uk-btn uk-btn-primary">Continue</button>
          </form>
        </div>
      )}

      {props.step === 2 && (
        <div class="uk-card uk-card-body">
          <h3 class="text-base font-semibold mb-4">Step 2: Service</h3>
          <form hx-post="/admin/jobs/wizard/step3" hx-target="#page-content" hx-select="#page-content" class="grid gap-4">
            <HiddenWizardStateInputs state={props.state} />
            <input id="wizard-service-name" type="hidden" name="service_name" value={props.state.service_name || ''} />
            <input id="wizard-service-price" type="hidden" name="service_price" value={props.state.service_price || ''} />
            <input id="wizard-service-duration" type="hidden" name="service_duration" value={props.state.service_duration || ''} />
            <div class="grid gap-2">
              <label class="uk-form-label" for="wizard-service-id">Select Service</label>
              <select id="wizard-service-id" name="service_id" class="uk-select" required>
                <option value="">Select...</option>
                {(props.services || []).map((service) => (
                  <option key={service.id} value={service.id} selected={props.state.service_id === service.id} data-name={service.name} data-price={String(service.base_price_cents)} data-duration={String(service.base_duration_minutes)}>
                    {service.name} (${(service.base_price_cents / 100).toFixed(2)}, {service.base_duration_minutes}m)
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" class="uk-btn uk-btn-primary">Continue</button>
            <script>{`
              (function () {
                var select = document.getElementById('wizard-service-id');
                var nameEl = document.getElementById('wizard-service-name');
                var priceEl = document.getElementById('wizard-service-price');
                var durationEl = document.getElementById('wizard-service-duration');
                if (!select || !nameEl || !priceEl || !durationEl) return;
                function sync() {
                  var opt = select.options[select.selectedIndex];
                  nameEl.value = opt ? (opt.getAttribute('data-name') || '') : '';
                  priceEl.value = opt ? (opt.getAttribute('data-price') || '') : '';
                  durationEl.value = opt ? (opt.getAttribute('data-duration') || '') : '';
                }
                select.addEventListener('change', sync);
                sync();
              })();
            `}</script>
          </form>
        </div>
      )}

      {props.step === 3 && (
        <div class="uk-card uk-card-body">
          <h3 class="text-base font-semibold mb-4">Step 3: Date & Time</h3>
          <form hx-post="/admin/jobs/wizard/step4" hx-target="#page-content" hx-select="#page-content" class="grid gap-4">
            <HiddenWizardStateInputs state={props.state} />
            <div class="grid gap-3 sm:grid-cols-2">
              <div class="grid gap-2">
                <label class="uk-form-label" for="wizard-date">Date</label>
                <input id="wizard-date" type="date" name="date" class="uk-input" value={props.state.date || ''} required />
              </div>
              <div class="grid gap-2">
                <label class="uk-form-label" for="wizard-time">Time</label>
                <select id="wizard-time" name="time" class="uk-select" required>
                  <option value="">Select...</option>
                  {(props.timeslots || []).map((slot) => (
                    <option key={`${slot.date}-${slot.start_time}`} value={slot.start_time} selected={props.state.time === slot.start_time}>
                      {slot.date} {slot.start_time} {slot.available ? '' : '(unavailable)'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button type="submit" class="uk-btn uk-btn-primary">Continue</button>
          </form>
        </div>
      )}

      {props.step === 4 && (
        <div class="uk-card uk-card-body">
          <h3 class="text-base font-semibold mb-4">Step 4: Provider</h3>
          <form hx-post="/admin/jobs/create" hx-target="#page-content" hx-select="#page-content" class="grid gap-4">
            <HiddenWizardStateInputs state={props.state} />
            <div class="grid gap-2">
              <label class="uk-form-label" for="wizard-provider">Provider</label>
              <select id="wizard-provider" name="provider_id" class="uk-select">
                <option value="">Auto-assign later</option>
                {(props.providers || []).map((provider) => (
                  <option key={provider.id} value={provider.id} selected={props.state.provider_id === provider.id}>
                    {provider.first_name} {provider.last_name} {provider.is_available ? '' : '(unavailable)'}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" class="uk-btn uk-btn-primary">Create Job</button>
          </form>
        </div>
      )}
    </div>
  );
};

export const JobWizardPage = (props: NewJobProps | WizardFlowProps) => {
  const title = hasStep(props) ? `New Job - Step ${props.step}` : 'Create Job';
  return (
    <Layout title={title}>
      <div class="flex items-center justify-between px-4 pl-14 py-4 md:px-8 md:pl-8 md:py-5 bg-white border-b border-border sticky top-0 z-50">
        <h2 class="text-xl font-semibold">{title}</h2>
        <a href="/admin/jobs" class="uk-btn uk-btn-default uk-btn-sm" hx-get="/admin/jobs" hx-target="#page-content" hx-select="#page-content" hx-push-url="true">Back</a>
      </div>
      <div class="p-8">
        {hasStep(props) ? wizardFlowBody(props) : quickCreateBody(props)}
      </div>
    </Layout>
  );
};

export const JobWizardSwapBundle = ({ props, targetId }: { props: NewJobProps | WizardFlowProps; targetId: string }) => {
  if (hasStep(props)) {
    return wizardFlowBody(props);
  }

  const body = quickCreateBody(props);
  if (targetId === 'wizard-customer-panel') return <div id="wizard-customer-panel">{body}</div>;
  if (targetId === 'wizard-address-panel') return <div id="wizard-address-panel">{body}</div>;
  if (targetId === 'wizard-territory-panel') return <div id="wizard-territory-panel">{body}</div>;
  if (targetId === 'wizard-service-panel') return <div id="wizard-service-panel">{body}</div>;
  if (targetId === 'wizard-date-panel') return <div id="wizard-date-panel">{body}</div>;
  if (targetId === 'wizard-time-panel') return <div id="wizard-time-panel">{body}</div>;
  if (targetId === 'wizard-provider-panel') return <div id="wizard-provider-panel">{body}</div>;
  if (targetId === 'wizard-submit-panel') return <div id="wizard-submit-panel">{body}</div>;
  if (targetId === 'wizard-error-panel') return <div id="wizard-error-panel">{body}</div>;
  return body;
};

export const CustomerSearchResults = ({ customers }: { customers: Array<{ id: string; first_name: string; last_name: string; email?: string }> }) => {
  if (!customers.length) {
    return <div class="search-results"><div class="search-item text-muted-foreground">No customers found.</div></div>;
  }

  return (
    <div class="search-results">
      {customers.map((customer) => (
        <div
          key={customer.id}
          class="search-item customer-result"
          data-id={customer.id}
          data-name={`${customer.first_name} ${customer.last_name}`}
          data-email={customer.email || ''}
        >
          <div class="name">{customer.first_name} {customer.last_name}</div>
          <div class="meta">{customer.email || 'No email'}</div>
        </div>
      ))}
    </div>
  );
};

export const AddressSearchResults = ({
  results,
  targetPrefix,
}: {
  results: Array<{ display: string; line1: string; city: string; state: string; postal: string; lat: string; lng: string }>;
  targetPrefix?: string;
}) => {
  if (!results.length) {
    return <div class="search-results"><div class="search-item text-muted-foreground">No addresses found.</div></div>;
  }

  return (
    <div class="search-results">
      {results.map((result, i) => (
        <div
          key={`${result.display}-${i}`}
          class="search-item address-result"
          data-prefix={targetPrefix || 'addr'}
          data-line1={result.line1}
          data-city={result.city}
          data-state={result.state}
          data-postal={result.postal}
          data-lat={result.lat}
          data-lng={result.lng}
        >
          <div class="name">{result.display || result.line1}</div>
          <div class="meta">{result.city}{result.state ? `, ${result.state}` : ''} {result.postal}</div>
        </div>
      ))}
    </div>
  );
};

export const parseWizardState = (body: Record<string, unknown>): WizardState => {
  const get = (key: keyof WizardState) => {
    const value = body[key as string];
    return typeof value === 'string' ? value : undefined;
  };

  return {
    customer_id: get('customer_id'),
    customer_name: get('customer_name'),
    customer_email: get('customer_email'),
    address_line1: get('address_line1'),
    address_city: get('address_city'),
    address_state: get('address_state'),
    address_postal: get('address_postal'),
    address_lat: get('address_lat'),
    address_lng: get('address_lng'),
    territory_id: get('territory_id'),
    territory_name: get('territory_name'),
    service_id: get('service_id'),
    service_name: get('service_name'),
    service_price: get('service_price'),
    service_duration: get('service_duration'),
    date: get('date'),
    time: get('time'),
    provider_id: get('provider_id'),
  };
};
