// utils/money.ts
export function money(v: any) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  