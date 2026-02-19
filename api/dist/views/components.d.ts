type FieldType = 'text' | 'email' | 'tel' | 'number' | 'textarea' | 'select' | 'checkbox' | 'date' | 'time' | 'hidden';
interface FormField {
    name: string;
    label: string;
    type?: FieldType;
    required?: boolean;
    value?: string | number | boolean;
    options?: {
        value: string;
        label: string;
    }[];
    placeholder?: string;
    min?: number;
    max?: number;
    step?: number;
    readonly?: boolean;
    attrs?: Record<string, string>;
}
interface TableViewProps {
    title: string;
    columns: string[];
    rows: Record<string, unknown>[];
    createUrl?: string;
    extraActions?: {
        label: string;
        url: string;
    }[];
    detailUrlPrefix?: string;
    deleteUrlPrefix?: string;
    rawIds?: string[];
}
interface FormViewProps {
    title: string;
    fields: FormField[];
    submitUrl: string;
    cancelUrl: string;
    isEdit?: boolean;
    deleteUrl?: string;
    error?: string;
}
declare const TableView: ({ title, columns, rows, createUrl, extraActions, detailUrlPrefix, deleteUrlPrefix, rawIds }: TableViewProps) => import("hono/jsx/jsx-dev-runtime").JSX.Element;
declare const FormView: ({ title, fields, submitUrl, cancelUrl, isEdit, deleteUrl, error }: FormViewProps) => import("hono/jsx/jsx-dev-runtime").JSX.Element;
interface DetailViewProps {
    title: string;
    subtitle?: string;
    fields: {
        label: string;
        value: unknown;
    }[];
    editUrl?: string;
    backUrl: string;
    actions?: {
        label: string;
        url: string;
        method?: string;
        variant?: 'primary' | 'secondary' | 'danger';
    }[];
}
declare const DetailView: ({ title, subtitle, fields, editUrl, backUrl, actions }: DetailViewProps) => import("hono/jsx/jsx-dev-runtime").JSX.Element;
declare const StatusIcon: ({ status }: {
    status: string;
}) => import("hono/jsx/jsx-dev-runtime").JSX.Element;
declare const StatusBadge: ({ status }: {
    status: string;
}) => import("hono/jsx/jsx-dev-runtime").JSX.Element;
export { TableView, FormView, DetailView, StatusBadge, StatusIcon };
export type { FormField, TableViewProps, FormViewProps, DetailViewProps };
//# sourceMappingURL=components.d.ts.map