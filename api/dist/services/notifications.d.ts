export interface PushSubscriptionInput {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
}
export interface PushSubscriptionPreferences {
    notifyNewJobs: boolean;
    notifyNewMessages: boolean;
}
export type PushEvent = {
    type: 'new_message' | 'new_job' | 'test';
    title: string;
    body: string;
    targetUrl: string;
};
export interface PendingPushNotification {
    id: string;
    title: string;
    body: string;
    url: string;
    createdAt: string;
}
export declare function getPushVapidPublicKey(db: D1Database): Promise<string>;
export declare function upsertPushSubscription(db: D1Database, staffEmail: string, subscription: PushSubscriptionInput, _preferences: PushSubscriptionPreferences): Promise<void>;
export declare function deactivatePushSubscription(db: D1Database, staffEmail: string, endpoint: string): Promise<void>;
export declare function getPushSubscriptionStatus(db: D1Database, staffEmail: string, endpoint?: string): Promise<{
    subscribed: boolean;
    notifyNewJobs: boolean;
    notifyNewMessages: boolean;
}>;
export declare function pullPendingPushNotifications(db: D1Database, staffEmail: string, endpoint: string, limit?: number): Promise<PendingPushNotification[]>;
export declare function enqueueTestPushNotificationAndPing(db: D1Database, staffEmail: string, endpoint: string): Promise<{
    ok: boolean;
    status: number;
    queued: boolean;
}>;
export declare function enqueueAndDispatchPushEvent(db: D1Database, event: PushEvent): Promise<void>;
export declare function sendNotification(type: string, data: unknown): Promise<void>;
//# sourceMappingURL=notifications.d.ts.map