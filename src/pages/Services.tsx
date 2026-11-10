import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PageHero } from '../components/SiteLayout';
import { api } from '../lib/api';
import { useAsync, useDocumentTitle } from '../lib/hooks';
import { useSettings } from '../lib/SettingsContext';

export default function Services() {
  useDocumentTitle('Our Services — Meher EMB');
  const { settings } = useSettings();
  const services = useAsync(() => api.services(), 'services-page');

  return (
    <>
      <PageHero
        eyebrow="Our services"
        title="Embroidery digitizing for every placement"
        lede="From a small chest logo to a full 3D puff cap front — each service is priced after the design is reviewed, never guessed."
      >
        <Link className="btn btn--gold" to="/order">
          Place an Order
        </Link>
        <a
          className="btn btn--onDark"
          href={settings.whatsapp_link}
          target="_blank"
          rel="noreferrer noopener"
        >
          <Icon name="whatsapp" size={16} /> Ask a question
        </a>
      </PageHero>

      <section className="section">
        <div className="container">
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
                  <p>{service.description || service.summary}</p>
                  {service.features.length ? (
                    <ul className="card__features">
                      {service.features.map((feature) => (
                        <li key={feature}>
                          <Icon name="check" size={15} /> {feature}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="card__foot">
                    <Link className="btn btn--outline btn--sm" to={`/order?service=${encodeURIComponent(service.title)}`}>
                      Order Now
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section--tight section--paper">
        <div className="container">
          <div className="cta-band">
            <div>
              <h2>Not sure which service you need?</h2>
              <p>Send the artwork and tell us the garment — we will recommend the right digitizing approach.</p>
            </div>
            <div className="row">
              <Link className="btn btn--gold" to="/order">
                Start an Order
              </Link>
              <Link className="btn btn--onDark" to="/contact">
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
