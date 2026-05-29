"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErpError = void 0;
/** Typed error for any ERP request failure. */
class ErpError extends Error {
    constructor(message, detail = {}) {
        super(message);
        this.name = 'ErpError';
        this.endpoint = detail.endpoint;
        this.status = detail.status;
        this.returnCode = detail.returnCode;
    }
}
exports.ErpError = ErpError;
//# sourceMappingURL=erp-client.js.map