const euroFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatCurrency(value: number): string {
  return euroFormatter.format(value);
}

export function formatDate(isoDate: string): string {
  return dateFormatter.format(new Date(isoDate));
}

export function formatRange(min: number, max: number): string {
  return `${formatCurrency(min)} bis ${formatCurrency(max)}`;
}

export function daysUntil(isoDate: string): number {
  const today = new Date();
  const endDate = new Date(isoDate);
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((endDate.getTime() - today.getTime()) / millisecondsPerDay);
}
