import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Brand } from './Logo';
import { Icon } from './Icon';
import { useSettings, whatsappHref } from '../lib/SettingsContext';

const NAV = [
  { to: '/', label: 'Home' },
  { to: '/services', label: 'Services' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

export function SiteLayout() {
  const { settings } = useSettings();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const waLink = whatsappHref(settings.whatsapp_link, `Hello ${settings.business_name}, I would like to order embroidery digitizing.`);

  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <Brand />

          <nav className="site-nav" aria-label="Main navigation">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'}>
                {item.label}
              </NavLink>
            ))}
            <NavLink to="/order">Place an Order</NavLink>
          </nav>

          <div className="header-actions">
            <Link className="btn btn--gold btn--sm" to="/order">
              Order Now
            </Link>
            <button
              type="button"
              className="nav-toggle"
              aria-expanded={open}
              aria-controls="mobile-navigation"
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen((value) => !value)}
            >
              <Icon name={open ? 'close' : 'menu'} size={20} />
            </button>
          </div>
        </div>

        {open ? (
          <div className="container">
            <nav id="mobile-navigation" className="mobile-nav" aria-label="Mobile navigation">
              {NAV.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.to === '/'}>
                  {item.label}
                </NavLink>
              ))}
              <NavLink to="/order">Place an Order</NavLink>
              <Link className="btn btn--gold" to="/order">
                Start Your Order
              </Link>
              <a className="btn btn--wa" href={waLink} target="_blank" rel="noreferrer noopener">
                <Icon name="whatsapp" size={16} /> WhatsApp Us
              </a>
            </nav>
          </div>
        ) : null}
      </header>

      <main id="main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <Brand light />
              <p className="footer-about" style={{ marginTop: '1rem' }}>
                {settings.tagline} for logos, caps, 3D puff, patches and custom designs — delivered to
                customers worldwide with clean, production-ready files.
              </p>
              <div className="format-strip" style={{ marginTop: '0.9rem' }}>
                {settings.delivery_formats.map((format) => (
                  <span key={format} className="format-chip format-chip--light">
                    {format}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4>Explore</h4>
              <ul>
                <li>
                  <Link to="/services">Our Services</Link>
                </li>
                <li>
                  <Link to="/portfolio">Portfolio</Link>
                </li>
                <li>
                  <Link to="/order">Place an Order</Link>
                </li>
                <li>
                  <Link to="/about">About Us</Link>
                </li>
                <li>
                  <Link to="/contact">Contact Us</Link>
                </li>
              </ul>
            </div>

            <div>
              <h4>Contact</h4>
              <ul>
                <li>
                  <a href={settings.whatsapp_link} target="_blank" rel="noreferrer noopener">
                    WhatsApp Orders
                  </a>
                </li>
                <li>
                  <a href={`mailto:${settings.email}`}>{settings.email}</a>
                </li>
                <li>
                  <a href={settings.website} target="_blank" rel="noreferrer noopener">
                    meheraliembstudio.blogspot.com
                  </a>
                </li>
                <li>
                  <a href={settings.pinterest} target="_blank" rel="noreferrer noopener">
                    Pinterest Profile
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4>Ordering</h4>
              <ul>
                <li className="small" style={{ color: 'rgba(255,255,255,.66)' }}>
                  Send artwork → receive a quotation → payment instructions are shared privately →
                  digitizing starts after payment verification.
                </li>
                <li style={{ marginTop: '0.6rem' }}>
                  <Link className="btn btn--gold btn--sm" to="/order">
                    Start an Order
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <span>
              © {new Date().getFullYear()} {settings.business_name}. All rights reserved.
            </span>
            <span>
              <Link to="/admin/login">Studio Login</Link>
            </span>
          </div>
        </div>
      </footer>

      <a className="wa-float" href={waLink} target="_blank" rel="noreferrer noopener">
        <Icon name="whatsapp" size={18} /> WhatsApp
      </a>
    </>
  );
}

export function PageHero({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  children?: ReactNode;
}) {
  return (
    <section className="hero">
      <div className="container hero__inner" style={{ gridTemplateColumns: '1fr' }}>
        <div className="reveal">
          <span className="hero__eyebrow">{eyebrow}</span>
          <h1 style={{ marginTop: '1rem' }}>{title}</h1>
          {lede ? <p className="hero__lede">{lede}</p> : null}
          {children ? <div className="hero__actions">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
