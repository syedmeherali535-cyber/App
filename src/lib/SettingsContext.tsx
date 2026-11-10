import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from './api';
import type { PublicSettings } from './types';

export const FALLBACK_SETTINGS: PublicSettings = {
  business_name: 'Meher Ali EMB Studio',
  app_name: 'Meher EMB',
  tagline: 'Professional Embroidery Digitizing Services',
  email: 'syedmeherali535@gmail.com',
  whatsapp_link: 'https://wa.link/uhskv6',
  website: 'https://meheraliembstudio.blogspot.com/',
  pinterest: 'https://www.pinterest.com/meheraliembstudio/',
  currency: 'USD',
  turnaround: 'Most designs are delivered within 12–24 hours after payment verification.',
  order_notice:
    'Send your artwork and requirements. We reply with a quotation and private payment instructions — usually within a few hours.',
  payment_methods: 'Easypaisa, Bank AL Habib Bank Transfer, Payoneer, AirTM, Skrill',
  testimonials_enabled: true,
  delivery_formats: ['DST', 'PES', 'JEF', 'VP3', 'EMB'],
};

interface SettingsContextValue {
  settings: PublicSettings;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextValue>({ settings: FALLBACK_SETTINGS, loading: true });

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PublicSettings>(FALLBACK_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .settings()
      .then((next) => {
        if (active) setSettings({ ...FALLBACK_SETTINGS, ...next });
      })
      .catch(() => {
        /* keep the bundled defaults if the API is unreachable */
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return <SettingsContext.Provider value={{ settings, loading }}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  return useContext(SettingsContext);
}

export function whatsappHref(link: string, message: string) {
  const text = encodeURIComponent(message);
  if (!link) return `https://wa.me/?text=${text}`;
  if (link.includes('?')) return `${link}&text=${text}`;
  return link;
}
