export interface AuthContext {
    type: 'api_key' | 'cf_access';
    userId?: string;
    email?: string;
}
declare module 'hono' {
    interface ContextVariableMap {
        auth: AuthContext;
    }
}
export declare const PUBLIC_PATHS: string[];
export declare const authMiddleware: import("hono").MiddlewareHandler<any, any, {}, any>;
export declare function requireAuth(): import("hono").MiddlewareHandler<any, any, {}, any>;
//# sourceMappingURL=auth.d.ts.map