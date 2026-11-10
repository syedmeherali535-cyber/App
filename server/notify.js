/**
 * Optional email notifications.
 *
 * Nothing is ever reported as "sent" unless a provider actually accepted the
 * message. With no provider configured every attempt is recorded as "skipped"
 * with a setup message so the admin dashboard can show the real state.
 */
export function emailConfig(env = process.env) {
  const provider = String(env.EMAIL_PROVIDER || '').trim().toLowerCase();
  const from = String(env.EMAIL_FROM || '').trim();
  const resendKey = String(env.RESEND_API_KEY || '').trim();
  const adminEmail = String(env.ADMIN_NOTIFICATION_EMAIL || '').trim();

  if (provider === 'resend') {
    if (!resendKey || !from) {
      return {
        configured: false,
        provider,
        from,
        adminEmail,
        message:
          'Resend is selected but RESEND_API_KEY and EMAIL_FROM are not both set. Notifications stay disabled until they are configured.',
      };
    }
    return {
      configured: true,
      provider,
      from,
      adminEmail,
      message: 'Resend is configured. Notifications are sent through the Resend API.',
    };
  }

  return {
    configured: false,
    provider: provider || 'none',
    from,
    adminEmail,
    message:
      'Email notifications are not configured. Set EMAIL_PROVIDER=resend with RESEND_API_KEY and EMAIL_FROM to enable them.',
  };
}

export const NOTIFICATION_TYPES = {
  'order-received': {
    label: 'New order confirmation',
    subject: (order) => `Meher EMB — we received your order ${order.ref}`,
    body: (order) =>
      `Hello ${order.customer_name},\n\nThank you for your order ${order.ref} (${order.service}).\n` +
      `Our team is reviewing your artwork and will send a quotation and private payment instructions.\n\n` +
      `You can reach us any time on WhatsApp: ${order.whatsapp_link || ''}\n\nMeher Ali EMB Studio`,
  },
  'admin-new-order': {
    label: 'Admin new-order alert',
    subject: (order) => `New order ${order.ref} — ${order.service}`,
    body: (order) =>
      `New order ${order.ref}\nCustomer: ${order.customer_name} <${order.customer_email}>\n` +
      `WhatsApp: ${order.whatsapp}\nService: ${order.service}\nSize: ${order.design_size}\n\n${order.details}`,
  },
  quotation: {
    label: 'Quotation notification',
    subject: (order) => `Meher EMB quotation for order ${order.ref}`,
    body: (order) =>
      `Hello ${order.customer_name},\n\nYour quotation for order ${order.ref} is ${order.quote_currency} ${order.quote_amount}.\n` +
      `Payment instructions are sent separately on WhatsApp (${order.whatsapp_link || ''}).\n\nMeher Ali EMB Studio`,
  },
  'payment-verified': {
    label: 'Payment verified notification',
    subject: (order) => `Payment verified — order ${order.ref}`,
    body: (order) =>
      `Hello ${order.customer_name},\n\nWe verified your payment for order ${order.ref}. Digitizing has started.\n\nMeher Ali EMB Studio`,
  },
  completed: {
    label: 'Order completion notification',
    subject: (order) => `Order ${order.ref} is ready`,
    body: (order) =>
      `Hello ${order.customer_name},\n\nOrder ${order.ref} has passed quality check and is ready for delivery.\n\nMeher Ali EMB Studio`,
  },
  delivered: {
    label: 'Final file delivery notification',
    subject: (order) => `Your embroidery files for order ${order.ref}`,
    body: (order) =>
      `Hello ${order.customer_name},\n\nYour digitized files for order ${order.ref} have been prepared.\n` +
      `Reply on WhatsApp if you need another format.\n\nMeher Ali EMB Studio`,
  },
};

/**
 * Send one notification. Always resolves with a structured result; never throws.
 * @returns {Promise<{status: 'sent'|'skipped'|'failed', detail: string}>}
 */
export async function sendNotification({ env = process.env, type, order, to, fetchImpl = globalThis.fetch }) {
  const config = emailConfig(env);
  const template = NOTIFICATION_TYPES[type];
  if (!template) return { status: 'failed', detail: `Unknown notification type: ${type}` };
  if (!config.configured) return { status: 'skipped', detail: config.message };
  if (!to) return { status: 'skipped', detail: 'No recipient address is configured for this notification.' };
  if (typeof fetchImpl !== 'function') return { status: 'failed', detail: 'No fetch implementation available.' };

  try {
    const response = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: config.from,
        to: [to],
        subject: template.subject(order),
        text: template.body(order),
      }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return { status: 'failed', detail: `Provider rejected the message (${response.status}). ${text}`.trim() };
    }
    return { status: 'sent', detail: `Sent through Resend to ${to}.` };
  } catch (error) {
    return { status: 'failed', detail: `Provider request failed: ${error.message}` };
  }
}
