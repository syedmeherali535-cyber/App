import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PageHero } from '../components/SiteLayout';
import { useDocumentTitle } from '../lib/hooks';
import { useSettings } from '../lib/SettingsContext';

const STANDARDS = [
  'Manual review of every design before a quotation is sent.',
  'Digitizing prepared for the specific fabric, placement and machine format.',
  'Clean underlay, balanced density and tidy trims for professional output.',
  'Clear communication on WhatsApp and email until the files are delivered.',
];

export default function About() {
  useDocumentTitle('About Us — Meher EMB');
  const { settings } = useSettings();

  return (
    <>
      <PageHero
        eyebrow="About us"
        title={settings.business_name}
        lede="An embroidery digitizing studio serving brands, embroiderers and apparel businesses worldwide."
      >
        <Link className="btn btn--gold" to="/order">
          Place an Order
        </Link>
        <a className="btn btn--onDark" href={settings.whatsapp_link} target="_blank" rel="noreferrer noopener">
          <Icon name="whatsapp" size={16} /> WhatsApp
        </a>
      </PageHero>

      <section className="section">
        <div className="container grid grid-2" style={{ alignItems: 'start', gap: '2.5rem' }}>
          <div>
            <span className="eyebrow">The studio</span>
            <h2>Embroidery digitizing with a production mindset</h2>
            <p className="lede">
              {settings.business_name} converts logos, artwork and custom designs into embroidery files
              that run cleanly on commercial and home machines. Work is handled remotely for customers
              around the world, with each order reviewed individually before digitizing begins.
            </p>
            <p className="muted">
              The studio focuses on the placements that cause the most trouble when digitizing is rushed:
              curved cap fronts, small chest logos with fine text, foam 3D puff, and patch borders that
              need to hold their shape. Designs are prepared with the final fabric and stitch direction
              in mind, not simply auto-converted.
            </p>
            <p className="muted">
              Orders are quoted manually. You will always know the price before digitizing starts, and
              payment instructions are shared privately once a quotation is accepted.
            </p>
            <div className="row" style={{ marginTop: '1rem' }}>
              <Link className="btn btn--navy" to="/order">
                Start an Order
              </Link>
              <Link className="btn btn--outline" to="/portfolio">
                View Portfolio
              </Link>
            </div>
          </div>

          <div className="card">
            <h3>Professional standards</h3>
            <ul className="card__features" style={{ marginBottom: 0 }}>
              {STANDARDS.map((item) => (
                <li key={item}>
                  <Icon name="check" size={15} /> {item}
                </li>
              ))}
            </ul>
            <div className="divider" />
            <h3 style={{ fontSize: '1.1rem' }}>Formats delivered</h3>
            <div className="format-strip">
              {settings.delivery_formats.map((format) => (
                <span className="format-chip" key={format}>
                  {format}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section section--paper">
        <div className="container">
          <div className="section-head section-head--center">
            <span className="eyebrow">Worldwide service</span>
            <h2>Remote ordering, personal handling</h2>
            <p className="lede" style={{ marginInline: 'auto' }}>
              Orders are accepted through the website or WhatsApp. Artwork is reviewed, quoted, then
              digitized after payment is verified — with the finished files delivered digitally.
            </p>
          </div>
          <div className="grid grid-3">
            <article className="card">
              <span className="card__icon">
                <Icon name="globe" size={22} />
              </span>
              <h3>Any location</h3>
              <p>Files are delivered digitally, so customers can order from anywhere in the world.</p>
            </article>
            <article className="card">
              <span className="card__icon">
                <Icon name="clock" size={22} />
              </span>
              <h3>Clear turnaround</h3>
              <p>{settings.turnaround}</p>
            </article>
            <article className="card">
              <span className="card__icon">
                <Icon name="shield" size={22} />
              </span>
              <h3>Private by default</h3>
              <p>
                Your artwork and order details stay private. Files are only accessible to the studio
                administrator.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="section--tight">
        <div className="container">
          <div className="cta-band">
            <div>
              <h2>Let’s digitize your next design</h2>
              <p>Send your artwork and requirements — we will reply with a quotation.</p>
            </div>
            <Link className="btn btn--gold" to="/order">
              Place an Order
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
