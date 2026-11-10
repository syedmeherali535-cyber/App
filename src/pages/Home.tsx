import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PortfolioCard } from '../components/PortfolioCard';
import { api } from '../lib/api';
import { useAsync, useDocumentTitle } from '../lib/hooks';
import { useSettings, whatsappHref } from '../lib/SettingsContext';

const WHY_US = [
  {
    icon: 'spool',
    title: 'Digitizer-led, not auto-converted',
    text: 'Every design is prepared by hand for the fabric and placement it is meant for — clean underlay, balanced density and tidy trims.',
  },
  {
    icon: 'cap',
    title: 'Cap and 3D puff expertise',
    text: 'Cap fronts, curved panels and foam puff designs are adjusted for distortion and needle clearance before they reach your machine.',
  },
  {
    icon: 'shield',
    title: 'Production-ready files',
    text: 'You receive the exact format your machine needs — DST, PES, JEF, VP3 or EMB — checked before delivery.',
  },
  {
    icon: 'globe',
    title: 'Worldwide service',
    text: 'Orders are handled remotely for customers around the world, with WhatsApp updates at every stage.',
  },
];

const STEPS = [
  { title: 'Send your artwork', text: 'Upload a PNG, JPG or PDF with the size and placement you need.' },
  { title: 'Receive a quotation', text: 'We review the design and send a clear price before any work begins.' },
  { title: 'Payment is verified', text: 'Payment instructions are shared privately. Digitizing starts once payment is confirmed.' },
  { title: 'Receive your files', text: 'Your digitized files are delivered in the format you requested, with revisions if needed.' },
];

export default function Home() {
  useDocumentTitle('Meher EMB — Meher Ali EMB Studio');
  const { settings } = useSettings();
  const services = useAsync(() => api.services(), 'home-services');
  const portfolio = useAsync(() => api.portfolio(), 'home-portfolio');
  const testimonials = useAsync(() => api.testimonials(), 'home-testimonials');

  const waLink = whatsappHref(
    settings.whatsapp_link,
    `Hello ${settings.business_name}, I would like a quotation for embroidery digitizing.`,
  );

  const featured = (portfolio.data?.items ?? []).filter((item) => item.featured).slice(0, 6);
  const preview = (featured.length ? featured : portfolio.data?.items ?? []).slice(0, 6);
  const realTestimonials = testimonials.data?.testimonials ?? [];

  return (
    <>
      <section className="hero">
        <div className="container hero__inner">
          <div className="reveal">
            <span className="hero__eyebrow">Worldwide embroidery digitizing</span>
            <h1 style={{ marginTop: '1rem' }}>
              Professional <em>Embroidery Digitizing</em> Services
            </h1>
            <p className="hero__lede">
              {settings.business_name} turns your logo or artwork into clean, machine-ready embroidery
              files for caps, shirts, patches and 3D puff designs — prepared with care and delivered
              anywhere in the world.
            </p>
            <div className="hero__actions">
              <Link className="btn btn--gold" to="/order">
                Order Now <Icon name="arrow" size={16} />
              </Link>
              <a className="btn btn--wa" href={waLink} target="_blank" rel="noreferrer noopener">
                <Icon name="whatsapp" size={16} /> WhatsApp Contact
              </a>
            </div>
            <div className="hero__facts">
              <div className="hero__fact">
                <strong>12–24h</strong>
                <span>Typical turnaround</span>
              </div>
              <div className="hero__fact">
                <strong>5 formats</strong>
                <span>DST · PES · JEF · VP3 · EMB</span>
              </div>
              <div className="hero__fact">
                <strong>Worldwide</strong>
                <span>Remote delivery</span>
              </div>
            </div>
          </div>

          <aside className="hero__panel reveal" style={{ animationDelay: '120ms' }}>
            <h3>How ordering works</h3>
            <ul>
              <li>
                <Icon name="upload" size={17} /> Send artwork, size and placement
              </li>
              <li>
                <Icon name="mail" size={17} /> Receive a quotation by email or WhatsApp
              </li>
              <li>
                <Icon name="shield" size={17} /> Payment is verified privately
              </li>
              <li>
                <Icon name="download" size={17} /> Digitizing starts, files delivered
              </li>
            </ul>
            <Link className="btn btn--gold btn--block" to="/order" style={{ marginTop: '1rem' }}>
              Start Your Order
            </Link>
            <p className="small" style={{ color: 'rgba(255,255,255,.6)', marginTop: '.7rem', marginBottom: 0 }}>
              {settings.turnaround}
            </p>
          </aside>
        </div>
      </section>

      <section className="section--tight section--paper">
        <div className="container spread">
          <div>
            <span className="eyebrow">Delivery formats</span>
            <p className="muted" style={{ margin: 0 }}>
              Files delivered in the format your machine accepts.
            </p>
          </div>
          <div className="format-strip">
            {settings.delivery_formats.map((format) => (
              <span key={format} className="format-chip">
                {format}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Featured services</span>
            <h2>Digitizing built for real production</h2>
            <p className="lede">
              Choose the service that matches your garment or product. Each order includes a manual
              review before a price is quoted.
            </p>
          </div>

          {services.loading ? (
            <div className="loading-block">
              <span className="spinner" /> Loading services…
            </div>
          ) : services.error ? (
            <div className="alert alert--error">
              <Icon name="close" size={16} />
              <span>{services.error}</span>
            </div>
          ) : (
            <div className="grid grid-3">
              {(services.data?.services ?? []).map((service) => (
                <article className="card card--hover card--service" key={service.id}>
                  <span className="card__icon">
                    <Icon name={service.icon} size={22} />
                  </span>
                  <h3>{service.title}</h3>
                  <p>{service.summary}</p>
                  <div className="card__foot">
                    <Link className="link-arrow" to={`/order?service=${encodeURIComponent(service.title)}`}>
                      Order Now <Icon name="arrow" size={15} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div style={{ marginTop: '1.6rem' }}>
            <Link className="btn btn--outline" to="/services">
              View all services
            </Link>
          </div>
        </div>
      </section>

      <section className="section section--paper">
        <div className="container">
          <div className="spread" style={{ marginBottom: '1.6rem' }}>
            <div className="section-head" style={{ marginBottom: 0 }}>
              <span className="eyebrow">Portfolio preview</span>
              <h2>Selected digitizing work</h2>
            </div>
            <Link className="link-arrow" to="/portfolio">
              Browse portfolio <Icon name="arrow" size={15} />
            </Link>
          </div>

          {portfolio.loading ? (
            <div className="loading-block">
              <span className="spinner" /> Loading portfolio…
            </div>
          ) : (
            <div className="portfolio-grid">
              {preview.map((item) => (
                <PortfolioCard key={item.id} item={item} />
              ))}
            </div>
          )}
          {!portfolio.loading && preview.length === 0 ? (
            <div className="empty">Portfolio items will appear here once they are added in the studio dashboard.</div>
          ) : null}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head section-head--center">
            <span className="eyebrow">Why choose us</span>
            <h2>A studio standard on every file</h2>
            <p className="lede" style={{ marginInline: 'auto' }}>
              Digitizing is only useful when it runs cleanly on your machine and looks right on the
              garment. That is the standard every order is held to.
            </p>
          </div>
          <div className="grid grid-4">
            {WHY_US.map((item) => (
              <article className="card card--hover" key={item.title}>
                <span className="card__icon">
                  <Icon name={item.icon} size={22} />
                </span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--paper">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Our process</span>
            <h2>From artwork to stitch file</h2>
          </div>
          <div className="steps">
            {STEPS.map((step) => (
              <article className="step" key={step.title}>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {realTestimonials.length > 0 ? (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow">Customer testimonials</span>
              <h2>What customers say</h2>
            </div>
            <div className="grid grid-3">
              {realTestimonials.map((item) => (
                <blockquote className="quote-card" key={item.id}>
                  <p>“{item.quote}”</p>
                  <footer>
                    {item.name}
                    {item.location ? ` · ${item.location}` : ''}
                    {item.service ? ` · ${item.service}` : ''}
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="section--tight">
        <div className="container">
          <div className="cta-band">
            <div>
              <h2>Ready to digitize your design?</h2>
              <p>
                Send your artwork and requirements. We review every design before quoting, and
                payment instructions are shared privately.
              </p>
            </div>
            <div className="row">
              <Link className="btn btn--gold" to="/order">
                Place an Order
              </Link>
              <a className="btn btn--onDark" href={waLink} target="_blank" rel="noreferrer noopener">
                <Icon name="whatsapp" size={16} /> WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
