export const STATUS_LABELS: Record<string, string> = {
  NEW: 'New Order',
  UNDER_REVIEW: 'Under Review',
  QUOTATION_SENT: 'Quotation Sent',
  AWAITING_PAYMENT: 'Awaiting Payment',
  PAYMENT_VERIFIED: 'Payment Verified',
  IN_PROGRESS: 'In Progress',
  QUALITY_CHECK: 'Quality Check',
  COMPLETED: 'Completed',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export const PAYMENT_LABELS: Record<string, string> = {
  UNPAID: 'Unpaid',
  AWAITING_PAYMENT: 'Awaiting payment',
  PAYMENT_VERIFIED: 'Payment verified',
  REFUNDED: 'Refunded',
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] || status;
}

export function paymentLabel(status: string): string {
  return PAYMENT_LABELS[status] || status;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const normalised = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const date = new Date(normalised);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function statusTone(status: string): string {
  switch (status) {
    case 'DELIVERED':
    case 'COMPLETED':
      return 'tone-success';
    case 'CANCELLED':
      return 'tone-danger';
    case 'IN_PROGRESS':
    case 'QUALITY_CHECK':
    case 'PAYMENT_VERIFIED':
      return 'tone-gold';
    case 'NEW':
      return 'tone-navy';
    default:
      return 'tone-muted';
  }
}

export function quoteText(order: { quoteAmount: string; quoteCurrency: string }): string {
  if (!order.quoteAmount) return 'Not quoted';
  return `${order.quoteCurrency} ${order.quoteAmount}`;
}
