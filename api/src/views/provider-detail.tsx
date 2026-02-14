/** @jsx jsx */
import { jsx } from 'hono/jsx';
import { Layout } from './layout';

void jsx;

interface ProviderDetailPageProps {
  member: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    role: string;
    is_active: number;
    can_be_auto_assigned: number;
    can_edit_availability: number;
    auto_assign_priority: number;
  };
  weeklyHours: Array<{ day_of_week: number; start_time: string; end_time: string }>;
  dateOverrides: Array<{ id: string; date: string; is_available: number; start_time?: string; end_time?: string }>;
  skills: Array<{ id: string; name: string }>;
  allSkills: Array<{ id: string; name: string }>;
  territories: Array<{ id: string; name: string; assigned: boolean }>;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const ProviderDetailPage = ({ member, weeklyHours, dateOverrides, skills, allSkills, territories }: ProviderDetailPageProps) => {
  const hourMap = new Map<number, { start_time: string; end_time: string }>();
  for (const row of weeklyHours) hourMap.set(row.day_of_week, { start_time: row.start_time, end_time: row.end_time });
  const assignedTerritories = territories.filter((t) => t.assigned);

  return (
    <Layout title={`${member.first_name} ${member.last_name}`}>
      <div class="flex items-center justify-between px-4 pl-14 py-4 md:px-8 md:pl-8 md:py-5 bg-white border-b border-border sticky top-0 z-50">
        <div class="flex items-center gap-3">
          <h2 class="text-xl font-semibold">{member.first_name} {member.last_name}</h2>
          <span class={member.is_active ? 'uk-label uk-label-primary' : 'uk-label'}>{member.is_active ? 'active' : 'inactive'}</span>
        </div>
        <a href="/admin/team" class="uk-btn uk-btn-default uk-btn-sm" hx-get="/admin/team" hx-target="#page-content" hx-select="#page-content" hx-push-url="true">Back</a>
      </div>

      <div class="p-8">
        <div class="grid gap-6" style="max-width: 800px;">
          <div class="uk-card uk-card-body">
            <section>
              <form
                class="autosave"
                hx-post={`/admin/team/${member.id}`}
                hx-target="#page-content"
                hx-select="#page-content"
                hx-swap="none"
                hx-trigger="input delay:500ms, change"
                hx-sync="this:queue last"
              >
                <input type="hidden" name="_section" value="profile" />
                <div class="flex items-center justify-between mb-4">
                  <h3 class="text-base font-semibold">Profile</h3>
                  <span class="save-indicator"></span>
                </div>

                <div class="grid gap-4 sm:grid-cols-2">
                  <div class="grid gap-2">
                    <label class="uk-form-label" for="first_name">First Name</label>
                    <input id="first_name" name="first_name" class="uk-input" value={member.first_name} />
                  </div>
                  <div class="grid gap-2">
                    <label class="uk-form-label" for="last_name">Last Name</label>
                    <input id="last_name" name="last_name" class="uk-input" value={member.last_name} />
                  </div>
                  <div class="grid gap-2 sm:col-span-2">
                    <label class="uk-form-label" for="email">Email</label>
                    <input id="email" name="email" type="email" class="uk-input" value={member.email} />
                  </div>
                  <div class="grid gap-2 sm:col-span-2">
                    <label class="uk-form-label" for="phone">Phone</label>
                    <input id="phone" name="phone" type="tel" class="uk-input" value={member.phone || ''} />
                  </div>
                  <div class="grid gap-2 sm:col-span-2">
                    <label class="uk-form-label" for="role">Role</label>
                    <select id="role" name="role" class="uk-select">
                      <option value="manager" selected={member.role === 'manager'}>Manager</option>
                      <option value="provider" selected={member.role === 'provider'}>Provider</option>
                    </select>
                  </div>
                  <label class="uk-form-label flex items-center gap-2 cursor-pointer sm:col-span-2">
                    <input type="checkbox" name="can_be_auto_assigned" checked={Boolean(member.can_be_auto_assigned)} class="uk-toggle-switch uk-toggle-switch-primary" />
                    Can be auto-assigned
                  </label>
                  <label class="uk-form-label flex items-center gap-2 cursor-pointer sm:col-span-2">
                    <input type="checkbox" name="is_active" checked={Boolean(member.is_active)} class="uk-toggle-switch uk-toggle-switch-primary" />
                    Active
                  </label>
                </div>
              </form>
            </section>
          </div>

          <div class="uk-card uk-card-body">
            <section>
              <h3 class="text-base font-semibold mb-4">Weekly Hours</h3>
              <form hx-post={`/admin/team/${member.id}/hours`} hx-target="#page-content" hx-select="#page-content">
                <div class="grid gap-3">
                  {DAY_LABELS.map((label, day) => {
                    const row = hourMap.get(day);
                    const enabled = Boolean(row);
                    return (
                      <div class="grid grid-cols-[60px_1fr_1fr_auto] items-center gap-3" key={label}>
                        <span class="text-sm text-muted-foreground">{label}</span>
                        <input type="time" name={`day_${day}_start`} class="uk-input" value={row?.start_time || '09:00'} />
                        <input type="time" name={`day_${day}_end`} class="uk-input" value={row?.end_time || '17:00'} />
                        <label class="flex items-center gap-2 text-sm">
                          <input type="checkbox" name={`day_${day}_enabled`} class="uk-checkbox" checked={enabled} />
                          Enabled
                        </label>
                      </div>
                    );
                  })}
                </div>
                <div class="mt-4">
                  <button type="submit" class="uk-btn uk-btn-primary">Save Hours</button>
                </div>
              </form>
            </section>
          </div>

          <div class="uk-card uk-card-body">
            <section>
              <h3 class="text-base font-semibold mb-4">Date Overrides</h3>
              <div class="uk-overflow-auto mb-4">
                <table class="uk-table uk-table-divider uk-table-hover uk-table-sm text-sm">
                  <thead>
                    <tr>
                      <th class="text-left">Date</th>
                      <th class="text-left">Available</th>
                      <th class="text-left">Hours</th>
                      <th class="text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dateOverrides.map((o) => (
                      <tr key={o.id}>
                        <td>{o.date}</td>
                        <td>{o.is_available ? 'Yes' : 'No'}</td>
                        <td>{o.start_time && o.end_time ? `${o.start_time} - ${o.end_time}` : '-'}</td>
                        <td>
                          <button
                            type="button"
                            class="delete-btn"
                            hx-delete={`/admin/team/${member.id}/overrides/${o.id}`}
                            data-confirm="arm"
                            hx-target="#page-content"
                            hx-select="#page-content"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {dateOverrides.length === 0 && (
                      <tr>
                        <td colspan={4} class="text-muted-foreground">No overrides.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <form hx-post={`/admin/team/${member.id}/overrides`} hx-target="#page-content" hx-select="#page-content">
                <div class="grid gap-3 sm:grid-cols-2">
                  <div class="grid gap-2">
                    <label class="uk-form-label" for="override-date">Date</label>
                    <input id="override-date" name="date" type="date" class="uk-input" required />
                  </div>
                  <div class="grid gap-2">
                    <label class="uk-form-label" for="override-available">Availability</label>
                    <select id="override-available" name="is_available" class="uk-select">
                      <option value="1">Available</option>
                      <option value="0">Unavailable</option>
                    </select>
                  </div>
                  <div class="grid gap-2">
                    <label class="uk-form-label" for="override-start">Start</label>
                    <input id="override-start" name="start_time" type="time" class="uk-input" />
                  </div>
                  <div class="grid gap-2">
                    <label class="uk-form-label" for="override-end">End</label>
                    <input id="override-end" name="end_time" type="time" class="uk-input" />
                  </div>
                </div>
                <div class="mt-4">
                  <button type="submit" class="uk-btn uk-btn-default">Add Override</button>
                </div>
              </form>
            </section>
          </div>

          <div class="uk-card uk-card-body">
            <section>
              <h3 class="text-base font-semibold mb-4">Skills</h3>
              <div class="flex flex-wrap items-center gap-2 mb-4">
                {skills.map((skill) => (
                  <form key={skill.id} hx-post={`/admin/team/${member.id}/skills`} hx-target="#page-content" hx-select="#page-content" class="flex items-center gap-1">
                    <input type="hidden" name="remove_skill_id" value={skill.id} />
                    <span class="uk-label">{skill.name}</span>
                    <button type="submit" class="uk-btn uk-btn-default uk-btn-sm">x</button>
                  </form>
                ))}
                {skills.length === 0 && <span class="text-sm text-muted-foreground">No skills assigned.</span>}
              </div>

              <form hx-post={`/admin/team/${member.id}/skills`} hx-target="#page-content" hx-select="#page-content" class="flex items-end gap-3">
                {skills.map((skill) => (
                  <input key={skill.id} type="hidden" name="skill_ids" value={skill.id} />
                ))}
                <div class="grid gap-2 flex-1">
                  <label class="uk-form-label" for="add-skill">Add Skill</label>
                  <select id="add-skill" name="skill_ids" class="uk-select">
                    <option value="">Select skill...</option>
                    {allSkills.map((skill) => (
                      <option value={skill.id} key={skill.id}>{skill.name}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" class="uk-btn uk-btn-default">Add</button>
              </form>
            </section>
          </div>

          <div class="uk-card uk-card-body">
            <section id="provider-territories">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-base font-semibold">Territories</h3>
                <span class="text-sm text-muted-foreground" id="provider-territories-count">{assignedTerritories.length} assigned</span>
                <span class="save-indicator"></span>
              </div>

              <div class="grid gap-2">
                {territories.map((t) => (
                  <form key={t.id}>
                    {assignedTerritories.filter((a) => !t.assigned || a.id !== t.id).map((a) => (
                      <input key={a.id} type="hidden" name="territory_ids" value={a.id} />
                    ))}
                    <label class="flex items-center justify-between gap-3">
                      <span class="text-sm">{t.name}</span>
                      <input
                        type="checkbox"
                        class="uk-checkbox"
                        name="territory_ids"
                        value={t.id}
                        checked={t.assigned}
                        hx-post={`/admin/team/${member.id}/territories`}
                        hx-target="#page-content"
                        hx-select="#page-content"
                        hx-vals={`js:this.checked ? {} : { remove_territory_id: '${t.id}' }`}
                      />
                    </label>
                  </form>
                ))}
              </div>
            </section>
          </div>

          <div class="uk-card uk-card-body">
            <section>
              <h3 class="text-base font-semibold mb-3">Delete</h3>
              <button
                type="button"
                class="delete-btn"
                hx-post={`/admin/team/${member.id}/delete`}
                data-confirm="arm"
                hx-target="#page-content"
              >
                Delete Team Member
              </button>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
};
