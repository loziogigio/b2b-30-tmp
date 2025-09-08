// src/utils/date-to-erp.ts
export const toErpNumericDate = (inputISO: string) => {
    // "2025-08-21" -> "21082025"
    const [y, m, d] = inputISO.split('-');
    return `${d}${m}${y}`;
  };
  
  export const pad = (n: number) => `${n}`.padStart(2, '0');
  export const toInputDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  export const lastMonthRange = () => {
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - 30);
    return { from: toInputDate(start), to: toInputDate(today) };
  };
  