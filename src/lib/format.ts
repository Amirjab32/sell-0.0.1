import type { StockStatus } from '../types/catalog';

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const;

export function toPersianDigits(input: string | number): string {
  return String(input).replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)] ?? digit);
}

export function formatToman(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 'تماس بگیرید';
  }
  const formatted = Math.round(amount).toLocaleString('en-US');
  return `${toPersianDigits(formatted)} تومان`;
}

export function formatTomanNumber(amount: number): string {
  if (!Number.isFinite(amount)) {
    return '۰';
  }
  const formatted = Math.round(amount).toLocaleString('en-US');
  return toPersianDigits(formatted);
}

export function formatTomanParts(amount: number): { value: string; unit: string } {
  if (!Number.isFinite(amount) || amount <= 0) {
    return { value: 'تماس بگیرید', unit: '' };
  }
  return { value: formatTomanNumber(amount), unit: 'تومان' };
}

export function formatSyncTimestamp(isoString: string | null): string {
  if (!isoString) {
    return 'همگام‌سازی هنوز انجام نشده است';
  }
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return 'نامشخص';
  }
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return isoString;
  }
}

export function getStockMeta(status: StockStatus): {
  label: string;
  tone: 'emerald' | 'amber' | 'slate';
} {
  switch (status) {
    case 'in_stock':
      return { label: 'موجود در انبار', tone: 'emerald' };
    case 'call':
      return { label: 'استعلام قیمت و موجودی', tone: 'amber' };
    case 'out_of_stock':
    default:
      return { label: 'ناموجود', tone: 'slate' };
  }
}
