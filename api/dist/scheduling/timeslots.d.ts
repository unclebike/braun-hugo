type Timeslot = {
    date: string;
    start_time: string;
    end_time: string;
    available: boolean;
    providers?: string[];
    price?: number;
    price_adjustment?: unknown;
};
export declare function generateTimeslots(db: D1Database, territoryId: string, date: string, durationMinutes: number, requiredProviderCount: number, requiredSkills: string[]): Promise<Timeslot[]>;
export {};
//# sourceMappingURL=timeslots.d.ts.map