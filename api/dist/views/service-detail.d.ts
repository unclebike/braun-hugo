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
    categories: Array<{
        id: string;
        name: string;
    }>;
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
    requiredSkills: Array<{
        id: string;
        name: string;
    }>;
    allSkills: Array<{
        id: string;
        name: string;
    }>;
    territories: Array<{
        id: string;
        name: string;
    }>;
}
export declare const ServiceDetailPage: ({ service, categories, modifiers, priceRules, requiredSkills, allSkills, territories }: ServiceDetailPageProps) => import("hono/jsx/jsx-dev-runtime").JSX.Element;
export {};
//# sourceMappingURL=service-detail.d.ts.map