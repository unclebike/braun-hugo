import { Hono } from 'hono';
declare const app: Hono<{
    Bindings: {
        DB: D1Database;
        MAPBOX_ACCESS_TOKEN?: string;
    };
}, import("hono/types").BlankSchema, "/">;
export default app;
//# sourceMappingURL=scheduling.d.ts.map