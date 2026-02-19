interface Message {
    id: string;
    source: string;
    status: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    postal_code: string | null;
    reason: string | null;
    subject: string | null;
    body: string | null;
    metadata: string | null;
    is_read: number;
    read_at: string | null;
    replied_at: string | null;
    created_at: string;
    updated_at: string;
}
export interface SmsLogRow {
    id: string;
    direction: string;
    body: string;
    status: string;
    created_at: string;
    segments: number;
}
interface Props {
    message: Message;
    smsHistory: SmsLogRow[];
    twilioEnabled: boolean;
    phoneE164: string | null;
    jobOptions: Array<{
        id: string;
        label: string;
    }>;
    selectedJobId: string | null;
    completedTaskSmsIds: string[];
    sendResult?: {
        success: boolean;
        error?: string;
    } | null;
    taskResult?: {
        success: boolean;
        error?: string;
        message?: string;
    } | null;
}
export declare const SmsHistoryList: ({ smsHistory, messageId, canCreateTask, jobOptions, selectedJobId, completedTaskSmsIds, }: {
    smsHistory: SmsLogRow[];
    messageId: string;
    canCreateTask: boolean;
    jobOptions: Array<{
        id: string;
        label: string;
    }>;
    selectedJobId: string | null;
    completedTaskSmsIds: string[];
}) => import("hono/jsx/jsx-dev-runtime").JSX.Element;
export declare const SmsThreadPanel: ({ messageId, smsHistory, twilioEnabled, phoneE164, customerName, jobOptions, selectedJobId, completedTaskSmsIds, sendResult, taskResult }: {
    messageId: string;
    smsHistory: SmsLogRow[];
    twilioEnabled: boolean;
    phoneE164: string | null;
    customerName?: string | null;
    jobOptions: Array<{
        id: string;
        label: string;
    }>;
    selectedJobId: string | null;
    completedTaskSmsIds: string[];
    sendResult?: {
        success: boolean;
        error?: string;
    } | null;
    taskResult?: {
        success: boolean;
        error?: string;
        message?: string;
    } | null;
}) => import("hono/jsx/jsx-dev-runtime").JSX.Element | null;
export declare const MessageDetailPage: ({ message, smsHistory, twilioEnabled, phoneE164, jobOptions, selectedJobId, completedTaskSmsIds, sendResult, taskResult }: Props) => import("hono/jsx/jsx-dev-runtime").JSX.Element;
export {};
//# sourceMappingURL=message-detail.d.ts.map