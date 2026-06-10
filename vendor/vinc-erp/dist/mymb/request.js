"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mymbRequest = mymbRequest;
const erp_client_js_1 = require("../erp-client.js");
/** MYMB transport: Basic auth, optional query params / JSON body, HTTP-error → ErpError. */
async function mymbRequest(baseUrl, authHeader, endpoint, opts = {}) {
    const method = opts.method ?? 'POST';
    const doFetch = opts.fetchImpl ?? fetch;
    const url = new URL(`${baseUrl}/${endpoint}`);
    if (opts.params) {
        for (const [k, v] of Object.entries(opts.params)) {
            if (v !== undefined && v !== null)
                url.searchParams.set(k, String(v));
        }
    }
    let res;
    try {
        res = await doFetch(url.toString(), {
            method,
            headers: {
                Authorization: authHeader,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: method === 'POST' && opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        });
    }
    catch (err) {
        throw new erp_client_js_1.ErpError(`ERP request failed: ${err.message}`, { endpoint });
    }
    if (!res.ok) {
        throw new erp_client_js_1.ErpError(`ERP request failed: HTTP ${res.status}`, { endpoint, status: res.status });
    }
    return (await res.json());
}
//# sourceMappingURL=request.js.map