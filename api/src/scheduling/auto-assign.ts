import { checkServiceArea } from '../geo/service-area';

type JobContext = {
  id: string;
  territory_id: string;
  scheduled_date: string;
  scheduled_start_time: string;
  duration_minutes: number;
  customer_lat: number | null;
  customer_lng: number | null;
};

type Candidate = {
  id: string;
  auto_assign_priority: number;
};

const toMinutes = (value: string): number => {
  const [hRaw, mRaw] = value.split(':');
  return Number(hRaw) * 60 + Number(mRaw ?? 0);
};

const toRadians = (value: number): number => (value * Math.PI) / 180;

const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const radius = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const isProviderAvailableAt = async (
  db: D1Database,
  teamMemberId: string,
  date: string,
  startTime: string,
  durationMinutes: number
): Promise<boolean> => {
  const slotStart = toMinutes(startTime);
  const slotEnd = slotStart + durationMinutes;
  const dayOfWeek = new Date(`${date}T00:00:00`).getDay();

  const override = await db.prepare(
    'SELECT is_available, start_time, end_time FROM provider_date_overrides WHERE team_member_id = ? AND date = ?'
  ).bind(teamMemberId, date).first<{ is_available: number; start_time: string | null; end_time: string | null }>();

  if (override) {
    if (override.is_available === 0) return false;
    if (override.start_time && override.end_time) {
      return slotStart >= toMinutes(override.start_time) && slotEnd <= toMinutes(override.end_time);
    }
    return true;
  }

  const weekly = await db.prepare(
    'SELECT start_time, end_time FROM provider_weekly_hours WHERE team_member_id = ? AND day_of_week = ?'
  ).bind(teamMemberId, dayOfWeek).all<{ start_time: string; end_time: string }>();

  return (weekly.results || []).some((row) => slotStart >= toMinutes(row.start_time) && slotEnd <= toMinutes(row.end_time));
};

const hasConflict = async (
  db: D1Database,
  teamMemberId: string,
  date: string,
  startTime: string,
  durationMinutes: number
): Promise<boolean> => {
  const jobRows = await db.prepare(
    `SELECT j.scheduled_start_time, j.duration_minutes
     FROM job_providers jp
     JOIN jobs j ON j.id = jp.job_id
     WHERE jp.team_member_id = ?
       AND j.scheduled_date = ?
       AND j.status NOT IN ('cancelled', 'complete')`
  ).bind(teamMemberId, date).all<{ scheduled_start_time: string; duration_minutes: number }>();

  const startMin = toMinutes(startTime);
  const endMin = startMin + durationMinutes;

  return (jobRows.results || []).some((row) => {
    const otherStart = toMinutes(row.scheduled_start_time);
    const otherEnd = otherStart + Number(row.duration_minutes || 0);
    return startMin < otherEnd && otherStart < endMin;
  });
};

const distanceScore = async (
  db: D1Database,
  providerId: string,
  territoryId: string,
  customerLat: number | null,
  customerLng: number | null
): Promise<number> => {
  if (customerLat !== null && customerLng !== null) {
    const lastJobAddress = await db.prepare(
      `SELECT ca.lat, ca.lng
       FROM job_providers jp
       JOIN jobs j ON j.id = jp.job_id
       JOIN customer_addresses ca ON ca.id = j.customer_address_id
       WHERE jp.team_member_id = ?
         AND ca.lat IS NOT NULL
         AND ca.lng IS NOT NULL
       ORDER BY j.scheduled_date DESC, j.scheduled_start_time DESC
       LIMIT 1`
    ).bind(providerId).first<{ lat: number; lng: number }>();

    if (lastJobAddress) {
      return haversineKm(customerLat, customerLng, Number(lastJobAddress.lat), Number(lastJobAddress.lng));
    }
  }

  const territory = await db.prepare(
    'SELECT service_area_type, service_area_data FROM territories WHERE id = ?'
  ).bind(territoryId).first<{ service_area_type: string; service_area_data: string }>();

  if (territory && customerLat !== null && customerLng !== null && territory.service_area_type === 'radius') {
    const area = JSON.parse(territory.service_area_data) as { center?: { lat?: number; lng?: number } };
    if (area.center?.lat !== undefined && area.center?.lng !== undefined) {
      return haversineKm(customerLat, customerLng, Number(area.center.lat), Number(area.center.lng));
    }
  }

  if (territory && customerLat !== null && customerLng !== null && territory.service_area_type === 'geofence') {
    const result = checkServiceArea('geofence', territory.service_area_data, { lat: customerLat, lng: customerLng });
    if (result.within) return 0;
  }

  return Number.MAX_SAFE_INTEGER;
};

export async function autoAssignProvider(db: D1Database, jobId: string, method: string): Promise<string | null> {
  const job = await db.prepare(
    `SELECT j.id, j.territory_id, j.scheduled_date, j.scheduled_start_time, j.duration_minutes,
            ca.lat AS customer_lat, ca.lng AS customer_lng
     FROM jobs j
     LEFT JOIN customer_addresses ca ON ca.id = j.customer_address_id
     WHERE j.id = ?`
  ).bind(jobId).first<JobContext>();

  if (!job || !job.territory_id) {
    return null;
  }

  const candidatesResult = await db.prepare(
    `SELECT tm.id, tm.auto_assign_priority
     FROM team_members tm
     JOIN team_member_territories tmt ON tmt.team_member_id = tm.id
     WHERE tmt.territory_id = ?
       AND tm.role = 'provider'
       AND tm.is_active = 1
       AND tm.can_be_auto_assigned = 1`
  ).bind(job.territory_id).all<Candidate>();

  const candidates = candidatesResult.results || [];
  const available: Candidate[] = [];

  for (const candidate of candidates) {
    const availableForSlot = await isProviderAvailableAt(
      db,
      candidate.id,
      job.scheduled_date,
      job.scheduled_start_time,
      job.duration_minutes
    );
    if (!availableForSlot) continue;

    const conflicted = await hasConflict(
      db,
      candidate.id,
      job.scheduled_date,
      job.scheduled_start_time,
      job.duration_minutes
    );
    if (!conflicted) {
      available.push(candidate);
    }
  }

  if (available.length === 0) {
    return null;
  }

  if (method === 'prioritized') {
    available.sort((a, b) => Number(a.auto_assign_priority) - Number(b.auto_assign_priority));
    return available[0]?.id ?? null;
  }

  if (method === 'drive_time') {
    const scored = await Promise.all(
      available.map(async (candidate) => ({
        candidate,
        distance: await distanceScore(
          db,
          candidate.id,
          job.territory_id,
          job.customer_lat,
          job.customer_lng
        ),
      }))
    );

    scored.sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      return Number(a.candidate.auto_assign_priority) - Number(b.candidate.auto_assign_priority);
    });

    return scored[0]?.candidate.id ?? null;
  }

  const workloadRows = await db.prepare(
    `SELECT jp.team_member_id, COUNT(*) AS job_count
     FROM job_providers jp
     JOIN jobs j ON j.id = jp.job_id
     WHERE jp.team_member_id IN (${available.map(() => '?').join(', ')})
       AND j.scheduled_date = ?
       AND j.status NOT IN ('cancelled', 'complete')
     GROUP BY jp.team_member_id`
  ).bind(...available.map((p) => p.id), job.scheduled_date).all<{ team_member_id: string; job_count: number }>();

  const counts = new Map<string, number>();
  for (const row of workloadRows.results || []) {
    counts.set(row.team_member_id, Number(row.job_count));
  }

  available.sort((a, b) => {
    const aCount = counts.get(a.id) || 0;
    const bCount = counts.get(b.id) || 0;
    if (aCount !== bCount) return aCount - bCount;
    return Number(a.auto_assign_priority) - Number(b.auto_assign_priority);
  });

  return available[0]?.id ?? null;
}
