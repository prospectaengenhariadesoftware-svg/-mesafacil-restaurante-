import type { SVGProps } from 'react';

export type AppIconName =
  | 'home'
  | 'orders'
  | 'tables'
  | 'kitchen'
  | 'cash'
  | 'menu'
  | 'products'
  | 'addons'
  | 'reports'
  | 'customers'
  | 'team'
  | 'settings'
  | 'bell'
  | 'search'
  | 'eye'
  | 'edit'
  | 'trash'
  | 'printer'
  | 'more'
  | 'logout'
  | 'plus'
  | 'filter'
  | 'clock'
  | 'check'
  | 'x'
  | 'bag'
  | 'brand';

export type AppIconSize = 16 | 18 | 20 | 22 | 24;

type AppIconProps = Omit<SVGProps<SVGSVGElement>, 'name'> & {
  name: AppIconName;
  size?: AppIconSize;
  strokeWidth?: number;
};

const iconPaths: Record<AppIconName, React.ReactNode> = {
  home: <><path d="m3 10.5 9-7.5 9 7.5" /><path d="M5.5 9.5V21h13V9.5" /><path d="M9.5 21v-6h5v6" /></>,
  orders: <><path d="M8 5h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" /><path d="M9 3h6v4H9z" /><path d="M8 12h8" /><path d="M8 16h6" /></>,
  tables: <><path d="M4 10h16" /><path d="M6 10V7a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v3" /><path d="M7 10v10" /><path d="M17 10v10" /></>,
  kitchen: <><path d="M6 11h12" /><path d="M8 11v9" /><path d="M16 11v9" /><path d="M9 7c0-2 2-2 2-4" /><path d="M15 7c0-2 2-2 2-4" /></>,
  cash: <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18" /><path d="M7 14h4" /><path d="M16 14h1" /></>,
  menu: <><path d="M5 5h8a3 3 0 0 1 3 3v11H8a3 3 0 0 0-3 3z" /><path d="M16 8h3v11h-3" /></>,
  products: <><path d="m12 3 8 4-8 4-8-4z" /><path d="M4 7v10l8 4 8-4V7" /><path d="M12 11v10" /></>,
  addons: <><circle cx="12" cy="12" r="8" /><path d="M12 8v8" /><path d="M8 12h8" /></>,
  reports: <><path d="M4 19V9" /><path d="M10 19V5" /><path d="M16 19v-7" /><path d="M22 19H2" /></>,
  customers: <><circle cx="9" cy="8" r="4" /><path d="M2 21a7 7 0 0 1 14 0" /><path d="M17 11a4 4 0 0 1 4 4v6" /></>,
  team: <><circle cx="10" cy="8" r="4" /><path d="M3 21a7 7 0 0 1 14 0" /><path d="M19 8v6" /><path d="M16 11h6" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06-2 3.46-.08-.02a1.7 1.7 0 0 0-1.9.41 1.7 1.7 0 0 0-.46 1.84h-4a1.7 1.7 0 0 0-.46-1.84 1.7 1.7 0 0 0-1.9-.41l-.08.02-2-3.46.06-.06A1.7 1.7 0 0 0 6.6 15 1.7 1.7 0 0 0 5 13.7v-3.4A1.7 1.7 0 0 0 6.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06 2-3.46.08.02a1.7 1.7 0 0 0 1.9-.41 1.7 1.7 0 0 0 .46-1.84h4a1.7 1.7 0 0 0 .46 1.84 1.7 1.7 0 0 0 1.9.41l.08-.02 2 3.46-.06.06A1.7 1.7 0 0 0 17.4 9a1.7 1.7 0 0 0 1.6 1.3v3.4a1.7 1.7 0 0 0-1.6 1.3z" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" /><path d="M10 19a2 2 0 0 0 4 0" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
  trash: <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v5" /><path d="M14 11v5" /></>,
  printer: <><path d="M7 8V3h10v5" /><path d="M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" /><path d="M7 14h10v7H7z" /></>,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  logout: <><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M21 3v18" /></>,
  plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
  filter: <><path d="M3 5h18" /><path d="M6 12h12" /><path d="M10 19h4" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  check: <><path d="m5 12 4 4L19 6" /></>,
  x: <><path d="M6 6l12 12" /><path d="M18 6 6 18" /></>,
  bag: <><path d="M6 8h12l-1 13H7z" /><path d="M9 8a3 3 0 0 1 6 0" /></>,
  brand: <><path d="M8 3v18" /><path d="M4 3v6a4 4 0 0 0 8 0V3" /><path d="M16 3v18" /><path d="M16 9h4" /></>,
};

export function AppIcon({ name, size = 20, strokeWidth = 2, className = '', ...props }: Readonly<AppIconProps>) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {iconPaths[name]}
    </svg>
  );
}
