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
    services: Array<{
        id: string;
        name: string;
        assigned: boolean;
    }>;
    providers: Array<{
        id: string;
        first_name: string;
        last_name: string;
        assigned: boolean;
    }>;
    isNew?: boolean;
}
export declare const ZipPanel: ({ tid, zipCodes }: {
    tid: string;
    zipCodes: string[];
}) => import("hono/jsx/jsx-dev-runtime").JSX.Element;
export declare const RadiusPanel: ({ tid, areaData }: {
    tid: string;
    areaData: Record<string, unknown>;
}) => import("hono/jsx/jsx-dev-runtime").JSX.Element;
export declare const GeofencePanel: ({ tid, areaData }: {
    tid: string;
    areaData: Record<string, unknown>;
}) => import("hono/jsx/jsx-dev-runtime").JSX.Element;
export declare const TerritoryDetailPage: ({ territory, services, providers, isNew }: TerritoryDetailProps) => import("hono/jsx/jsx-dev-runtime").JSX.Element;
export {};
//# sourceMappingURL=territory-detail.d.ts.map