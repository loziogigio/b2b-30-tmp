export interface MymbRequestOpts {
    method?: 'GET' | 'POST';
    params?: Record<string, unknown>;
    body?: unknown;
    fetchImpl?: typeof fetch;
}
/** MYMB transport: Basic auth, optional query params / JSON body, HTTP-error → ErpError. */
export declare function mymbRequest<T = any>(baseUrl: string, authHeader: string, endpoint: string, opts?: MymbRequestOpts): Promise<T>;
//# sourceMappingURL=request.d.ts.map