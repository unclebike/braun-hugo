declare const _default: {
    fetch: (request: Request, Env?: {} | {
        DB: D1Database;
        ASSETS: any;
        MAPBOX_ACCESS_TOKEN?: string;
    } | undefined, executionCtx?: import("hono").ExecutionContext) => Response | Promise<Response>;
    scheduled(event: ScheduledEvent, env: {
        DB: D1Database;
    }, ctx: ExecutionContext): Promise<void>;
};
export default _default;
//# sourceMappingURL=index.d.ts.map