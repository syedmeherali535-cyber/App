import { Link } from 'react-router-dom';
import { useSettings } from '../lib/SettingsContext';

/**
 * ME monogram mark. Gold on navy, with a stitch line under the initials.
 */
export function BrandMark({ size = 44 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Meher EMB monogram"
      className="brand__mark"
    >
      <rect width="64" height="64" rx="14" fill="#142B52" />
      <rect x="5.5" y="5.5" width="53" height="53" rx="10" fill="none" stroke="#C19A45" strokeWidth="1.6" opacity="0.9" />
      <text
        x="32"
        y="41"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="24"
        fontWeight="600"
        fill="#C19A45"
      >
        ME
      </text>
      <path
        d="M18 49h28"
        stroke="#C19A45"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeDasharray="3 3"
        opacity="0.85"
      />
    </svg>
  );
}

export function Brand({
  light = false,
  to = '/',
  sub,
}: {
  light?: boolean;
  to?: string;
  sub?: string;
}) {
  const { settings } = useSettings();
  return (
    <Link to={to} className={`brand${light ? ' brand--light' : ''}`} aria-label={`${settings.app_name} home`}>
      <BrandMark />
      <span className="brand__text">
        <span className="brand__name">{settings.app_name}</span>
        <span className="brand__sub">{sub ?? settings.business_name}</span>
      </span>
    </Link>
  );
}
