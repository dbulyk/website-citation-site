let canonical;

export function localizedUrl(base, locale) {
  const url = new URL(base);
  url.search = locale === 'en' ? '' : new URLSearchParams({ lang: locale }).toString();
  url.hash = '';
  return url.href;
}

export function setCanonicalLanguage(route, locale) {
  const href = localizedUrl(new URL(route, __CANONICAL_ORIGIN__), locale);
  if (canonical) {
    canonical.href = href;
    return;
  }
  canonical = document.createElement('link');
  canonical.rel = 'canonical';
  canonical.href = href;
  document.head.append(canonical);
}
