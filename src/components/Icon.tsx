import type { CSSProperties } from 'react';

const PATHS: Record<string, string> = {
  logo: 'M4 17V7l4 6 4-6v10M14 17V7h3a3 3 0 0 1 0 6h-3',
  cap: 'M3 16a9 9 0 0 1 18 0M3 16h18M8 16V8a4 4 0 0 1 8 0v8',
  puff: 'M4 16c0-4 3.6-7 8-7s8 3 8 7M4 16h16M9 9V6M15 9V6',
  patch: 'M5 5h14v14H5zM9 12l2 2 4-4',
  shirt: 'M8 4l4 2 4-2 3 3-2 3v8H7v-8L5 7z',
  custom: 'M12 3l2.6 5.3 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.5 9.1l5.9-.8z',
  spool: 'M7 4h10v16H7zM7 9h10M7 15h10',
  check: 'M4 12l5 5L20 6',
  arrow: 'M4 12h15M13 6l6 6-6 6',
  whatsapp:
    'M20 12a8 8 0 0 1-11.7 7.1L4 20l1-4.2A8 8 0 1 1 20 12zM8.5 9.5c0 3 2 5 5 5 .8 0 1.2-.6 1-1.2l-.4-1-1.4.5-.9-.9.5-1.4-1-.4c-.6-.2-1.2.2-1.2 1',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.4 3.8 5.5 3.8 9s-1.3 6.6-3.8 9c-2.5-2.4-3.8-5.5-3.8-9S9.5 5.4 12 3z',
  pinterest: 'M12 3a9 9 0 0 0-3.3 17.4M12 3a9 9 0 0 1 0 18M9.5 20l1.8-7M9 11c0-2 1.5-3.5 3.4-3.5 2 0 3.4 1.3 3.4 3.3 0 2.4-1.4 4.2-3.2 4.2-1 0-1.8-.8-1.6-1.8',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
  upload: 'M12 16V4M7 9l5-5 5 5M4 16v3h16v-3',
  download: 'M12 4v12M7 11l5 5 5-5M4 20h16',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6L6 18',
  plus: 'M12 5v14M5 12h14',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  file: 'M6 3h8l4 4v14H6zM14 3v4h4',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
  users: 'M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-2a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v2M17 4a4 4 0 0 1 0 8M22 21v-2a5 5 0 0 0-3-4.6',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19 12c0-.6-.1-1.1-.2-1.6l2-1.4-2-3.4-2.2 1a7 7 0 0 0-2.7-1.6L13.5 2h-3l-.4 2.4c-1 .3-1.9.9-2.7 1.6l-2.2-1-2 3.4 2 1.4a7.6 7.6 0 0 0 0 3.2l-2 1.4 2 3.4 2.2-1c.8.7 1.7 1.3 2.7 1.6l.4 2.4h3l.4-2.4c1-.3 1.9-.9 2.7-1.6l2.2 1 2-3.4-2-1.4c.1-.5.2-1 .2-1.6z',
  box: 'M4 8l8-4 8 4-8 4zM4 8v8l8 4 8-4V8M12 12v8',
  star: 'M12 4l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 9.7l5.4-.8z',
  logout: 'M15 4h4v16h-4M11 8l-4 4 4 4M7 12h9',
  edit: 'M4 20h4l10-10-4-4L4 16zM14 6l4 4',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
};

export type IconName = keyof typeof PATHS | string;

export function Icon({
  name,
  size = 18,
  className,
  style,
  filled = false,
}: {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
  filled?: boolean;
}) {
  const path = PATHS[name] || PATHS.spool;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <path d={path} />
    </svg>
  );
}
