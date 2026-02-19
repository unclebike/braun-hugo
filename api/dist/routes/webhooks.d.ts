import { Hono } from 'hono';
declare const app: Hono<{
    Bindings: {
        DB: D1Database;
    };
}, import("hono/types").BlankSchema, "/">;
export default app;
//# sourceMappingURL=webhooks.d.ts.map