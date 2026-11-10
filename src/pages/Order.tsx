import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PageHero } from '../components/SiteLayout';
import { ApiError, api } from '../lib/api';
import { useAsync, useDocumentTitle } from '../lib/hooks';
import { useSettings, whatsappHref } from '../lib/SettingsContext';

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = '.png,.jpg,.jpeg,.pdf';

const EMPTY = {
  customer_name: '',
  customer_email: '',
  whatsapp: '',
  country: '',
  service: '',
  design_size: '',
  details: '',
  preferred_format: '',
  budget: '',
};

export default function Order() {
  useDocumentTitle('Place an Order — Meher EMB');
  const { settings } = useSettings();
  const [params] = useSearchParams();
  const services = useAsync(() => api.services(), 'order-services');

  const [form, setForm] = useState({ ...EMPTY, service: params.get('service') ?? '' });
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ref: string; message: string } | null>(null);
  const [marketing, setMarketing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const serviceOptions = services.data?.services ?? [];

  const set = (key: keyof typeof EMPTY) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setErrors((current) => ({ ...current, [key]: '' }));
  };

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0] ?? null;
    setFileError('');
    if (!chosen) {
      setFile(null);
      return;
    }
    const extension = chosen.name.toLowerCase().split('.').pop() || '';
    if (!['png', 'jpg', 'jpeg', 'pdf'].includes(extension)) {
      setFileError('Artwork must be a PNG, JPG, JPEG or PDF file.');
      setFile(null);
      return;
    }
    if (chosen.size > MAX_BYTES) {
      setFileError('Artwork must be 10 MB or smaller.');
      setFile(null);
      return;
    }
    setFile(chosen);
  };

  const waOrderLink = useMemo(
    () =>
      whatsappHref(
        settings.whatsapp_link,
        result
          ? `Hello ${settings.business_name}, I have submitted order ${result.ref} and would like to follow up.`
          : `Hello ${settings.business_name}, I would like to place an embroidery digitizing order.`,
      ),
    [settings.business_name, settings.whatsapp_link, result],
  );

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    const nextErrors: Record<string, string> = {};
    if (!form.customer_name.trim()) nextErrors.customer_name = 'Please enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customer_email.trim()))
      nextErrors.customer_email = 'Please enter a valid email address.';
    if (form.whatsapp.trim().length < 6) nextErrors.whatsapp = 'Please enter your WhatsApp number.';
    if (!form.service) nextErrors.service = 'Please select a service.';
    if (!form.design_size.trim()) nextErrors.design_size = 'Please enter the design size.';
    if (form.details.trim().length < 10) nextErrors.details = 'Please describe the design (at least 10 characters).';
    if (!form.preferred_format) nextErrors.preferred_format = 'Please choose a delivery format.';

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      setMessage('Please correct the highlighted fields.');
      return;
    }

    const body = new FormData();
    for (const [key, value] of Object.entries(form)) body.append(key, value);
    body.append('marketing_opt_in', marketing ? 'true' : 'false');
    if (file) body.append('artwork', file);

    setBusy(true);
    try {
      const response = await api.submitOrder(body);
      setResult({ ref: response.ref, message: response.message });
      setForm({ ...EMPTY });
      setFile(null);
      setMarketing(false);
      if (fileInput.current) fileInput.current.value = '';
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fields || {});
        setMessage(error.message);
      } else {
        setMessage('Your order could not be submitted. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <>
        <PageHero eyebrow="Order received" title="Thank you — your order is in review" lede={result.message}>
          <a className="btn btn--wa" href={waOrderLink} target="_blank" rel="noreferrer noopener">
            <Icon name="whatsapp" size={16} /> Follow up on WhatsApp
          </a>
        </PageHero>
        <section className="section">
          <div className="container" style={{ maxWidth: '46rem' }}>
            <div className="card card--flush">
              <div className="card" style={{ border: 'none', boxShadow: 'none' }}>
                <span className="eyebrow">Your order reference</span>
                <h2 className="mono" style={{ letterSpacing: '.06em', marginTop: '.4rem' }} data-testid="order-ref">
                  {result.ref}
                </h2>
                <p className="muted">
                  Keep this reference — quote it in any WhatsApp or email message about this order.
                </p>
                <div className="alert alert--info">
                  <Icon name="shield" size={16} />
                  <span>
                    Payment instructions are shared privately after your quotation is confirmed. Digitizing
                    begins once payment is verified.
                  </span>
                </div>
                <div className="row" style={{ marginTop: '1.2rem' }}>
                  <Link className="btn btn--navy" to="/portfolio">
                    Browse portfolio
                  </Link>
                  <button
                    type="button"
                    className="btn btn--outline"
                    onClick={() => {
                      void navigator.clipboard?.writeText(result.ref);
                    }}
                  >
                    Copy reference
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHero
        eyebrow="Place an order"
        title="Send your artwork for digitizing"
        lede="Share the design, size and placement. Every order is reviewed by hand before a quotation is sent."
      >
        <a className="btn btn--wa" href={waOrderLink} target="_blank" rel="noreferrer noopener">
          <Icon name="whatsapp" size={16} /> WhatsApp Contact
        </a>
      </PageHero>

      <section className="section">
        <div className="container grid grid-2" style={{ alignItems: 'start', gap: '2rem' }}>
          <form className="card" onSubmit={onSubmit} noValidate>
            <h2 style={{ marginBottom: '.3rem' }}>Order details</h2>
            <p className="muted small">Fields marked * are required.</p>

            {message ? (
              <div className="alert alert--error" role="alert">
                <Icon name="close" size={16} />
                <span>{message}</span>
              </div>
            ) : null}

            <div className="form-grid">
              <div className="field">
                <label className="label" htmlFor="customer_name">
                  Customer Full Name *
                </label>
                <input
                  id="customer_name"
                  className="input"
                  value={form.customer_name}
                  onChange={set('customer_name')}
                  autoComplete="name"
                  required
                />
                {errors.customer_name ? <span className="error-text">{errors.customer_name}</span> : null}
              </div>

              <div className="field">
                <label className="label" htmlFor="customer_email">
                  Email Address *
                </label>
                <input
                  id="customer_email"
                  className="input"
                  type="email"
                  value={form.customer_email}
                  onChange={set('customer_email')}
                  autoComplete="email"
                  required
                />
                {errors.customer_email ? <span className="error-text">{errors.customer_email}</span> : null}
              </div>

              <div className="field">
                <label className="label" htmlFor="whatsapp">
                  WhatsApp Number *
                </label>
                <input
                  id="whatsapp"
                  className="input"
                  value={form.whatsapp}
                  onChange={set('whatsapp')}
                  placeholder="+92 300 0000000"
                  autoComplete="tel"
                  required
                />
                {errors.whatsapp ? <span className="error-text">{errors.whatsapp}</span> : null}
              </div>

              <div className="field">
                <label className="label" htmlFor="country">
                  Country
                </label>
                <input id="country" className="input" value={form.country} onChange={set('country')} autoComplete="country-name" />
              </div>

              <div className="field">
                <label className="label" htmlFor="service">
                  Select Service *
                </label>
                <select id="service" className="select" value={form.service} onChange={set('service')} required>
                  <option value="">Choose a service…</option>
                  {serviceOptions.map((service) => (
                    <option key={service.id} value={service.title}>
                      {service.title}
                    </option>
                  ))}
                  <option value="Other / Not sure">Other / Not sure</option>
                </select>
                {errors.service ? <span className="error-text">{errors.service}</span> : null}
              </div>

              <div className="field">
                <label className="label" htmlFor="design_size">
                  Design Size *
                </label>
                <input
                  id="design_size"
                  className="input"
                  value={form.design_size}
                  onChange={set('design_size')}
                  placeholder="e.g. 3.5 in wide (89 mm)"
                  required
                />
                {errors.design_size ? <span className="error-text">{errors.design_size}</span> : null}
              </div>

              <div className="field">
                <label className="label" htmlFor="preferred_format">
                  Preferred File Format *
                </label>
                <select
                  id="preferred_format"
                  className="select"
                  value={form.preferred_format}
                  onChange={set('preferred_format')}
                  required
                >
                  <option value="">Choose a format…</option>
                  {settings.delivery_formats.map((format) => (
                    <option key={format} value={format}>
                      {format}
                    </option>
                  ))}
                </select>
                {errors.preferred_format ? <span className="error-text">{errors.preferred_format}</span> : null}
              </div>

              <div className="field">
                <label className="label" htmlFor="budget">
                  Budget (optional)
                </label>
                <input id="budget" className="input" value={form.budget} onChange={set('budget')} placeholder="e.g. 25 USD" />
              </div>

              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label className="label" htmlFor="details">
                  Design Details *
                </label>
                <textarea
                  id="details"
                  className="textarea"
                  value={form.details}
                  onChange={set('details')}
                  rows={5}
                  placeholder="Placement, garment or cap, number of colors, text, stitch requirements, deadline…"
                  required
                />
                {errors.details ? <span className="error-text">{errors.details}</span> : null}
              </div>

              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label className="label" htmlFor="artwork">
                  Upload Artwork
                </label>
                <input
                  id="artwork"
                  ref={fileInput}
                  className="input"
                  type="file"
                  accept={ACCEPTED}
                  onChange={onFile}
                />
                <span className="small muted">
                  PNG, JPG, JPEG or PDF · maximum 10 MB. {file ? `Selected: ${file.name}` : 'No file selected.'}
                </span>
                {fileError ? <span className="error-text">{fileError}</span> : null}
                {errors.artwork ? <span className="error-text">{errors.artwork}</span> : null}
              </div>
            </div>

            <label className="checkbox" style={{ marginTop: '1rem' }}>
              <input type="checkbox" checked={marketing} onChange={(event) => setMarketing(event.target.checked)} />
              <span>I agree to receive occasional studio updates by email. I can unsubscribe at any time.</span>
            </label>

            <button className="btn btn--gold btn--block" type="submit" disabled={busy} style={{ marginTop: '1.2rem' }}>
              {busy ? 'Submitting…' : 'Submit Order'}
            </button>
            <p className="small muted" style={{ marginBottom: 0, marginTop: '.7rem' }}>
              {settings.order_notice}
            </p>
          </form>

          <aside className="stack">
            <div className="card">
              <h3>What happens next</h3>
              <ol className="timeline" style={{ marginTop: '.8rem' }}>
                <li>
                  <strong>Review</strong>
                  <p className="small muted">We check the artwork and confirm the design requirements.</p>
                </li>
                <li>
                  <strong>Quotation</strong>
                  <p className="small muted">You receive a price by email or WhatsApp.</p>
                </li>
                <li>
                  <strong>Payment verified</strong>
                  <p className="small muted">Payment instructions are shared privately, then verified manually.</p>
                </li>
                <li>
                  <strong>Digitizing & delivery</strong>
                  <p className="small muted">Your files are prepared and delivered in your chosen format.</p>
                </li>
              </ol>
            </div>

            <div className="card">
              <h3>Delivery formats</h3>
              <div className="format-strip">
                {settings.delivery_formats.map((format) => (
                  <span className="format-chip" key={format}>
                    {format}
                  </span>
                ))}
              </div>
              <div className="divider" />
              <h3 style={{ fontSize: '1.05rem' }}>Payment methods</h3>
              <p className="small muted" style={{ marginBottom: 0 }}>
                {settings.payment_methods}. Account details are never published — they are shared privately
                after your quotation is confirmed.
              </p>
            </div>

            <div className="card">
              <h3>Prefer WhatsApp?</h3>
              <p className="small muted">Send your artwork directly and we will confirm the details.</p>
              <a className="btn btn--wa btn--block" href={waOrderLink} target="_blank" rel="noreferrer noopener">
                <Icon name="whatsapp" size={16} /> Chat on WhatsApp
              </a>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
