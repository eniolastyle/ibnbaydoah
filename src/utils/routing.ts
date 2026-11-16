export type AppTab =
  | 'home'
  | 'library'
  | 'audios'
  | 'poetry'
  | 'articles'
  | 'schedule'
  | 'contact'
  | 'admin';

export interface AppRoute {
  tab: AppTab;
  itemId?: string | null;
}

export const PROD_SITE_URL = 'https://ibnbaydoh.com.ng';

const VALID_TABS: readonly AppTab[] = [
  'home',
  'library',
  'audios',
  'poetry',
  'articles',
  'schedule',
  'contact',
  'admin',
];

const ITEM_SUPPORTED_TABS: readonly AppTab[] = ['library', 'audios', 'poetry', 'articles'];

function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function isValidTab(value: string): value is AppTab {
  return (VALID_TABS as readonly string[]).includes(value);
}

export function parseRoute(pathname: string): AppRoute {
  const clean = (pathname || '/').split('?')[0].split('#')[0];
  const segments = clean
    .split('/')
    .map(s => s.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    return { tab: 'home', itemId: null };
  }

  const first = safeDecode(segments[0]).toLowerCase();
  if (!isValidTab(first) || first === 'home') {
    return { tab: 'home', itemId: null };
  }

  if (segments[1] && ITEM_SUPPORTED_TABS.includes(first)) {
    return { tab: first, itemId: safeDecode(segments[1]) };
  }

  return { tab: first, itemId: null };
}

export function buildPath(route: AppRoute): string {
  if (!route.tab || route.tab === 'home') {
    return '/';
  }
  if (route.itemId && ITEM_SUPPORTED_TABS.includes(route.tab)) {
    return `/${route.tab}/${encodeURIComponent(route.itemId)}`;
  }
  return `/${route.tab}`;
}

export function getCanonicalUrl(route: AppRoute): string {
  return `${PROD_SITE_URL}${buildPath(route)}`;
}

export function getShareableUrl(route: AppRoute): string {
  const path = buildPath(route);
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }
  return `${PROD_SITE_URL}${path}`;
}

export async function copyShareUrl(url: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return true;
    }
  } catch {
    // Fall through to legacy textarea copy
  }

  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  }

  return false;
}
