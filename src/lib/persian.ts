// Persian number conversion and formatting utilities

const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export const toPersianNumber = (num: number | string): string => {
  return String(num).replace(/\d/g, (d) => persianDigits[parseInt(d)]);
};

export const toEnglishNumber = (str: string): string => {
  return str.replace(/[۰-۹]/g, (d) => String(persianDigits.indexOf(d)));
};

export const formatPrice = (price: number, currency: 'TL' | 'USD' = 'TL'): string => {
  const formatted = new Intl.NumberFormat('fa-IR').format(Math.round(price));
  return currency === 'TL' ? `${formatted} لیر` : `${formatted} دلار`;
};

export const formatPersianDate = (date: Date | string): string => {
  const d = new Date(date);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    calendar: 'persian',
  };
  return d.toLocaleDateString('fa-IR', options);
};

export const formatPersianDateTime = (date: Date | string): string => {
  const d = new Date(date);
  const dateStr = formatPersianDate(d);
  const timeStr = d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  return `${dateStr} - ساعت ${timeStr}`;
};

// Order status translations
export const orderStatusLabels: Record<string, string> = {
  pending: 'در انتظار بررسی',
  approved: 'تایید شده',
  rejected: 'رد شده',
};

// Ticket tier translations
export const tierTypeLabels: Record<string, string> = {
  vip: 'VIP',
  regular: 'عادی',
  economy: 'اقتصادی',
};
