/** @jsx jsx */
import { jsx } from 'hono/jsx';
import { Layout } from './layout';

void jsx;

interface TerritoryModel {
  id: string;
  name: string;
  timezone: string;
  service_area_type: string;
  service_area_data: string;
  operating_hours: string;
  scheduling_policy: string;
  max_concurrent_jobs?: number;
  is_active: number;
}

interface TerritoryDetailProps {
  territory: TerritoryModel;
  services: Array<{ id: string; name: string; assigned: boolean }>;
  providers: Array<{ id: string; first_name: string; last_name: string; assigned: boolean }>;
  isNew?: boolean;
}

const HOURS = [
  { key: 'sun', label: 'Sun' },
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
];

const TIMEZONES = ['America/Toronto', 'America/New_York', 'America/Vancouver', 'America/Chicago', 'America/Edmonton', 'UTC'];

const parseAreaData = (raw: string) => {
  try {
    return JSON.parse(raw || '{}') as Record<string, unknown>;
  } catch {
    return {};
  }
};

const parseOperatingHours = (raw: string) => {
  try {
    const parsed = JSON.parse(raw || '{}') as Record<string, { start: string; end: string } | null>;
    return parsed;
  } catch {
    return {} as Record<string, { start: string; end: string } | null>;
  }
};

export const ZipPanel = ({ tid, zipCodes }: { tid: string; zipCodes: string[] }) => {
  return (
    <div>
      <form hx-post={`/admin/territories/${tid}/area`} hx-target="#page-content" hx-select="#page-content">
        <input type="hidden" name="service_area_type" value="zip" />
        <div class="grid gap-2">
          <label class="uk-form-label" for="zip-codes">ZIP/Postal Codes</label>
          <textarea id="zip-codes" name="zip_codes" class="uk-textarea" rows={4} placeholder="K8N1A1, K8N1A2">{zipCodes.join(', ')}</textarea>
          <p class="text-sm text-muted-foreground">Comma-separated list.</p>
        </div>
        <div class="mt-4">
          <button type="submit" class="uk-btn uk-btn-default">Save Service Area</button>
        </div>
      </form>
    </div>
  );
};

export const RadiusPanel = ({ tid, areaData }: { tid: string; areaData: Record<string, unknown> }) => {
  const center = (areaData.center as { lat?: number; lng?: number } | undefined) || {};
  const lat = Number(center.lat || 44.1628);
  const lng = Number(center.lng || -77.3832);
  const miles = Number(areaData.radius_miles || 10);

  return (
    <div>
      <form hx-post={`/admin/territories/${tid}/area`} hx-target="#page-content" hx-select="#page-content">
        <input type="hidden" name="service_area_type" value="radius" />
        <div class="grid gap-3 sm:grid-cols-2 mb-4">
          <div class="grid gap-2 sm:col-span-2">
            <label class="uk-form-label" for="center-address-search">Address Search</label>
            <input
              id="center-address-search"
              name="center_address_q"
              class="uk-input"
              placeholder="Search address"
              hx-get="/admin/api/address/search"
              hx-trigger="input changed delay:300ms"
              hx-target="#radius-address-results"
            />
            <div id="radius-address-results"></div>
          </div>
          <div class="grid gap-2">
            <label class="uk-form-label" for="center-lat">Center Latitude</label>
            <input id="center-lat" name="center_lat" class="uk-input" value={lat.toString()} />
          </div>
          <div class="grid gap-2">
            <label class="uk-form-label" for="center-lng">Center Longitude</label>
            <input id="center-lng" name="center_lng" class="uk-input" value={lng.toString()} />
          </div>
          <div class="grid gap-2 sm:col-span-2">
            <label class="uk-form-label" for="radius-miles">Radius (miles)</label>
            <input id="radius-miles" name="radius_miles" type="number" min={1} step={0.1} class="uk-input" value={miles.toString()} />
          </div>
        </div>
        <div id="radius-map" style="height: 300px; border: 1px solid #ddd; border-radius: 8px;" data-lat={lat.toString()} data-lng={lng.toString()} data-miles={miles.toString()}></div>
        <div class="mt-4">
          <button type="submit" class="uk-btn uk-btn-default">Save Service Area</button>
        </div>
      </form>
    </div>
  );
};

export const GeofencePanel = ({ tid, areaData }: { tid: string; areaData: Record<string, unknown> }) => {
  const polygon = Array.isArray(areaData.polygon) ? areaData.polygon : [];

  return (
    <div>
      <form hx-post={`/admin/territories/${tid}/area`} hx-target="#page-content" hx-select="#page-content">
        <input type="hidden" name="service_area_type" value="geofence" />
        <div class="flex items-center gap-2 mb-3">
          <button id="gf-draw-btn" type="button" class="uk-btn uk-btn-default uk-btn-sm">Draw Polygon</button>
          <button id="clear-geofence-btn" type="button" class="uk-btn uk-btn-default uk-btn-sm">Clear</button>
          <span id="gf-count" class="text-sm text-muted-foreground">{polygon.length} pts</span>
        </div>
        <div id="geofence-map" style="height: 320px; border: 1px solid #ddd; border-radius: 8px;" data-points={JSON.stringify(polygon)}></div>
        <input id="polygon-json-hidden" type="hidden" name="polygon_json" value={polygon.length ? JSON.stringify(polygon) : ''} />
        <div class="mt-4">
          <button type="submit" class="uk-btn uk-btn-default">Save Service Area</button>
        </div>
      </form>
    </div>
  );
};

export const TerritoryDetailPage = ({ territory, services, providers, isNew }: TerritoryDetailProps) => {
  const areaData = parseAreaData(territory.service_area_data);
  const zipCodes = ((areaData.zip_codes as string[] | undefined) || (areaData.zipCodes as string[] | undefined) || []).filter(Boolean);
  const operatingHours = parseOperatingHours(territory.operating_hours);
  const selectedType = territory.service_area_type || 'zip';
  const submitUrl = isNew ? '/admin/territories' : `/admin/territories/${territory.id}`;
  const assignedServices = services.filter((s) => s.assigned).length;
  const assignedProviders = providers.filter((p) => p.assigned).length;

  return (
    <Layout title={isNew ? 'Create Territory' : territory.name || 'Territory'}>
      <div class="flex items-center justify-between px-8 py-5 bg-white border-b border-border sticky top-0 z-50">
        <h2 class="text-xl font-semibold">{isNew ? 'Create Territory' : territory.name || 'Territory'}</h2>
        <a href="/admin/territories" class="uk-btn uk-btn-default uk-btn-sm" hx-get="/admin/territories" hx-target="#page-content" hx-select="#page-content" hx-push-url="true">Back</a>
      </div>

      <div class="p-8">
        <div class="grid gap-6" style="max-width: 800px;">
          <div class="uk-card uk-card-body">
            <section>
              <h3 class="text-base font-semibold mb-4">Basic Info</h3>
              <form hx-post={submitUrl} hx-target="#page-content" hx-select="#page-content" hx-push-url="true">
                {!isNew && <input type="hidden" name="_section" value="basic" />}
                <div class="grid gap-4 sm:grid-cols-2">
                  <div class="grid gap-2 sm:col-span-2">
                    <label class="uk-form-label" for="territory-name">Name</label>
                    <input id="territory-name" name="name" class="uk-input" value={territory.name} required />
                  </div>
                  <div class="grid gap-2">
                    <label class="uk-form-label" for="territory-timezone">Timezone</label>
                    <select id="territory-timezone" name="timezone" class="uk-select">
                      {TIMEZONES.map((tz) => <option value={tz} selected={territory.timezone === tz} key={tz}>{tz}</option>)}
                    </select>
                  </div>
                  <div class="grid gap-2">
                    <label class="uk-form-label" for="territory-policy">Scheduling Policy</label>
                    <select id="territory-policy" name="scheduling_policy" class="uk-select">
                      <option value="provider_based" selected={territory.scheduling_policy === 'provider_based'}>Provider based</option>
                      <option value="manual" selected={territory.scheduling_policy === 'manual'}>Manual</option>
                    </select>
                  </div>
                  <label class="uk-form-label flex items-center gap-2 cursor-pointer sm:col-span-2">
                    <input type="checkbox" name="is_active" checked={Boolean(territory.is_active)} class="uk-toggle-switch uk-toggle-switch-primary" />
                    Active
                  </label>
                  {isNew && <input type="hidden" name="service_area_type" value={selectedType} />}
                </div>
                <div class="mt-4">
                  <button type="submit" class="uk-btn uk-btn-primary">{isNew ? 'Create' : 'Save'}</button>
                </div>
              </form>
            </section>
          </div>

          {!isNew && (
            <div class="uk-card uk-card-body">
              <section>
                <h3 class="text-base font-semibold mb-4">Service Area</h3>
                <div class="grid gap-3 sm:grid-cols-2 items-end mb-4">
                  <div class="grid gap-2">
                    <label class="uk-form-label" for="area-type">Service Area Type</label>
                    <select
                      id="area-type"
                      class="uk-select"
                      name="panel_type"
                      hx-get={`/admin/territories/${territory.id}/area-panel/${selectedType}`}
                      hx-target="#area-panel"
                      hx-swap="innerHTML"
                      hx-on:change={`this.setAttribute('hx-get','/admin/territories/${territory.id}/area-panel/' + this.value)`}
                    >
                      <option value="zip" selected={selectedType === 'zip'}>ZIP / Postal Codes</option>
                      <option value="radius" selected={selectedType === 'radius'}>Radius</option>
                      <option value="geofence" selected={selectedType === 'geofence'}>Geofence</option>
                    </select>
                  </div>
                </div>

                <div id="area-panel">
                  {selectedType === 'radius' && RadiusPanel({ tid: territory.id, areaData })}
                  {selectedType === 'geofence' && GeofencePanel({ tid: territory.id, areaData })}
                  {selectedType === 'zip' && ZipPanel({ tid: territory.id, zipCodes })}
                </div>
              </section>
            </div>
          )}

          {!isNew && (
            <div class="uk-card uk-card-body">
              <section>
                <h3 class="text-base font-semibold mb-4">Operating Hours</h3>
                <form hx-post={`/admin/territories/${territory.id}/hours`} hx-target="#page-content" hx-select="#page-content">
                  <div class="grid gap-3">
                    {HOURS.map((d) => {
                      const row = operatingHours[d.key] || null;
                      return (
                        <div class="grid grid-cols-[60px_1fr_1fr_auto] gap-3 items-center" key={d.key}>
                          <span class="text-sm text-muted-foreground">{d.label}</span>
                          <input type="time" name={`${d.key}_start`} class="uk-input" value={row?.start || '09:00'} />
                          <input type="time" name={`${d.key}_end`} class="uk-input" value={row?.end || '17:00'} />
                          <label class="flex items-center gap-2 text-sm">
                            <input type="checkbox" name={`${d.key}_enabled`} class="uk-checkbox" checked={Boolean(row)} />
                            Enabled
                          </label>
                        </div>
                      );
                    })}
                  </div>
                  <div class="mt-4">
                    <button type="submit" class="uk-btn uk-btn-default">Save Hours</button>
                  </div>
                </form>
              </section>
            </div>
          )}

          {!isNew && (
            <div class="uk-card uk-card-body">
              <section id="territory-services">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="text-base font-semibold">Services</h3>
                  <span id="territory-services-count" class="text-sm text-muted-foreground">{assignedServices} assigned</span>
                  <span class="save-indicator"></span>
                </div>
                <div class="grid gap-2">
                  {services.map((s) => (
                    <label class="flex items-center justify-between gap-3" key={s.id}>
                      <span class="text-sm">{s.name}</span>
                      <input
                        type="checkbox"
                        class="uk-checkbox"
                        checked={s.assigned}
                        hx-post={`/admin/territories/${territory.id}/services/${s.id}/toggle`}
                        hx-swap="none"
                      />
                    </label>
                  ))}
                </div>
              </section>
            </div>
          )}

          {!isNew && (
            <div class="uk-card uk-card-body">
              <section id="territory-providers">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="text-base font-semibold">Providers</h3>
                  <span id="territory-providers-count" class="text-sm text-muted-foreground">{assignedProviders} assigned</span>
                  <span class="save-indicator"></span>
                </div>
                <div class="grid gap-2">
                  {providers.map((p) => (
                    <label class="flex items-center justify-between gap-3" key={p.id}>
                      <span class="text-sm">{p.first_name} {p.last_name}</span>
                      <input
                        type="checkbox"
                        class="uk-checkbox"
                        checked={p.assigned}
                        hx-post={`/admin/territories/${territory.id}/providers/${p.id}/toggle`}
                        hx-swap="none"
                      />
                    </label>
                  ))}
                </div>
              </section>
            </div>
          )}

          {!isNew && (
            <div class="uk-card uk-card-body">
              <section>
                <h3 class="text-base font-semibold mb-3">Delete</h3>
                <button
                  type="button"
                  class="delete-btn"
                  hx-post={`/admin/territories/${territory.id}/delete`}
                  data-confirm="arm"
                  hx-target="#page-content"
                >
                  Delete Territory
                </button>
              </section>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};
