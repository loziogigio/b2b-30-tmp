export interface MyMbConnection {
    /** Base URL with NO userinfo and NO trailing slash. */
    baseUrl: string;
    /** `Basic base64(user:pass)` */
    authHeader: string;
}
/**
 * Parse a MYMB connection string of the form
 * `http://user:pass@host:port/base/path` into a base URL (credentials
 * stripped) plus an HTTP Basic auth header built from the embedded userinfo.
 */
export declare function parseMyMbConnection(connectionUrl: string): MyMbConnection;
//# sourceMappingURL=auth.d.ts.map