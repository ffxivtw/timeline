const MS_PER_DAY = 86_400_000;

// 將 YYYY-MM-DD 解析為 UTC 午夜，避免使用者時區影響天數計算。
export function parseDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

// b - a 的整數天數差。
export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY);
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * MS_PER_DAY);
}

// 格式化為 YYYY-MM-DD（以 UTC 為準，與 parseDate 對稱）。
export function formatISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
