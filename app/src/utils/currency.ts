export function formatPrice(amount: number, currency: string): string {
  if (currency === 'VND') {
    return amount.toLocaleString('vi-VN').replace(/\./g, '.') + '₫';
  }
  if (currency === 'USD') {
    return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return amount.toLocaleString() + ' ' + currency;
}
