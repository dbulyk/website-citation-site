export function localizedUrl(base, locale) {
  const url = new URL(base);
  url.search = locale === 'en' ? '' : new URLSearchParams({ lang: locale }).toString();
  return url.href;
}

export function setCanonicalLanguage(locale) {
  const canonical = document.head.querySelector('link[rel="canonical"]');
  canonical.href = localizedUrl(canonical.href, locale);
}
