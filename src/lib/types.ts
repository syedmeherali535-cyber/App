export interface PublicSettings {
  business_name: string;
  app_name: string;
  tagline: string;
  email: string;
  whatsapp_link: string;
  website: string;
  pinterest: string;
  currency: string;
  turnaround: string;
  order_notice: string;
  payment_methods: string;
  testimonials_enabled: boolean;
  delivery_formats: string[];
}

export interface Service {
  id: number;
  slug: string;
  title: string;
  summary: string;
  description: string;
  features: string[];
  icon: string;
  active?: boolean;
  sortOrder?: number;
}

export interface PortfolioItem {
  id: number;
  title: string;
  category: string;
  description: string;
  altText: string;
  featured: boolean;
  isPlaceholder: boolean;
  sortOrder?: number;
  imageUrl: string | null;
}

export interface Testimonial {
  id: number;
  name: string;
  location: string;
  service: string;
  quote: string;
}

export interface OrderFile {
  id: number;
  kind: 'artwork' | 'delivery';
  originalName: string;
  mime: string;
  size: number;
  createdAt: string;
  downloadUrl: string;
}

export interface StatusEvent {
  status: string;
  at: string;
  note: string;
}

export interface AdminOrder {
  ref: string;
  createdAt: string;
  updatedAt: string;
  customerName: string;
  customerEmail: string;
  whatsapp: string;
  country: string;
  service: string;
  designSize: string;
  details: string;
  preferredFormat: string;
  budget: string;
  marketingOptIn: boolean;
  status: string;
  paymentStatus: string;
  quoteAmount: string;
  quoteCurrency: string;
  adminNotes: string;
  history: StatusEvent[];
  fileCount?: number;
}

export interface AdminOrderDetail {
  order: AdminOrder;
  files: OrderFile[];
  notifications: {
    id: number;
    type: string;
    status: string;
    detail: string;
    created_at: string;
  }[];
}

export interface OrderSummaryRow {
  ref: string;
  createdAt: string;
  customerName: string;
  service: string;
  status: string;
  paymentStatus: string;
  quoteAmount: string;
  quoteCurrency: string;
}

export interface EmailConfig {
  configured: boolean;
  provider: string;
  from: string;
  adminEmail: string;
  message: string;
}

export interface Overview {
  totals: {
    orders: number;
    newOrders: number;
    pendingPayments: number;
    active: number;
    completed: number;
    cancelled: number;
    customers: number;
    portfolio: number;
    services: number;
  };
  byStatus: Record<string, number>;
  recentOrders: OrderSummaryRow[];
  notifications: {
    id: number;
    orderRef: string;
    type: string;
    status: string;
    detail: string;
    createdAt: string;
  }[];
  email: EmailConfig;
}

export interface SessionInfo {
  authenticated: boolean;
  configured: boolean;
  setupMessage: string;
  email: EmailConfig;
  ephemeralSessionSecret: boolean;
  statuses: string[];
  paymentStatuses: string[];
  formats: string[];
  categories: string[];
}

export interface AdminTestimonial extends Testimonial {
  published: number;
}

export interface CustomerRow {
  email: string;
  name: string;
  orders: number;
  lastOrder: string;
  completed: number;
}
