type PriceInput = {
  price:      number | null;
  is_range:   boolean;
  range_pct:  number | null;
  rent_price: number | null;
  symbol:     string;
};

export function formatPrice(p: PriceInput): string {
  const fmt = (n: number) => Math.round(n).toLocaleString('vi-VN');

  let result = '';

  if (p.price !== null) {
    if (p.is_range && p.range_pct !== null) {
      const low  = p.price * (1 - p.range_pct / 100);
      const high = p.price * (1 + p.range_pct / 100);
      result = `${p.symbol}${fmt(low)} – ${p.symbol}${fmt(high)}`;
    } else {
      result = `${p.symbol}${fmt(p.price)}`;
    }
  }

  if (p.rent_price !== null) {
    const rentStr = `Thuê: ${p.symbol}${fmt(p.rent_price)}`;
    result = result ? `${result} · ${rentStr}` : rentStr;
  }

  return result || 'Liên hệ';
}
