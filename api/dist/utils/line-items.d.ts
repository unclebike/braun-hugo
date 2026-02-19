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
export declare const formatMoney: (cents: number) => string;
export declare const parsePriceLines: (raw: string | null | undefined) => PriceLineItem[];
export declare const linesToInvoicePayload: (lines: PriceLineItem[]) => {
    description: string;
    quantity: number;
    unit_price_cents: number;
    total_cents: number;
}[];
export declare const subtotalFromLines: (lines: PriceLineItem[]) => number;
export declare const normalizeLine: (description: string, quantity: number, unitPriceCents: number, kind: LineItemKind, parentId: string | null, isCustom: number) => PriceLineItem;
export declare const buildServiceBaseLine: (serviceName: string, unitPriceCents: number) => PriceLineItem;
export declare const linesToEditableText: (lines: PriceLineItem[]) => string;
export declare const parseEditableText: (raw: string | null | undefined) => PriceLineItem[];
//# sourceMappingURL=line-items.d.ts.map