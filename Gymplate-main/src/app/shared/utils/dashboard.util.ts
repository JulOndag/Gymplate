import { Order } from '../../models';

/** Orders per day for the last `days` days (oldest first). Used by the small trend lines. */
export function dailyCounts(orders: Order[], days = 7): number[] {
  const counts = new Array(days).fill(0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const o of orders) {
    const d = new Date(o.createdAt);
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
    if (diff >= 0 && diff < days) counts[days - 1 - diff]++;
  }
  return counts;
}

/** Turns a list of numbers into an SVG path ("M x y L x y ...") that fits a w x h box. */
export function sparkPath(values: number[], w = 96, h = 32): string {
  if (values.length < 2) return '';
  const max = Math.max(...values, 1);
  const step = w / (values.length - 1);
  return values
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)} ${(h - 3 - (v / max) * (h - 6)).toFixed(1)}`)
    .join(' ');
}

/** Best sellers by quantity, built from real order items. */
export function topMeals(
  orders: Order[],
  limit = 3,
): { name: string; image: string; qty: number }[] {
  const map = new Map<string, { name: string; image: string; qty: number }>();
  for (const o of orders) {
    if (o.status === 'cancelled') continue;
    for (const it of o.items) {
      const row = map.get(it.productId) || { name: it.productName, image: it.productImageUrl, qty: 0 };
      row.qty += it.quantity;
      map.set(it.productId, row);
    }
  }
  return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, limit);
}

export function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}
