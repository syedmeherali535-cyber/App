import type {
  AdminOrderDetail,
  AdminTestimonial,
  AdminOrder,
  CustomerRow,
  EmailConfig,
  OrderSummaryRow,
  Overview,
  PortfolioItem,
  PublicSettings,
  Service,
  SessionInfo,
  Testimonial,
} from './types';

export class ApiError extends Error {
  status: number;
  fields: Record<string, string>;

  constructor(message: string, status: number, fields: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(path, { ...init, headers, credentials: 'same-origin' });
  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  if (!response.ok) {
    const payload = (data ?? {}) as { error?: string; fields?: Record<string, string> };
    throw new ApiError(payload.error || `Request failed (${response.status}).`, response.status, payload.fields || {});
  }
  return (data ?? {}) as T;
}

const json = (body: unknown) => JSON.stringify(body);

export const api = {
  settings: () => request<PublicSettings>('/api/settings'),
  services: () => request<{ services: Service[] }>('/api/services'),
  portfolio: (category?: string) =>
    request<{ items: PortfolioItem[]; categories: { category: string; count: number }[] }>(
      category ? `/api/portfolio?category=${encodeURIComponent(category)}` : '/api/portfolio',
    ),
  testimonials: () => request<{ testimonials: Testimonial[] }>('/api/testimonials'),

  submitOrder: (form: FormData) =>
    request<{
      ref: string;
      message: string;
      emailConfigured: boolean;
      notifications: { type: string; status: string }[];
    }>('/api/orders', { method: 'POST', body: form }),

  // --- admin ---
  session: () => request<SessionInfo>('/api/admin/session'),
  login: (password: string) =>
    request<{ authenticated: boolean }>('/api/admin/login', { method: 'POST', body: json({ password }) }),
  logout: () => request<{ authenticated: boolean }>('/api/admin/logout', { method: 'POST' }),
  overview: () => request<Overview>('/api/admin/overview'),

  orders: (params: { q?: string; status?: string; payment?: string }) => {
    const search = new URLSearchParams();
    if (params.q) search.set('q', params.q);
    if (params.status) search.set('status', params.status);
    if (params.payment) search.set('payment', params.payment);
    const suffix = search.toString() ? `?${search.toString()}` : '';
    return request<{ orders: AdminOrder[]; total: number }>(`/api/admin/orders${suffix}`);
  },
  order: (ref: string) => request<AdminOrderDetail>(`/api/admin/orders/${encodeURIComponent(ref)}`),
  updateOrder: (
    ref: string,
    patch: Partial<{
      status: string;
      payment_status: string;
      quote_amount: string;
      quote_currency: string;
      admin_notes: string;
      status_note: string;
    }>,
  ) =>
    request<{ order: AdminOrder; notifications: { type: string; status: string; detail: string }[] }>(
      `/api/admin/orders/${encodeURIComponent(ref)}`,
      { method: 'PATCH', body: json(patch) },
    ),
  addNote: (ref: string, note: string) =>
    request<{ adminNotes: string }>(`/api/admin/orders/${encodeURIComponent(ref)}/notes`, {
      method: 'POST',
      body: json({ note }),
    }),
  uploadDeliveryFiles: (ref: string, files: File[]) => {
    const form = new FormData();
    for (const file of files) form.append('files', file);
    return request<{ files: { id: number; originalName: string }[] }>(
      `/api/admin/orders/${encodeURIComponent(ref)}/files`,
      { method: 'POST', body: form },
    );
  },
  deleteFile: (ref: string, id: number) =>
    request<{ deleted: number }>(`/api/admin/orders/${encodeURIComponent(ref)}/files/${id}`, { method: 'DELETE' }),
  notify: (ref: string, type: string) =>
    request<{ status: string; detail: string }>(`/api/admin/orders/${encodeURIComponent(ref)}/notify`, {
      method: 'POST',
      body: json({ type }),
    }),
  customers: () => request<{ customers: CustomerRow[] }>('/api/admin/customers'),

  adminPortfolio: () => request<{ items: PortfolioItem[] }>('/api/admin/portfolio'),
  createPortfolio: (form: FormData) =>
    request<{ id: number }>('/api/admin/portfolio', { method: 'POST', body: form }),
  updatePortfolio: (id: number, patch: Record<string, unknown>) =>
    request<{ id: number }>(`/api/admin/portfolio/${id}`, { method: 'PATCH', body: json(patch) }),
  replacePortfolioImage: (id: number, file: File) => {
    const form = new FormData();
    form.append('image', file);
    return request<{ imageUrl: string }>(`/api/admin/portfolio/${id}/image`, { method: 'POST', body: form });
  },
  deletePortfolio: (id: number) => request<{ deleted: number }>(`/api/admin/portfolio/${id}`, { method: 'DELETE' }),

  adminServices: () => request<{ services: Service[] }>('/api/admin/services'),
  createService: (payload: Record<string, unknown>) =>
    request<{ id: number }>('/api/admin/services', { method: 'POST', body: json(payload) }),
  updateService: (id: number, payload: Record<string, unknown>) =>
    request<{ id: number }>(`/api/admin/services/${id}`, { method: 'PATCH', body: json(payload) }),
  deleteService: (id: number) => request<{ deleted: number }>(`/api/admin/services/${id}`, { method: 'DELETE' }),

  adminTestimonials: () => request<{ testimonials: AdminTestimonial[] }>('/api/admin/testimonials'),
  createTestimonial: (payload: Record<string, unknown>) =>
    request<{ id: number }>('/api/admin/testimonials', { method: 'POST', body: json(payload) }),
  setTestimonialPublished: (id: number, published: boolean) =>
    request<{ id: number }>(`/api/admin/testimonials/${id}`, { method: 'PATCH', body: json({ published }) }),
  deleteTestimonial: (id: number) =>
    request<{ deleted: number }>(`/api/admin/testimonials/${id}`, { method: 'DELETE' }),

  adminSettings: () =>
    request<{ settings: Record<string, string>; email: EmailConfig; defaults: Record<string, string> }>(
      '/api/admin/settings',
    ),
  saveSettings: (payload: Record<string, string>) =>
    request<{ updated: string[]; settings: Record<string, string> }>('/api/admin/settings', {
      method: 'PUT',
      body: json(payload),
    }),
};

export type { OrderSummaryRow };
