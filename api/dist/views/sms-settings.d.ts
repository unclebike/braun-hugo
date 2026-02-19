interface TwilioConfigProps {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
    enabled: boolean;
}
interface SmsTemplate {
    id: string;
    event_type: string;
    label: string;
    body_template: string;
    is_active: number;
}
interface SmsStats {
    total: number;
    sent: number;
    received: number;
    failed: number;
    total_segments: number;
}
interface Props {
    config: TwilioConfigProps | null;
    templates: SmsTemplate[];
    stats: SmsStats | null;
}
export declare const SmsSettingsPage: ({ config, templates, stats }: Props) => import("hono/jsx/jsx-dev-runtime").JSX.Element;
export {};
//# sourceMappingURL=sms-settings.d.ts.map