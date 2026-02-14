type PriceRule = {
  id: string;
  service_id: string | null;
  territory_id: string | null;
  rule_type: string;
  adjustment_type: string;
  adjustment_value: number;
  direction: string;
  days_of_week: string | null;
  start_time: string | null;
  end_time: string | null;
  min_hours_ahead: number | null;
  max_hours_ahead: number | null;
};

const toMinutes = (value: string): number => {
  const [hRaw, mRaw] = value.split(':');
  const h = Number(hRaw);
  const m = Number(mRaw ?? 0);
  return h * 60 + m;
};

const parseDaysOfWeek = (days: string | null): number[] => {
  if (!days) return [];
  try {
    const parsed = JSON.parse(days);
    if (Array.isArray(parsed)) {
      return parsed.map((v) => Number(v)).filter((v) => Number.isFinite(v));
    }
  } catch {
  }
  return days
    .split(',')
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isFinite(v));
};

const matchTimeWindow = (start: string, ruleStart: string | null, ruleEnd: string | null): boolean => {
  if (!ruleStart || !ruleEnd) return false;
  const minute = toMinutes(start);
  const startMin = toMinutes(ruleStart);
  const endMin = toMinutes(ruleEnd);

  if (endMin >= startMin) {
    return minute >= startMin && minute <= endMin;
  }

  return minute >= startMin || minute <= endMin;
};

const isRuleApplicable = (
  rule: PriceRule,
  territoryId: string,
  date: string,
  startTime: string,
  bookingDateTime: Date
): boolean => {
  if (rule.territory_id && rule.territory_id !== territoryId) {
    return false;
  }

  if (rule.rule_type === 'territory') {
    return true;
  }

  if (rule.rule_type === 'time_of_day') {
    return matchTimeWindow(startTime, rule.start_time, rule.end_time);
  }

  if (rule.rule_type === 'day_of_week') {
    const day = new Date(`${date}T00:00:00`).getDay();
    const allowed = parseDaysOfWeek(rule.days_of_week);
    return allowed.length === 0 ? false : allowed.includes(day);
  }

  if (rule.rule_type === 'lead_time') {
    const diffHours = (bookingDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
    if (rule.min_hours_ahead !== null && diffHours < rule.min_hours_ahead) {
      return false;
    }
    if (rule.max_hours_ahead !== null && diffHours > rule.max_hours_ahead) {
      return false;
    }
    return true;
  }

  return false;
};

export async function calculateAdjustedPrice(
  db: D1Database,
  serviceId: string,
  basePrice: number,
  territoryId: string,
  date: string,
  startTime: string
): Promise<{ total_price: number; rule_adjustments: unknown[] }> {
  const rulesResult = await db.prepare(
    `SELECT id, service_id, territory_id, rule_type, adjustment_type, adjustment_value, direction,
            days_of_week, start_time, end_time, min_hours_ahead, max_hours_ahead
     FROM price_adjustment_rules
     WHERE is_active = 1
       AND (service_id = ? OR service_id IS NULL)
       AND (territory_id = ? OR territory_id IS NULL)
     ORDER BY created_at ASC`
  ).bind(serviceId, territoryId).all<PriceRule>();

  const bookingDateTime = new Date(`${date}T${startTime}:00`);
  let runningTotal = basePrice;
  const applied: Array<Record<string, unknown>> = [];

  for (const rule of rulesResult.results || []) {
    if (!isRuleApplicable(rule, territoryId, date, startTime, bookingDateTime)) {
      continue;
    }

    const directionMultiplier = rule.direction === 'decrease' ? -1 : 1;
    let delta = 0;

    if (rule.adjustment_type === 'flat') {
      delta = Math.round(Number(rule.adjustment_value || 0)) * directionMultiplier;
    } else if (rule.adjustment_type === 'percentage') {
      const pct = Number(rule.adjustment_value || 0) / 100;
      delta = Math.round(runningTotal * pct) * directionMultiplier;
    } else {
      continue;
    }

    runningTotal += delta;

    applied.push({
      id: rule.id,
      rule_type: rule.rule_type,
      adjustment_type: rule.adjustment_type,
      adjustment_value: rule.adjustment_value,
      direction: rule.direction,
      delta,
      total_after_rule: runningTotal,
    });
  }

  return {
    total_price: Math.max(0, Math.round(runningTotal)),
    rule_adjustments: applied,
  };
}
