type Timeslot = {
  date: string;
  start_time: string;
  end_time: string;
  available: boolean;
  providers?: string[];
  price?: number;
  price_adjustment?: unknown;
};

const toMinutes = (value: string): number => {
  const [hRaw, mRaw] = value.split(':');
  const h = Number(hRaw);
  const m = Number(mRaw ?? 0);
  return h * 60 + m;
};

const fromMinutes = (total: number): string => {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

type Provider = { id: string };
type WeeklyHour = { team_member_id: string; day_of_week: number; start_time: string; end_time: string };
type DateOverride = { team_member_id: string; is_available: number; start_time: string | null; end_time: string | null };

const slotFitsWindow = (slotStartMin: number, slotEndMin: number, startTime: string, endTime: string): boolean => {
  const startMin = toMinutes(startTime);
  const endMin = toMinutes(endTime);
  return slotStartMin >= startMin && slotEndMin <= endMin;
};

export async function generateTimeslots(
  db: D1Database,
  territoryId: string,
  date: string,
  durationMinutes: number,
  requiredProviderCount: number,
  requiredSkills: string[]
): Promise<Timeslot[]> {
  const providerRows = await db.prepare(
    `SELECT tm.id
     FROM team_members tm
     JOIN team_member_territories tmt ON tmt.team_member_id = tm.id
     WHERE tmt.territory_id = ?
       AND tm.role = 'provider'
       AND tm.is_active = 1
       AND tm.can_be_auto_assigned = 1`
  ).bind(territoryId).all<Provider>();

  let providers = providerRows.results || [];

  if (requiredSkills.length > 0 && providers.length > 0) {
    const placeholders = requiredSkills.map(() => '?').join(', ');
    const skillRows = await db.prepare(
      `SELECT tms.team_member_id, COUNT(DISTINCT tms.skill_id) AS matched_skill_count
       FROM team_member_skills tms
       WHERE tms.team_member_id IN (${providers.map(() => '?').join(', ')})
         AND tms.skill_id IN (${placeholders})
       GROUP BY tms.team_member_id`
    ).bind(...providers.map((p) => p.id), ...requiredSkills).all<{ team_member_id: string; matched_skill_count: number }>();

    const qualified = new Set(
      (skillRows.results || [])
        .filter((row) => Number(row.matched_skill_count) >= requiredSkills.length)
        .map((row) => row.team_member_id)
    );
    providers = providers.filter((provider) => qualified.has(provider.id));
  }

  if (providers.length === 0) {
    const emptySlots: Timeslot[] = [];
    for (let hour = 8; hour <= 17; hour++) {
      const start = `${String(hour).padStart(2, '0')}:00`;
      const end = fromMinutes(hour * 60 + durationMinutes);
      emptySlots.push({ date, start_time: start, end_time: end, available: false });
    }
    return emptySlots;
  }

  const providerIds = providers.map((provider) => provider.id);
  const dayOfWeek = new Date(`${date}T00:00:00`).getDay();
  const weeklyPlaceholders = providerIds.map(() => '?').join(', ');

  const [weeklyRows, overrideRows] = await Promise.all([
    db.prepare(
      `SELECT team_member_id, day_of_week, start_time, end_time
       FROM provider_weekly_hours
       WHERE team_member_id IN (${weeklyPlaceholders})
         AND day_of_week = ?`
    ).bind(...providerIds, dayOfWeek).all<WeeklyHour>(),
    db.prepare(
      `SELECT team_member_id, is_available, start_time, end_time
       FROM provider_date_overrides
       WHERE team_member_id IN (${weeklyPlaceholders})
         AND date = ?`
    ).bind(...providerIds, date).all<DateOverride>(),
  ]);

  const weeklyByProvider = new Map<string, WeeklyHour[]>();
  for (const row of weeklyRows.results || []) {
    const list = weeklyByProvider.get(row.team_member_id) || [];
    list.push(row);
    weeklyByProvider.set(row.team_member_id, list);
  }

  const overrideByProvider = new Map<string, DateOverride>();
  for (const row of overrideRows.results || []) {
    overrideByProvider.set(row.team_member_id, row);
  }

  const slots: Timeslot[] = [];

  for (let hour = 8; hour <= 17; hour++) {
    const slotStart = hour * 60;
    const slotEnd = slotStart + durationMinutes;
    const availableProviderIds: string[] = [];

    for (const provider of providers) {
      const override = overrideByProvider.get(provider.id);
      let available = false;

      if (override) {
        if (override.is_available === 0) {
          available = false;
        } else if (override.start_time && override.end_time) {
          available = slotFitsWindow(slotStart, slotEnd, override.start_time, override.end_time);
        } else {
          available = true;
        }
      } else {
        const weeklyWindows = weeklyByProvider.get(provider.id) || [];
        available = weeklyWindows.some((window) => slotFitsWindow(slotStart, slotEnd, window.start_time, window.end_time));
      }

      if (available) {
        availableProviderIds.push(provider.id);
      }
    }

    const start_time = fromMinutes(slotStart);
    const end_time = fromMinutes(slotEnd);
    const isAvailable = availableProviderIds.length >= requiredProviderCount;

    slots.push({
      date,
      start_time,
      end_time,
      available: isAvailable,
      providers: isAvailable ? availableProviderIds.slice(0, requiredProviderCount) : undefined,
    });
  }

  return slots;
}
