import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PageHero } from '../components/SiteLayout';
import { useDocumentTitle } from '../lib/hooks';
import { useSettings, whatsappHref } from '../lib/SettingsContext';

export default function Contact() {
  useDocumentTitle('Contact Us — Meher EMB');
  const { settings } = useSettings();
  const waLink = whatsappHref(
    settings.whatsapp_link,
    `Hello ${settings.business_name}, I have a question about embroidery digitizing.`,
  );

  return (
    <>
      <PageHero
        eyebrow="Contact us"
        title="Talk to the studio"
        lede="Questions about pricing, formats or turnaround are welcome. WhatsApp is usually the fastest way to reach us."
      >
        <a className="btn btn--wa" href={waLink} target="_blank" rel="noreferrer noopener">
          <Icon name="whatsapp" size={16} /> WhatsApp Contact
        </a>
        <Link className="btn btn--gold" to="/order">
          Order Inquiry
        </Link>
      </PageHero>

      <section className="section">
        <div className="container">
          <div className="grid grid-2">
            <a className="card card--hover" href={waLink} target="_blank" rel="noreferrer noopener">
              <span className="card__icon">
                <Icon name="whatsapp" size={22} />
              </span>
              <h3>WhatsApp</h3>
              <p>Send artwork or ask for a quotation. Fastest response for order inquiries.</p>
              <span className="link-arrow" style={{ marginTop: '0.9rem', display: 'inline-flex' }}>
                Open WhatsApp <Icon name="arrow" size={15} />
              </span>
            </a>

            <a className="card card--hover" href={`mailto:${settings.email}`}>
              <span className="card__icon">
                <Icon name="mail" size={22} />
              </span>
              <h3>Email</h3>
              <p>Best for detailed briefs, purchase orders and larger projects.</p>
              <span className="mono" style={{ display: 'block', marginTop: '0.9rem', color: 'var(--navy)' }}>
                {settings.email}
              </span>
            </a>

            <a className="card card--hover" href={settings.website} target="_blank" rel="noreferrer noopener">
              <span className="card__icon">
                <Icon name="globe" size={22} />
              </span>
              <h3>Website</h3>
              <p>Studio blog and business information.</p>
              <span className="small muted" style={{ display: 'block', marginTop: '0.9rem' }}>
                {settings.website.replace(/^https?:\/\//, '')}
              </span>
            </a>

            <a className="card card--hover" href={settings.pinterest} target="_blank" rel="noreferrer noopener">
              <span className="card__icon">
                <Icon name="pinterest" size={22} />
              </span>
              <h3>Pinterest</h3>
              <p>Embroidery design inspiration and studio updates.</p>
              <span className="small muted" style={{ display: 'block', marginTop: '0.9rem' }}>
                pinterest.com/meheraliembstudio
              </span>
            </a>
          </div>

          <div className="admin-panel" style={{ marginTop: '1.6rem' }}>
            <div className="spread">
              <div>
                <h3 style={{ marginBottom: '.3rem' }}>Placing an order?</h3>
                <p className="muted" style={{ margin: 0 }}>
                  Use the order form to send artwork and specifications. You will receive a unique order
                  reference and a quotation.
                </p>
              </div>
              <Link className="btn btn--gold" to="/order">
                Go to Order Form
              </Link>
            </div>
            <div className="divider" />
            <p className="small muted" style={{ margin: 0 }}>
              Accepted payment methods: {settings.payment_methods}. Payment details are never published
              publicly — they are shared privately after your quotation is confirmed.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
