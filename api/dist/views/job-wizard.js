import { jsx as _jsx, jsxs as _jsxs } from "hono/jsx/jsx-runtime";
import { Layout } from './layout';
import { formatTorontoDate } from '../utils/datetime';
const hasStep = (props) => {
    return 'step' in props;
};
const formatDateChip = (date) => {
    return formatTorontoDate(date, { weekday: 'short', month: 'short', day: 'numeric' }) || date;
};
const queryFromQuickProps = (props) => {
    const query = new URLSearchParams();
    if (props.customer?.id)
        query.set('customer_id', props.customer.id);
    if (props.addressLine1)
        query.set('address_line1', props.addressLine1);
    if (props.addressCity)
        query.set('address_city', props.addressCity);
    if (props.addressState)
        query.set('address_state', props.addressState);
    if (props.addressPostal)
        query.set('address_postal', props.addressPostal);
    if (props.addressLat)
        query.set('address_lat', props.addressLat);
    if (props.addressLng)
        query.set('address_lng', props.addressLng);
    if (props.selectedTerritoryId)
        query.set('territory_id', props.selectedTerritoryId);
    if (props.selectedServiceId)
        query.set('service_id', props.selectedServiceId);
    if (props.selectedDate)
        query.set('date', props.selectedDate);
    if (props.selectedTime)
        query.set('time', props.selectedTime);
    if (props.selectedProviderId)
        query.set('provider_id', props.selectedProviderId);
    return query;
};
const statePairs = (state) => {
    const keys = [
        'customer_id', 'customer_name', 'customer_email',
        'address_line1', 'address_city', 'address_state', 'address_postal', 'address_lat', 'address_lng',
        'territory_id', 'territory_name',
        'service_id', 'service_name', 'service_price', 'service_duration',
        'date', 'time', 'provider_id',
    ];
    return keys.map((key) => ({ key, value: state[key] || '' }));
};
const HiddenWizardStateInputs = ({ state }) => {
    return (_jsx("div", { children: statePairs(state).map((pair) => (_jsx("input", { type: "hidden", name: pair.key, value: pair.value }, pair.key))) }));
};
const quickCreateBody = (props) => {
    const query = queryFromQuickProps(props);
    const selectedService = props.services.find((s) => s.id === props.selectedServiceId);
    return (_jsxs("div", { class: "grid gap-6", style: "max-width: 980px;", children: [_jsx("div", { id: "wizard-error-panel", children: props.error && (_jsx("div", { class: "uk-card uk-card-body", style: "border: 1px solid #fecaca; background: #fff1f2;", children: _jsx("p", { class: "text-sm", style: "color: #b91c1c;", children: props.error }) })) }), _jsxs("div", { id: "wizard-customer-panel", class: "uk-card uk-card-body", children: [_jsx("h3", { class: "text-base font-semibold mb-4", children: "1. Customer" }), _jsxs("div", { class: "grid gap-3 sm:grid-cols-2 items-end", children: [_jsxs("div", { class: "grid gap-2 sm:col-span-2", children: [_jsx("label", { class: "uk-form-label", for: "customer-search", children: "Find Customer" }), _jsx("input", { id: "customer-search", name: "q", class: "uk-input", placeholder: "Search name or email", "hx-get": "/admin/api/customers/search", "hx-trigger": "input changed delay:300ms", "hx-target": "#customer-results", autocomplete: "off", inputmode: "search", autocapitalize: "off", spellcheck: "false" }), _jsx("div", { id: "customer-results" })] }), _jsx("div", { class: "sm:col-span-2 text-sm", children: props.customer ? (_jsxs("span", { class: "uk-label", children: [props.customer.first_name, " ", props.customer.last_name, " (", props.customer.email || 'no email', ")"] })) : (_jsx("span", { class: "text-muted-foreground", children: "No customer selected." })) })] })] }), _jsxs("div", { id: "wizard-address-panel", class: "uk-card uk-card-body", children: [_jsx("h3", { class: "text-base font-semibold mb-4", children: "2. Address" }), _jsxs("form", { "hx-get": "/admin/jobs/new", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true", class: "grid gap-3", children: [props.customer?.id && _jsx("input", { type: "hidden", name: "customer_id", value: props.customer.id }), props.selectedTerritoryId && _jsx("input", { type: "hidden", name: "territory_id", value: props.selectedTerritoryId }), props.selectedServiceId && _jsx("input", { type: "hidden", name: "service_id", value: props.selectedServiceId }), props.selectedDate && _jsx("input", { type: "hidden", name: "date", value: props.selectedDate }), props.selectedTime && _jsx("input", { type: "hidden", name: "time", value: props.selectedTime }), props.selectedProviderId && _jsx("input", { type: "hidden", name: "provider_id", value: props.selectedProviderId }), _jsxs("div", { class: "flex flex-wrap items-center justify-between gap-2", children: [_jsx("label", { class: "uk-form-label", for: "addr-line1", children: "Address" }), _jsx("button", { type: "button", class: "uk-btn uk-btn-default uk-btn-sm", "data-address-gps-btn": true, "data-address-input": "#addr-line1", "data-address-results": "#address-results", "data-address-lat": "#addr-lat", "data-address-lng": "#addr-lng", children: "Use Current Location" })] }), _jsx("input", { id: "addr-line1", name: "address_line1", class: "uk-input", value: props.addressLine1 || '', placeholder: "Start typing address", "hx-get": "/admin/api/address/search", "hx-trigger": "input changed delay:300ms", "hx-target": "#address-results", "hx-select": ".search-results", "hx-push-url": "false", autocomplete: "address-line1" }), _jsx("input", { id: "addr-city", type: "hidden", name: "address_city", value: props.addressCity || '' }), _jsx("input", { id: "addr-state", type: "hidden", name: "address_state", value: props.addressState || '' }), _jsx("input", { id: "addr-postal", type: "hidden", name: "address_postal", value: props.addressPostal || '' }), _jsx("input", { id: "addr-lat", type: "hidden", name: "address_lat", value: props.addressLat || '' }), _jsx("input", { id: "addr-lng", type: "hidden", name: "address_lng", value: props.addressLng || '' }), _jsx("div", { id: "address-results" }), _jsx("button", { type: "submit", class: "uk-btn uk-btn-default", style: "width: fit-content;", children: "Use Address" })] })] }), _jsxs("div", { id: "wizard-territory-panel", class: "uk-card uk-card-body", children: [_jsx("h3", { class: "text-base font-semibold mb-4", children: "3. Territory" }), _jsxs("form", { "hx-get": "/admin/jobs/new", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true", class: "grid gap-3", children: [props.customer?.id && _jsx("input", { type: "hidden", name: "customer_id", value: props.customer.id }), props.addressLine1 && _jsx("input", { type: "hidden", name: "address_line1", value: props.addressLine1 }), props.addressCity && _jsx("input", { type: "hidden", name: "address_city", value: props.addressCity }), props.addressState && _jsx("input", { type: "hidden", name: "address_state", value: props.addressState }), props.addressPostal && _jsx("input", { type: "hidden", name: "address_postal", value: props.addressPostal }), props.addressLat && _jsx("input", { type: "hidden", name: "address_lat", value: props.addressLat }), props.addressLng && _jsx("input", { type: "hidden", name: "address_lng", value: props.addressLng }), props.selectedServiceId && _jsx("input", { type: "hidden", name: "service_id", value: props.selectedServiceId }), props.selectedDate && _jsx("input", { type: "hidden", name: "date", value: props.selectedDate }), props.selectedTime && _jsx("input", { type: "hidden", name: "time", value: props.selectedTime }), props.selectedProviderId && _jsx("input", { type: "hidden", name: "provider_id", value: props.selectedProviderId }), _jsxs("select", { name: "territory_id", class: "uk-select", required: true, children: [_jsx("option", { value: "", children: "Select territory..." }), props.territories.map((t) => _jsx("option", { value: t.id, selected: props.selectedTerritoryId === t.id, children: t.name }, t.id))] }), _jsx("button", { type: "submit", class: "uk-btn uk-btn-default", style: "width: fit-content;", children: "Select Territory" })] })] }), _jsxs("div", { id: "wizard-service-panel", class: "uk-card uk-card-body", children: [_jsx("h3", { class: "text-base font-semibold mb-4", children: "4. Service" }), _jsxs("form", { "hx-get": "/admin/jobs/new", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true", class: "grid gap-3", children: [props.customer?.id && _jsx("input", { type: "hidden", name: "customer_id", value: props.customer.id }), props.addressLine1 && _jsx("input", { type: "hidden", name: "address_line1", value: props.addressLine1 }), props.addressCity && _jsx("input", { type: "hidden", name: "address_city", value: props.addressCity }), props.addressState && _jsx("input", { type: "hidden", name: "address_state", value: props.addressState }), props.addressPostal && _jsx("input", { type: "hidden", name: "address_postal", value: props.addressPostal }), props.addressLat && _jsx("input", { type: "hidden", name: "address_lat", value: props.addressLat }), props.addressLng && _jsx("input", { type: "hidden", name: "address_lng", value: props.addressLng }), props.selectedTerritoryId && _jsx("input", { type: "hidden", name: "territory_id", value: props.selectedTerritoryId }), props.selectedDate && _jsx("input", { type: "hidden", name: "date", value: props.selectedDate }), props.selectedTime && _jsx("input", { type: "hidden", name: "time", value: props.selectedTime }), props.selectedProviderId && _jsx("input", { type: "hidden", name: "provider_id", value: props.selectedProviderId }), _jsxs("select", { name: "service_id", class: "uk-select", required: true, children: [_jsx("option", { value: "", children: "Select service..." }), props.services.map((s) => _jsx("option", { value: s.id, selected: props.selectedServiceId === s.id, children: s.name }, s.id))] }), selectedService && (_jsxs("p", { class: "text-sm text-muted-foreground", children: [selectedService.base_duration_minutes, " min \u2022 $", (selectedService.base_price_cents / 100).toFixed(2)] })), _jsx("button", { type: "submit", class: "uk-btn uk-btn-default", style: "width: fit-content;", children: "Select Service" })] })] }), _jsxs("div", { id: "wizard-date-panel", class: "uk-card uk-card-body", children: [_jsx("h3", { class: "text-base font-semibold mb-4", children: "5. Date" }), _jsx("div", { class: "flex flex-wrap gap-2", children: props.dates.map((date) => {
                            const q = new URLSearchParams(query);
                            q.set('date', date);
                            q.delete('time');
                            q.delete('provider_id');
                            const active = props.selectedDate === date;
                            return (_jsx("a", { href: `/admin/jobs/new?${q.toString()}`, class: active ? 'uk-btn uk-btn-primary uk-btn-sm' : 'uk-btn uk-btn-default uk-btn-sm', "hx-get": `/admin/jobs/new?${q.toString()}`, "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true", children: formatDateChip(date) }, date));
                        }) })] }), _jsxs("div", { id: "wizard-time-panel", class: "uk-card uk-card-body", children: [_jsx("h3", { class: "text-base font-semibold mb-4", children: "6. Time" }), props.timeslots.length === 0 ? (_jsx("p", { class: "text-sm text-muted-foreground", children: "Select a service and date first." })) : (_jsx("div", { class: "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2", children: props.timeslots.map((time) => {
                            const q = new URLSearchParams(query);
                            q.set('time', time);
                            q.delete('provider_id');
                            const active = props.selectedTime === time;
                            return (_jsx("a", { href: `/admin/jobs/new?${q.toString()}`, class: active ? 'uk-btn uk-btn-primary uk-btn-sm' : 'uk-btn uk-btn-default uk-btn-sm', "hx-get": `/admin/jobs/new?${q.toString()}`, "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true", children: time }, time));
                        }) }))] }), _jsxs("div", { id: "wizard-provider-panel", class: "uk-card uk-card-body", children: [_jsx("h3", { class: "text-base font-semibold mb-4", children: "7. Provider" }), _jsxs("form", { "hx-get": "/admin/jobs/new", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true", class: "grid gap-3", children: [props.customer?.id && _jsx("input", { type: "hidden", name: "customer_id", value: props.customer.id }), props.addressLine1 && _jsx("input", { type: "hidden", name: "address_line1", value: props.addressLine1 }), props.addressCity && _jsx("input", { type: "hidden", name: "address_city", value: props.addressCity }), props.addressState && _jsx("input", { type: "hidden", name: "address_state", value: props.addressState }), props.addressPostal && _jsx("input", { type: "hidden", name: "address_postal", value: props.addressPostal }), props.addressLat && _jsx("input", { type: "hidden", name: "address_lat", value: props.addressLat }), props.addressLng && _jsx("input", { type: "hidden", name: "address_lng", value: props.addressLng }), props.selectedTerritoryId && _jsx("input", { type: "hidden", name: "territory_id", value: props.selectedTerritoryId }), props.selectedServiceId && _jsx("input", { type: "hidden", name: "service_id", value: props.selectedServiceId }), props.selectedDate && _jsx("input", { type: "hidden", name: "date", value: props.selectedDate }), props.selectedTime && _jsx("input", { type: "hidden", name: "time", value: props.selectedTime }), _jsxs("select", { name: "provider_id", class: "uk-select", children: [_jsx("option", { value: "", children: "Auto-assign later" }), props.providers.map((p) => (_jsxs("option", { value: p.id, selected: props.selectedProviderId === p.id, children: [p.first_name, " ", p.last_name, " ", p.is_available ? '' : '(unavailable)'] }, p.id)))] }), _jsx("button", { type: "submit", class: "uk-btn uk-btn-default", style: "width: fit-content;", children: "Select Provider" })] })] }), _jsxs("div", { id: "wizard-submit-panel", class: "uk-card uk-card-body", children: [_jsx("h3", { class: "text-base font-semibold mb-4", children: "8. Create Job" }), _jsxs("form", { "hx-post": "/admin/jobs/quick-create", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true", class: "grid gap-3", children: [_jsx("input", { type: "hidden", name: "customer_id", value: props.customer?.id || '' }), _jsx("input", { type: "hidden", name: "address_line1", value: props.addressLine1 || '' }), _jsx("input", { type: "hidden", name: "address_city", value: props.addressCity || '' }), _jsx("input", { type: "hidden", name: "address_state", value: props.addressState || '' }), _jsx("input", { type: "hidden", name: "address_postal", value: props.addressPostal || '' }), _jsx("input", { type: "hidden", name: "address_lat", value: props.addressLat || '' }), _jsx("input", { type: "hidden", name: "address_lng", value: props.addressLng || '' }), _jsx("input", { type: "hidden", name: "territory_id", value: props.selectedTerritoryId || '' }), _jsx("input", { type: "hidden", name: "service_id", value: props.selectedServiceId || '' }), _jsx("input", { type: "hidden", name: "date", value: props.selectedDate || '' }), _jsx("input", { type: "hidden", name: "time", value: props.selectedTime || '' }), _jsx("input", { type: "hidden", name: "provider_id", value: props.selectedProviderId || '' }), _jsx("button", { type: "submit", class: "uk-btn uk-btn-primary", children: "Create Job" })] })] }), _jsx("script", { children: `
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
      ` })] }));
};
const wizardFlowBody = (props) => {
    return (_jsxs("div", { class: "grid gap-6", style: "max-width: 800px;", children: [props.error && (_jsx("div", { class: "uk-card uk-card-body", style: "border: 1px solid #fecaca; background: #fff1f2;", children: _jsx("p", { class: "text-sm", style: "color: #b91c1c;", children: props.error }) })), props.step === 1 && (_jsxs("div", { class: "uk-card uk-card-body", children: [_jsx("h3", { class: "text-base font-semibold mb-4", children: "Step 1: Customer & Address" }), _jsxs("form", { "hx-post": "/admin/jobs/wizard/step1-address", "hx-target": "#page-content", "hx-select": "#page-content", class: "grid gap-4", children: [_jsx("input", { type: "hidden", name: "customer_id", value: props.state.customer_id || props.customer?.id || '' }), _jsx("input", { type: "hidden", name: "customer_name", value: props.state.customer_name || `${props.customer?.first_name || ''} ${props.customer?.last_name || ''}`.trim() }), _jsx("input", { type: "hidden", name: "customer_email", value: props.state.customer_email || props.customer?.email || '' }), _jsxs("div", { class: "text-sm", children: [_jsx("span", { class: "text-muted-foreground", children: "Customer:" }), ' ', _jsx("span", { class: "font-medium", children: props.state.customer_name || `${props.customer?.first_name || ''} ${props.customer?.last_name || ''}`.trim() || 'Unknown' })] }), _jsxs("div", { class: "grid gap-2", children: [_jsxs("div", { class: "flex flex-wrap items-center justify-between gap-2", children: [_jsx("label", { class: "uk-form-label", for: "wizard-address", children: "Address line 1" }), _jsx("button", { type: "button", class: "uk-btn uk-btn-default uk-btn-sm", "data-address-gps-btn": true, "data-address-input": "#wizard-address", "data-address-results": "#address-results", "data-address-lat": "#addr-lat", "data-address-lng": "#addr-lng", children: "Use Current Location" })] }), _jsx("input", { id: "wizard-address", name: "address_line1", class: "uk-input", value: props.state.address_line1 || '', "hx-get": "/admin/api/address/search", "hx-trigger": "input changed delay:300ms", "hx-target": "#address-results", "hx-select": ".search-results", "hx-push-url": "false", autocomplete: "address-line1" }), _jsx("div", { id: "address-results" })] }), _jsx("input", { id: "addr-city", type: "hidden", name: "address_city", value: props.state.address_city || '' }), _jsx("input", { id: "addr-state", type: "hidden", name: "address_state", value: props.state.address_state || '' }), _jsx("input", { id: "addr-postal", type: "hidden", name: "address_postal", value: props.state.address_postal || '' }), _jsx("input", { id: "addr-lat", type: "hidden", name: "address_lat", value: props.state.address_lat || '' }), _jsx("input", { id: "addr-lng", type: "hidden", name: "address_lng", value: props.state.address_lng || '' }), _jsx("button", { type: "submit", class: "uk-btn uk-btn-primary", children: "Continue" })] })] })), props.step === 2 && (_jsxs("div", { class: "uk-card uk-card-body", children: [_jsx("h3", { class: "text-base font-semibold mb-4", children: "Step 2: Service" }), _jsxs("form", { "hx-post": "/admin/jobs/wizard/step3", "hx-target": "#page-content", "hx-select": "#page-content", class: "grid gap-4", children: [_jsx(HiddenWizardStateInputs, { state: props.state }), _jsx("input", { id: "wizard-service-name", type: "hidden", name: "service_name", value: props.state.service_name || '' }), _jsx("input", { id: "wizard-service-price", type: "hidden", name: "service_price", value: props.state.service_price || '' }), _jsx("input", { id: "wizard-service-duration", type: "hidden", name: "service_duration", value: props.state.service_duration || '' }), _jsxs("div", { class: "grid gap-2", children: [_jsx("label", { class: "uk-form-label", for: "wizard-service-id", children: "Select Service" }), _jsxs("select", { id: "wizard-service-id", name: "service_id", class: "uk-select", required: true, children: [_jsx("option", { value: "", children: "Select..." }), (props.services || []).map((service) => (_jsxs("option", { value: service.id, selected: props.state.service_id === service.id, "data-name": service.name, "data-price": String(service.base_price_cents), "data-duration": String(service.base_duration_minutes), children: [service.name, " ($", (service.base_price_cents / 100).toFixed(2), ", ", service.base_duration_minutes, "m)"] }, service.id)))] })] }), _jsx("button", { type: "submit", class: "uk-btn uk-btn-primary", children: "Continue" }), _jsx("script", { children: `
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
            ` })] })] })), props.step === 3 && (_jsxs("div", { class: "uk-card uk-card-body", children: [_jsx("h3", { class: "text-base font-semibold mb-4", children: "Step 3: Date & Time" }), _jsxs("form", { "hx-post": "/admin/jobs/wizard/step4", "hx-target": "#page-content", "hx-select": "#page-content", class: "grid gap-4", children: [_jsx(HiddenWizardStateInputs, { state: props.state }), _jsxs("div", { class: "grid gap-3 sm:grid-cols-2", children: [_jsxs("div", { class: "grid gap-2", children: [_jsx("label", { class: "uk-form-label", for: "wizard-date", children: "Date" }), _jsx("input", { id: "wizard-date", type: "date", name: "date", class: "uk-input", value: props.state.date || '', required: true })] }), _jsxs("div", { class: "grid gap-2", children: [_jsx("label", { class: "uk-form-label", for: "wizard-time", children: "Time" }), _jsxs("select", { id: "wizard-time", name: "time", class: "uk-select", required: true, children: [_jsx("option", { value: "", children: "Select..." }), (props.timeslots || []).map((slot) => (_jsxs("option", { value: slot.start_time, selected: props.state.time === slot.start_time, children: [slot.date, " ", slot.start_time, " ", slot.available ? '' : '(unavailable)'] }, `${slot.date}-${slot.start_time}`)))] })] })] }), _jsx("button", { type: "submit", class: "uk-btn uk-btn-primary", children: "Continue" })] })] })), props.step === 4 && (_jsxs("div", { class: "uk-card uk-card-body", children: [_jsx("h3", { class: "text-base font-semibold mb-4", children: "Step 4: Provider" }), _jsxs("form", { "hx-post": "/admin/jobs/create", "hx-target": "#page-content", "hx-select": "#page-content", class: "grid gap-4", children: [_jsx(HiddenWizardStateInputs, { state: props.state }), _jsxs("div", { class: "grid gap-2", children: [_jsx("label", { class: "uk-form-label", for: "wizard-provider", children: "Provider" }), _jsxs("select", { id: "wizard-provider", name: "provider_id", class: "uk-select", children: [_jsx("option", { value: "", children: "Auto-assign later" }), (props.providers || []).map((provider) => (_jsxs("option", { value: provider.id, selected: props.state.provider_id === provider.id, children: [provider.first_name, " ", provider.last_name, " ", provider.is_available ? '' : '(unavailable)'] }, provider.id)))] })] }), _jsx("button", { type: "submit", class: "uk-btn uk-btn-primary", children: "Create Job" })] })] }))] }));
};
export const JobWizardPage = (props) => {
    const title = hasStep(props) ? `New Job - Step ${props.step}` : 'Create Job';
    return (_jsxs(Layout, { title: title, children: [_jsxs("div", { class: "page-header", children: [_jsxs("div", { class: "page-header-info", children: [_jsx("h2", { children: title }), hasStep(props) && (_jsx("div", { class: "wizard-progress", style: "margin-top:4px;", children: [1, 2, 3, 4].map((s) => (_jsx("div", { class: `wizard-progress-step${s < props.step ? ' is-done' : ''}${s === props.step ? ' is-active' : ''}` }, s))) }))] }), _jsx("div", { class: "page-header-actions", children: _jsx("a", { href: "/admin/jobs", class: "uk-btn uk-btn-default uk-btn-sm", "hx-get": "/admin/jobs", "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true", children: "Back" }) })] }), _jsx("div", { class: "p-8", children: hasStep(props) ? wizardFlowBody(props) : quickCreateBody(props) })] }));
};
export const JobWizardSwapBundle = ({ props, targetId }) => {
    if (hasStep(props)) {
        return wizardFlowBody(props);
    }
    const body = quickCreateBody(props);
    if (targetId === 'wizard-customer-panel')
        return _jsx("div", { id: "wizard-customer-panel", children: body });
    if (targetId === 'wizard-address-panel')
        return _jsx("div", { id: "wizard-address-panel", children: body });
    if (targetId === 'wizard-territory-panel')
        return _jsx("div", { id: "wizard-territory-panel", children: body });
    if (targetId === 'wizard-service-panel')
        return _jsx("div", { id: "wizard-service-panel", children: body });
    if (targetId === 'wizard-date-panel')
        return _jsx("div", { id: "wizard-date-panel", children: body });
    if (targetId === 'wizard-time-panel')
        return _jsx("div", { id: "wizard-time-panel", children: body });
    if (targetId === 'wizard-provider-panel')
        return _jsx("div", { id: "wizard-provider-panel", children: body });
    if (targetId === 'wizard-submit-panel')
        return _jsx("div", { id: "wizard-submit-panel", children: body });
    if (targetId === 'wizard-error-panel')
        return _jsx("div", { id: "wizard-error-panel", children: body });
    return body;
};
export const CustomerSearchResults = ({ customers }) => {
    if (!customers.length) {
        return _jsx("div", { class: "search-results", children: _jsx("div", { class: "search-item text-muted-foreground", children: "No customers found." }) });
    }
    return (_jsx("div", { class: "search-results", children: customers.map((customer) => (_jsxs("div", { class: "search-item customer-result", "data-id": customer.id, "data-name": `${customer.first_name} ${customer.last_name}`, "data-email": customer.email || '', children: [_jsxs("div", { class: "name", children: [customer.first_name, " ", customer.last_name] }), _jsx("div", { class: "meta", children: customer.email || 'No email' })] }, customer.id))) }));
};
export const AddressSearchResults = ({ results, targetPrefix, }) => {
    if (!results.length) {
        return _jsx("div", { class: "search-results", children: _jsx("div", { class: "search-item text-muted-foreground", children: "No addresses found." }) });
    }
    return (_jsx("div", { class: "search-results", children: results.map((result, i) => (_jsxs("div", { class: "search-item address-result", "data-prefix": targetPrefix || 'addr', "data-line1": result.line1, "data-city": result.city, "data-state": result.state, "data-postal": result.postal, "data-lat": result.lat, "data-lng": result.lng, children: [_jsx("div", { class: "name", children: result.display || result.line1 }), _jsxs("div", { class: "meta", children: [result.city, result.state ? `, ${result.state}` : '', " ", result.postal] })] }, `${result.display}-${i}`))) }));
};
export const parseWizardState = (body) => {
    const get = (key) => {
        const value = body[key];
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
//# sourceMappingURL=job-wizard.js.map