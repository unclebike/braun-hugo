export interface WizardState {
    customer_id?: string;
    customer_name?: string;
    customer_email?: string;
    address_line1?: string;
    address_city?: string;
    address_state?: string;
    address_postal?: string;
    address_lat?: string;
    address_lng?: string;
    territory_id?: string;
    territory_name?: string;
    service_id?: string;
    service_name?: string;
    service_price?: string;
    service_duration?: string;
    date?: string;
    time?: string;
    provider_id?: string;
}
export interface NewJobProps {
    customer?: {
        id: string;
        first_name: string;
        last_name: string;
        email?: string;
        phone?: string;
    };
    territories: Array<{
        id: string;
        name: string;
    }>;
    services: Array<{
        id: string;
        name: string;
        description?: string;
        base_price_cents: number;
        base_duration_minutes: number;
    }>;
    dates: string[];
    timeslots: string[];
    providers: Array<{
        id: string;
        first_name: string;
        last_name: string;
        role: string;
        is_available: boolean;
    }>;
    addressLine1?: string;
    addressCity?: string;
    addressState?: string;
    addressPostal?: string;
    addressLat?: string;
    addressLng?: string;
    selectedTerritoryId?: string;
    selectedServiceId?: string;
    selectedDate?: string;
    selectedTime?: string;
    selectedProviderId?: string;
    error?: string;
}
type WizardFlowProps = {
    step: number;
    state: WizardState;
    customer?: {
        id: string;
        first_name: string;
        last_name: string;
        email?: string;
        phone?: string;
    };
    services?: Array<{
        id: string;
        name: string;
        description?: string;
        base_price_cents: number;
        base_duration_minutes: number;
    }>;
    timeslots?: Array<{
        date: string;
        start_time: string;
        available: boolean;
    }>;
    providers?: Array<{
        id: string;
        first_name: string;
        last_name: string;
        role: string;
        is_available: boolean;
    }>;
    error?: string;
};
export declare const JobWizardPage: (props: NewJobProps | WizardFlowProps) => import("hono/jsx/jsx-dev-runtime").JSX.Element;
export declare const JobWizardSwapBundle: ({ props, targetId }: {
    props: NewJobProps | WizardFlowProps;
    targetId: string;
}) => import("hono/jsx/jsx-dev-runtime").JSX.Element;
export declare const CustomerSearchResults: ({ customers }: {
    customers: Array<{
        id: string;
        first_name: string;
        last_name: string;
        email?: string;
    }>;
}) => import("hono/jsx/jsx-dev-runtime").JSX.Element;
export declare const AddressSearchResults: ({ results, targetPrefix, }: {
    results: Array<{
        display: string;
        line1: string;
        city: string;
        state: string;
        postal: string;
        lat: string;
        lng: string;
    }>;
    targetPrefix?: string;
}) => import("hono/jsx/jsx-dev-runtime").JSX.Element;
export declare const parseWizardState: (body: Record<string, unknown>) => WizardState;
export {};
//# sourceMappingURL=job-wizard.d.ts.map