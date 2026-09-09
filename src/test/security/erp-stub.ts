// The security suite never contacts ERP. A missing explicit mock fails closed.
export class CouponClient {
  constructor() {
    throw new Error('ERP access must be mocked in security tests');
  }
}
