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
    weeklyHours: Array<{
        day_of_week: number;
        start_time: string;
        end_time: string;
    }>;
    dateOverrides: Array<{
        id: string;
        date: string;
        is_available: number;
        start_time?: string;
        end_time?: string;
    }>;
    skills: Array<{
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
        assigned: boolean;
    }>;
}
export declare const ProviderDetailPage: ({ member, weeklyHours, dateOverrides, skills, allSkills, territories }: ProviderDetailPageProps) => import("hono/jsx/jsx-dev-runtime").JSX.Element;
export {};
//# sourceMappingURL=provider-detail.d.ts.map