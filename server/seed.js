/**
 * Portfolio placeholder artwork.
 *
 * The studio's real designs are uploaded by the administrator. Until then the
 * gallery shows clearly-labelled placeholders so no fake client work is claimed.
 */
import fs from 'node:fs';
import path from 'node:path';

const SEED_ITEMS = [
  {
    title: 'Corporate Wordmark',
    category: 'Business Logos',
    description: 'Clean corporate wordmark digitized for uniform left chest.',
    alt_text: 'Placeholder preview: corporate wordmark logo digitized for a left chest placement.',
    featured: 1,
  },
  {
    title: 'Brand Identity Mark',
    category: 'Brand Logos',
    description: 'Multi-colour brand mark with balanced stitch density.',
    alt_text: 'Placeholder preview: multi-colour brand logo digitized for embroidery.',
    featured: 1,
  },
  {
    title: 'Structured Cap Front',
    category: 'Cap Designs',
    description: 'Six-panel cap front with curved-panel compensation.',
    alt_text: 'Placeholder preview: cap front design digitized with curved panel compensation.',
    featured: 1,
  },
  {
    title: 'Raised 3D Lettering',
    category: '3D Puff',
    description: 'Foam-capped 3D puff lettering with even height.',
    alt_text: 'Placeholder preview: raised 3D puff lettering design.',
  },
  {
    title: 'Club Badge Patch',
    category: 'Patches & Badges',
    description: 'Sew-on badge with a trim-safe merrowed border.',
    alt_text: 'Placeholder preview: embroidered club badge patch design.',
  },
  {
    title: 'Minimal Chest Logo',
    category: 'Small Chest Logos',
    description: 'Compact chest logo optimised for legibility at 2.5 inches.',
    alt_text: 'Placeholder preview: minimal small chest logo digitized for embroidery.',
  },
  {
    title: 'Detailed Floral Crest',
    category: 'Detailed Embroidery Designs',
    description: 'Detailed crest with blended shading and fine outlines.',
    alt_text: 'Placeholder preview: detailed floral crest embroidery design.',
  },
];

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function placeholderSvg(item) {
  const label = escapeXml(item.category.toUpperCase());
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800" role="img" aria-label="${escapeXml(
    item.alt_text,
  )}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1C3A6B"/>
      <stop offset="1" stop-color="#0C1B36"/>
    </linearGradient>
  </defs>
  <rect width="800" height="800" fill="url(#bg)"/>
  <g fill="none" stroke="#C19A45" stroke-width="3" opacity="0.9">
    <rect x="48" y="48" width="704" height="704" rx="26"/>
    <rect x="70" y="70" width="660" height="660" rx="18" opacity="0.45" stroke-dasharray="9 13"/>
  </g>
  <g stroke="#C19A45" stroke-width="2" opacity="0.35" fill="none">
    <circle cx="400" cy="360" r="150"/>
    <circle cx="400" cy="360" r="188"/>
  </g>
  <text x="400" y="410" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="150" fill="#C19A45">ME</text>
  <text x="400" y="560" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="22" letter-spacing="5" fill="#E7DCC4">${label}</text>
  <text x="400" y="610" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="18" letter-spacing="3" fill="#9FB0CC">PLACEHOLDER — ADD YOUR DESIGN</text>
</svg>
`;
}

export function seedPortfolio(db, dirs) {
  const count = db.prepare('SELECT COUNT(*) AS c FROM portfolio_items').get().c;
  if (count > 0) return;

  const insert = db.prepare(
    `INSERT INTO portfolio_items (title, category, description, alt_text, image_file, image_mime, is_placeholder, featured, sort_order)
     VALUES (@title, @category, @description, @alt_text, @image_file, 'image/svg+xml', 1, @featured, @sort_order)`,
  );

  const seed = db.transaction((items) => {
    items.forEach((item, index) => {
      const file = `seed-${index + 1}.svg`;
      fs.mkdirSync(dirs.portfolio, { recursive: true });
      fs.writeFileSync(path.join(dirs.portfolio, file), placeholderSvg(item));
      insert.run({ ...item, featured: item.featured ? 1 : 0, image_file: file, sort_order: index });
    });
  });

  seed(SEED_ITEMS);
}
