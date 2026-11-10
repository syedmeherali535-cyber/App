/**
 * Small shared helpers: async wrapper, input cleaning and order validation.
 */
import crypto from 'node:crypto';
import { DELIVERY_FORMATS } from './db.js';

export const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function cleanString(value, max = 200) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/\r\n/g, '\n').trim().slice(0, max);
}

export function isEmail(value) {
  return typeof value === 'string' && value.length <= 160 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function makeOrderRef(db) {
  const now = new Date();
  const stamp =
    String(now.getFullYear()).slice(2) +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  for (let attempt = 0; attempt < 10; attempt += 1) {
    let tail = '';
    for (const byte of crypto.randomBytes(4)) tail += REF_ALPHABET[byte % REF_ALPHABET.length];
    const ref = `ME-${stamp}-${tail}`;
    if (!db.prepare('SELECT 1 FROM orders WHERE ref = ?').get(ref)) return ref;
  }
  throw new Error('Unable to allocate a unique order reference.');
}

export function parseJson(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function truthyFlag(value) {
  return value === true || value === 'true' || value === 'on' || value === '1' || value === 1;
}

/**
 * Server-side validation for order submissions.
 * @returns {{errors: Record<string,string>, value: object}}
 */
export function validateOrderInput(body = {}) {
  const errors = {};
  const value = {
    customer_name: cleanString(body.customer_name, 120),
    customer_email: cleanString(body.customer_email, 160).toLowerCase(),
    whatsapp: cleanString(body.whatsapp, 32),
    country: cleanString(body.country, 80),
    service: cleanString(body.service, 120),
    design_size: cleanString(body.design_size, 120),
    details: cleanString(body.details, 4000),
    preferred_format: cleanString(body.preferred_format, 8).toUpperCase(),
    budget: cleanString(body.budget, 60),
    marketing_opt_in: truthyFlag(body.marketing_opt_in) ? 1 : 0,
  };

  if (value.customer_name.length < 2) errors.customer_name = 'Please enter your full name.';
  if (!isEmail(value.customer_email)) errors.customer_email = 'Enter a valid email address.';
  if (!/^[+()\-\s\d]{6,32}$/.test(value.whatsapp)) {
    errors.whatsapp = 'Enter a valid WhatsApp number (digits, spaces, + or - only).';
  }
  if (!value.service) errors.service = 'Choose the service you need.';
  if (value.design_size.length < 2) errors.design_size = 'Tell us the design size or placement.';
  if (value.details.length < 10) errors.details = 'Please describe the design in at least 10 characters.';
  if (!DELIVERY_FORMATS.includes(value.preferred_format)) {
    errors.preferred_format = `Choose one of: ${DELIVERY_FORMATS.join(', ')}.`;
  }

  return { errors, value };
}

export function statusHistory(order) {
  return parseJson(order.status_history, []);
}
