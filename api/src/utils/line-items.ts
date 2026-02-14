export type LineItemKind = 'service' | 'modifier' | 'rule' | 'custom';

export type PriceLineItem = {
  id: string;
  parent_id: string | null;
  kind: LineItemKind;
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  is_custom: number;
};

const clampCents = (value: number) => Math.round(Number.isFinite(value) ? value : 0);

export const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export const parsePriceLines = (raw: string | null | undefined): PriceLineItem[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === 'object' && !Array.isArray(entry)))
      .map((entry) => {
        const quantity = typeof entry.quantity === 'number' ? entry.quantity : Number.parseFloat(String(entry.quantity || 1)) || 1;
        const unit = typeof entry.unit_price_cents === 'number'
          ? entry.unit_price_cents
          : Number.parseInt(String(entry.unit_price_cents || 0), 10) || 0;
        const total = typeof entry.total_cents === 'number'
          ? entry.total_cents
          : Math.round(quantity * unit);
        const kind = (entry.kind === 'service' || entry.kind === 'modifier' || entry.kind === 'rule' || entry.kind === 'custom')
          ? entry.kind
          : 'custom';
        return {
          id: typeof entry.id === 'string' && entry.id.trim() ? entry.id : crypto.randomUUID(),
          parent_id: typeof entry.parent_id === 'string' && entry.parent_id.trim() ? entry.parent_id : null,
          kind,
          description: typeof entry.description === 'string' && entry.description.trim() ? entry.description.trim() : 'Line item',
          quantity,
          unit_price_cents: clampCents(unit),
          total_cents: clampCents(total),
          is_custom: entry.is_custom ? 1 : 0,
        };
      });
  } catch {
    return [];
  }
};

export const linesToInvoicePayload = (lines: PriceLineItem[]) => lines.map((line) => ({
  description: line.description,
  quantity: line.quantity,
  unit_price_cents: line.unit_price_cents,
  total_cents: line.total_cents,
}));

export const subtotalFromLines = (lines: PriceLineItem[]) => lines.reduce((sum, line) => sum + line.total_cents, 0);

export const normalizeLine = (description: string, quantity: number, unitPriceCents: number, kind: LineItemKind, parentId: string | null, isCustom: number): PriceLineItem => ({
  id: crypto.randomUUID(),
  parent_id: parentId,
  kind,
  description: description.trim() || 'Line item',
  quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
  unit_price_cents: clampCents(unitPriceCents),
  total_cents: clampCents((Number.isFinite(quantity) && quantity > 0 ? quantity : 1) * unitPriceCents),
  is_custom: isCustom ? 1 : 0,
});

export const buildServiceBaseLine = (serviceName: string, unitPriceCents: number): PriceLineItem => normalizeLine(serviceName || 'Service', 1, unitPriceCents, 'service', null, 0);

export const linesToEditableText = (lines: PriceLineItem[]) => lines.map((line) => `${line.description} | ${line.quantity} | ${(line.unit_price_cents / 100).toFixed(2)}`).join('\n');

export const parseEditableText = (raw: string | null | undefined): PriceLineItem[] => {
  const lines = (raw || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const parsed: PriceLineItem[] = [];
  for (const line of lines) {
    const parts = line.split('|').map((part) => part.trim());
    if (parts.length < 3) continue;
    const description = parts[0] || 'Line item';
    const quantity = Math.max(0, Number.parseFloat(parts[1]) || 0);
    const unitCents = Math.max(0, Math.round((Number.parseFloat(parts[2].replace(/[$,]/g, '')) || 0) * 100));
    if (!description || quantity <= 0) continue;
    parsed.push(normalizeLine(description, quantity, unitCents, 'custom', null, 1));
  }
  return parsed;
};
