const CURRENCY_SYMBOLS: Record<string, string> = {
  VND: '₫',
  USD: '$',
  SGD: 'S$',
  THB: '฿',
  EUR: '€',
  GBP: '£',
};

export type PriceInput = {
  price_sale: number | null;
  price_range_min: number | null;
  price_range_max: number | null;
  price_rental: number | null;
  deal_price: number | null;
  deal_active: boolean;
  price_currency: string;
};

export function formatPrice(p: PriceInput): string {
  const symbol = CURRENCY_SYMBOLS[p.price_currency] ?? p.price_currency;
  const fmt = (n: number) =>
    p.price_currency === 'VND'
      ? Math.round(n).toLocaleString('vi-VN')
      : n.toLocaleString('en-US', { minimumFractionDigits: 0 });

  let result = '';

  if (p.deal_active && p.deal_price !== null) {
    result = `${symbol}${fmt(p.deal_price)}`;
  } else if (p.price_range_min !== null && p.price_range_max !== null) {
    result = `${symbol}${fmt(p.price_range_min)} – ${symbol}${fmt(p.price_range_max)}`;
  } else if (p.price_sale !== null) {
    result = `${symbol}${fmt(p.price_sale)}`;
  }

  if (p.price_rental !== null) {
    const rentStr = `Thuê: ${symbol}${fmt(p.price_rental)}`;
    result = result ? `${result} · ${rentStr}` : rentStr;
  }

  return result || 'Liên hệ';
}
