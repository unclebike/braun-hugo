// biome-ignore lint/correctness/noUnusedImports: jsx is used by JSX pragma transform
import { jsx } from 'hono/jsx';
import { StatusIcon } from './components';
import { Layout } from './layout';

interface ServiceDetailPageProps {
  service: {
    id: string;
    name: string;
    description?: string | null;
    category_id?: string | null;
    base_price_cents: number;
    base_duration_minutes: number;
    is_active: number;
    auto_assign_enabled: number;
    auto_assign_method: string;
    required_provider_count: number;
  };
  categories: Array<{ id: string; name: string }>;
  modifiers: Array<{
    id: string;
    name: string;
    description?: string;
    price_adjustment_cents: number;
    duration_adjustment_minutes: number;
    is_required: number;
    sort_order: number;
  }>;
  priceRules: Array<{
    id: string;
    rule_type: string;
    adjustment_type: string;
    adjustment_value: number;
    direction: string;
    days_of_week?: string;
    start_time?: string;
    end_time?: string;
    min_hours_ahead?: number;
    max_hours_ahead?: number;
    territory_id?: string;
    territory_name?: string;
  }>;
  requiredSkills: Array<{ id: string; name: string }>;
  allSkills: Array<{ id: string; name: string }>;
  territories: Array<{ id: string; name: string }>;
  taskTemplates: Array<{ id: string; title: string; type: string; is_required: number; sort_order: number }>;
}

const formatRuleDetails = (rule: ServiceDetailPageProps['priceRules'][number]) => {
  if (rule.rule_type === 'time_of_day') return `${rule.start_time || '-'} to ${rule.end_time || '-'}`;
  if (rule.rule_type === 'day_of_week') return rule.days_of_week || '-';
  if (rule.rule_type === 'lead_time') return `${rule.min_hours_ahead ?? 0}h - ${rule.max_hours_ahead ?? 'any'}h ahead`;
  if (rule.rule_type === 'territory') return rule.territory_name || '-';
  return '-';
};

export const ServiceDetailPage = ({ service, categories, modifiers, priceRules, requiredSkills, allSkills, territories, taskTemplates }: ServiceDetailPageProps) => {
  return (
    <Layout title={service.name || 'Service'}>
      <div class="page-header">
        <div class="page-header-info">
          <div class="flex items-center gap-2">
            <h2>{service.name || 'Service'}</h2>
            <StatusIcon status={service.is_active ? 'active' : 'inactive'} />
          </div>
        </div>
        <div class="page-header-actions">
          <a href="/admin/services" class="uk-btn uk-btn-default uk-btn-sm" hx-get="/admin/services" hx-target="#page-content" hx-select="#page-content" hx-push-url="true">Back</a>
        </div>
      </div>

      <div class="p-8">
        <div class="grid gap-6" style="max-width: 800px;">
          <div class="uk-card uk-card-body">
            <section>
              <form
                class="autosave"
                hx-post={`/admin/services/${service.id}`}
                hx-target="#page-content"
                hx-select="#page-content"
                hx-swap="none"
                hx-trigger="input delay:500ms, change"
                hx-sync="this:queue last"
              >
                <input type="hidden" name="_section" value="basic" />
                <div class="flex items-center justify-between mb-4">
                  <h3 class="text-base font-semibold">Basic Info</h3>
                  <span class="save-indicator"></span>
                </div>

                <div class="grid gap-x-4 gap-y-3 grid-cols-2">
                  <div class="grid gap-1 col-span-2">
                    <label class="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1" for="service-name">Service Name</label>
                    <input id="service-name" name="name" class="uk-input rounded-xl border-2 font-bold h-10 sm:h-11 text-xs sm:text-sm px-2 sm:px-3" value={service.name} />
                  </div>
                  <div class="grid gap-1 col-span-2">
                    <label class="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1" for="service-description">Internal Description</label>
                    <textarea id="service-description" name="description" class="uk-textarea rounded-xl border-2 font-medium text-xs sm:text-sm px-2 sm:px-3" rows={2}>{service.description || ''}</textarea>
                  </div>
                  <div class="grid gap-1 col-span-2">
                    <div class="flex items-center justify-between mb-0.5">
                      <label class="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1" for="service-category">Category</label>
                      <a href="/admin/categories" class="text-[8px] sm:text-[9px] uppercase tracking-widest font-black uk-link" hx-get="/admin/categories" hx-target="#page-content" hx-select="#page-content" hx-push-url="true">Groups</a>
                    </div>
                    <select id="service-category" name="category_id" class="uk-select rounded-xl border-2 font-bold h-10 sm:h-11 text-xs sm:text-sm px-2 sm:px-3">
                      <option value="">No Category</option>
                      {categories.map((cat) => (
                        <option value={cat.id} selected={service.category_id === cat.id} key={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div class="grid gap-1">
                    <label class="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1" for="service-price">Base Price</label>
                    <div class="relative">
                      <span class="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">$</span>
                      <input id="service-price" name="base_price" type="number" min={0} step={0.01} class="uk-input rounded-xl border-2 font-bold h-10 sm:h-11 pl-6 sm:pl-8 pr-2 text-xs sm:text-sm" value={(service.base_price_cents / 100).toFixed(2)} />
                    </div>
                  </div>
                  <div class="grid gap-1">
                    <label class="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1" for="service-duration">Est. Duration</label>
                    <div class="relative">
                      <input id="service-duration" name="base_duration_minutes" type="number" min={1} class="uk-input rounded-xl border-2 font-bold h-10 sm:h-11 pr-8 sm:pr-12 pl-2 text-xs sm:text-sm" value={service.base_duration_minutes} />
                      <span class="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 text-[8px] sm:text-[10px] font-black text-muted-foreground uppercase">Min</span>
                    </div>
                  </div>
                  <div class="grid gap-1 col-span-2 sm:col-span-1">
                    <label class="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1" for="assign-method">Assignment Logic</label>
                    <select id="assign-method" name="auto_assign_method" class="uk-select rounded-xl border-2 font-bold h-10 sm:h-11 text-xs sm:text-sm px-2 sm:px-3">
                      <option value="balanced" selected={service.auto_assign_method === 'balanced'}>Balanced</option>
                      <option value="prioritized" selected={service.auto_assign_method === 'prioritized'}>Prioritized</option>
                      <option value="drive_time" selected={service.auto_assign_method === 'drive_time'}>Drive Time</option>
                    </select>
                  </div>
                  <div class="flex flex-col justify-end gap-2 pb-0.5">
                    <label class="uk-form-label flex items-center gap-2 cursor-pointer text-[10px] sm:text-xs font-bold uppercase tracking-tight">
                      <input type="checkbox" name="auto_assign_enabled" checked={Boolean(service.auto_assign_enabled)} class="uk-toggle-switch uk-toggle-switch-primary" />
                      Auto-assign
                    </label>
                    <label class="uk-form-label flex items-center gap-2 cursor-pointer text-[10px] sm:text-xs font-bold uppercase tracking-tight">
                      <input type="checkbox" name="is_active" checked={Boolean(service.is_active)} class="uk-toggle-switch uk-toggle-switch-primary" />
                      Active
                    </label>
                  </div>
                </div>
              </form>
            </section>
          </div>

          <div class="uk-card uk-card-body">
            <section>
              <h3 class="text-base font-semibold mb-4">Modifiers</h3>
              <div class="uk-overflow-auto mb-4">
                <table class="uk-table uk-table-divider uk-table-hover uk-table-sm text-sm">
                  <thead>
                    <tr>
                      <th class="text-left">Name</th>
                      <th class="text-left">Price</th>
                      <th class="text-left">Duration</th>
                      <th class="text-left">Required</th>
                      <th class="text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modifiers.map((mod) => (
                      <tr key={mod.id}>
                        <td>{mod.name}</td>
                        <td>${(mod.price_adjustment_cents / 100).toFixed(2)}</td>
                        <td>{mod.duration_adjustment_minutes} min</td>
                        <td>{mod.is_required ? 'Yes' : 'No'}</td>
                        <td>
                          <button
                            type="button"
                            class="delete-btn"
                            hx-post={`/admin/services/${service.id}/modifiers/${mod.id}/delete`}
                            data-confirm="arm"
                            hx-target="#page-content"
                            hx-select="#page-content"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {modifiers.length === 0 && (
                      <tr>
                        <td colspan={5} class="text-muted-foreground">No modifiers yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <form hx-post={`/admin/services/${service.id}/modifiers`} hx-target="#page-content" hx-select="#page-content">
                <div class="grid gap-3 sm:grid-cols-2">
                  <div class="grid gap-2">
                    <label class="uk-form-label" for="mod-name">Name</label>
                    <input id="mod-name" name="name" class="uk-input" required />
                  </div>
                  <div class="grid gap-2">
                    <label class="uk-form-label" for="mod-required">Required</label>
                    <label class="flex items-center gap-2 text-sm">
                      <input id="mod-required" name="is_required" type="checkbox" class="uk-checkbox" />
                      Required
                    </label>
                  </div>
                  <div class="grid gap-2 sm:col-span-2">
                    <label class="uk-form-label" for="mod-description">Description</label>
                    <input id="mod-description" name="description" class="uk-input" />
                  </div>
                  <div class="grid gap-2">
                    <label class="uk-form-label" for="mod-price">Price Adjustment ($)</label>
                    <input id="mod-price" name="price_adjustment" type="number" step={0.01} class="uk-input" value="0" />
                  </div>
                  <div class="grid gap-2">
                    <label class="uk-form-label" for="mod-duration">Duration adjustment (minutes)</label>
                    <input id="mod-duration" name="duration_adjustment_minutes" type="number" class="uk-input" value="0" />
                  </div>
                </div>
                <div class="mt-4">
                  <button type="submit" class="uk-btn uk-btn-default">Add Modifier</button>
                </div>
              </form>
            </section>
          </div>

          <div class="uk-card uk-card-body">
            <section>
              <h3 class="text-base font-semibold mb-4">Price Rules</h3>
              <div class="uk-overflow-auto mb-4">
                <table class="uk-table uk-table-divider uk-table-hover uk-table-sm text-sm">
                  <thead>
                    <tr>
                      <th class="text-left">Type</th>
                      <th class="text-left">Adjustment</th>
                      <th class="text-left">Details</th>
                      <th class="text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {priceRules.map((rule) => (
                      <tr key={rule.id}>
                        <td>{rule.rule_type}</td>
                        <td>{rule.direction} {rule.adjustment_type === 'percentage' ? `${rule.adjustment_value}%` : `$${(rule.adjustment_value / 100).toFixed(2)}`}</td>
                        <td>{formatRuleDetails(rule)}</td>
                        <td>
                          <button
                            type="button"
                            class="delete-btn"
                            hx-post={`/admin/services/${service.id}/rules/${rule.id}/delete`}
                            data-confirm="arm"
                            hx-target="#page-content"
                            hx-select="#page-content"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {priceRules.length === 0 && (
                      <tr>
                        <td colspan={4} class="text-muted-foreground">No price rules yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <form hx-post={`/admin/services/${service.id}/rules`} hx-target="#page-content" hx-select="#page-content">
                <div class="grid gap-3 sm:grid-cols-2">
                  <div class="grid gap-2">
                    <label class="uk-form-label" for="rule-type">Rule Type</label>
                    <select id="rule-type" name="rule_type" class="uk-select">
                      <option value="time_of_day">Time of Day</option>
                      <option value="day_of_week">Day of Week</option>
                      <option value="lead_time">Lead Time</option>
                      <option value="territory">Territory</option>
                    </select>
                  </div>
                  <div class="grid gap-2">
                    <label class="uk-form-label" for="adjustment-type">Adjustment Type</label>
                    <select id="adjustment-type" name="adjustment_type" class="uk-select">
                      <option value="flat">Flat</option>
                      <option value="percentage">Percentage</option>
                    </select>
                  </div>
                  <div class="grid gap-2">
                    <label class="uk-form-label" for="adjustment-value">Adjustment Value ($ or %)</label>
                    <input id="adjustment-value" name="adjustment_value" type="number" step={0.01} class="uk-input" value="0" />
                  </div>
                  <div class="grid gap-2">
                    <label class="uk-form-label" for="direction">Direction</label>
                    <select id="direction" name="direction" class="uk-select">
                      <option value="surcharge">Surcharge</option>
                      <option value="discount">Discount</option>
                    </select>
                  </div>
                  <div class="grid gap-2">
                    <label class="uk-form-label" for="days-of-week">Days of Week (csv)</label>
                    <input id="days-of-week" name="days_of_week" class="uk-input" placeholder="1,2,3" />
                  </div>
                  <div class="grid gap-2">
                    <label class="uk-form-label" for="rule-territory">Territory</label>
                    <select id="rule-territory" name="territory_id" class="uk-select">
                      <option value="">Any territory</option>
                      {territories.map((t) => (
                        <option value={t.id} key={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div class="grid gap-2">
                    <label class="uk-form-label" for="start-time">Start Time</label>
                    <input id="start-time" name="start_time" type="time" class="uk-input" />
                  </div>
                  <div class="grid gap-2">
                    <label class="uk-form-label" for="end-time">End Time</label>
                    <input id="end-time" name="end_time" type="time" class="uk-input" />
                  </div>
                  <div class="grid gap-2">
                    <label class="uk-form-label" for="min-hours">Min Hours Ahead</label>
                    <input id="min-hours" name="min_hours_ahead" type="number" min={0} class="uk-input" />
                  </div>
                  <div class="grid gap-2">
                    <label class="uk-form-label" for="max-hours">Max Hours Ahead</label>
                    <input id="max-hours" name="max_hours_ahead" type="number" min={0} class="uk-input" />
                  </div>
                </div>
                <div class="mt-4">
                  <button type="submit" class="uk-btn uk-btn-default">Add Price Rule</button>
                </div>
              </form>
            </section>
          </div>

          <div class="uk-card uk-card-body">
            <section>
              <h3 class="text-base font-semibold mb-4">Required Skills</h3>
              <div class="flex flex-wrap gap-2 mb-4">
                {requiredSkills.map((skill) => {
                  const keep = requiredSkills.filter((s) => s.id !== skill.id);
                  return (
                    <form key={skill.id} hx-post={`/admin/services/${service.id}/skills`} hx-target="#page-content" hx-select="#page-content" class="flex items-center gap-1">
                      {keep.map((s) => <input key={s.id} type="hidden" name="skill_ids" value={s.id} />)}
                      <span class="uk-label">{skill.name}</span>
                      <button type="submit" class="uk-btn uk-btn-default uk-btn-sm">x</button>
                    </form>
                  );
                })}
                {requiredSkills.length === 0 && <span class="text-sm text-muted-foreground">No required skills.</span>}
              </div>

              <form hx-post={`/admin/services/${service.id}/skills`} hx-target="#page-content" hx-select="#page-content" class="flex items-end gap-3">
                {requiredSkills.map((skill) => <input key={skill.id} type="hidden" name="skill_ids" value={skill.id} />)}
                <div class="grid gap-2 flex-1">
                  <label class="uk-form-label" for="skill-id">Add Skill</label>
                  <select id="skill-id" name="skill_ids" class="uk-select">
                    <option value="">Select skill...</option>
                    {allSkills.map((skill) => <option value={skill.id} key={skill.id}>{skill.name}</option>)}
                  </select>
                </div>
                <button type="submit" class="uk-btn uk-btn-default">Add</button>
              </form>
            </section>
          </div>

          <div class="uk-card uk-card-body" id="service-checklist">
            <section>
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-base font-semibold">Service Checklist</h3>
                <span class="text-xs text-muted-foreground">{taskTemplates.length} task{taskTemplates.length !== 1 ? 's' : ''}</span>
              </div>
              <p class="text-xs text-muted-foreground mb-4">These tasks are automatically added to every job when this service is booked. Technicians must complete them before marking the job done.</p>

              <div class="uk-overflow-auto mb-4">
                <table class="uk-table uk-table-divider uk-table-hover uk-table-sm text-sm">
                  <thead>
                    <tr>
                      <th class="text-left">#</th>
                      <th class="text-left">Task</th>
                      <th class="text-left">Type</th>
                      <th class="text-left">Required</th>
                      <th class="text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taskTemplates.map((t, i) => (
                      <tr key={t.id}>
                        <td class="text-muted-foreground text-xs w-8">{i + 1}</td>
                        <td class="font-medium">{t.title}</td>
                        <td>
                          <span class={`uk-label ${t.type === 'check' ? '' : t.type === 'yesno' ? 'uk-label-primary' : 'uk-label-secondary'}`}>
                            <span class="badge-label">{t.type === 'check' ? 'Checkbox' : t.type === 'yesno' ? 'Yes / No' : 'Question'}</span>
                          </span>
                        </td>
                        <td>{t.is_required ? <span class="text-destructive font-bold text-xs">Required</span> : <span class="text-muted-foreground text-xs">Optional</span>}</td>
                        <td>
                          <button
                            type="button"
                            class="delete-btn"
                            hx-post={`/admin/services/${service.id}/tasks/${t.id}/delete`}
                            data-confirm="arm"
                            hx-target="#service-checklist"
                            hx-select="#service-checklist"
                            hx-swap="outerHTML"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {taskTemplates.length === 0 && (
                      <tr>
                        <td colspan={5} class="text-muted-foreground italic">No checklist tasks yet. Add tasks below.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <form
                hx-post={`/admin/services/${service.id}/tasks`}
                hx-target="#service-checklist"
                hx-select="#service-checklist"
                hx-swap="outerHTML"
                hx-on="htmx:afterRequest: if(event.detail.xhr?.status < 300) this.reset();"
              >
                <div class="grid gap-3 sm:grid-cols-2">
                  <div class="grid gap-2 sm:col-span-2">
                    <label class="uk-form-label" for="task-title">Task Description</label>
                    <input id="task-title" name="title" class="uk-input" placeholder="e.g. Lubed and adjusted chain" required />
                  </div>
                  <div class="grid gap-2">
                    <label class="uk-form-label" for="task-type">Type</label>
                    <select id="task-type" name="type" class="uk-select">
                      <option value="check">Checkbox — done / not done</option>
                      <option value="yesno">Yes / No question</option>
                      <option value="text">Free text answer</option>
                    </select>
                  </div>
                  <div class="grid gap-2">
                    <label class="uk-form-label" for="task-required">Required</label>
                    <label class="flex items-center gap-2 text-sm h-10 cursor-pointer">
                      <input id="task-required" name="is_required" type="checkbox" class="uk-checkbox" />
                      Must be completed before job can close
                    </label>
                  </div>
                </div>
                <div class="mt-4">
                  <button type="submit" class="uk-btn uk-btn-default">Add Task</button>
                </div>
              </form>
            </section>
          </div>

          <div class="uk-card uk-card-body danger-card">
            <section>
              <h3 class="text-base font-semibold mb-3">Delete</h3>
              <button
                type="button"
                class="delete-btn"
                hx-post={`/admin/services/${service.id}/delete`}
                data-confirm="arm"
                hx-target="#page-content"
              >
                Delete Service
              </button>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
};
