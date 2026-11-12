import { mountLanguageDialog } from '../src/language-dialog.js';

const dictionaries = import.meta.glob('./locales/*.json', { eager: true, import: 'default' });

export function readContext() {
  const search = new URLSearchParams(location.search);
  const params = new URLSearchParams();
  const id = search.get('extensionId');
  const extensionId = id?.length === 32 && /^[a-p]{32}$/.test(id) ? id : null;
  if (extensionId) params.set('extensionId', extensionId);

  const pinned = search.get('pinned');
  if (pinned === 'true' || pinned === 'false') params.set('pinned', pinned);

  const lang = search.get('lang');
  const locale = Object.hasOwn(dictionaries, `./locales/${lang}.json`) ? lang : 'en';
  if (locale === lang) params.set('lang', locale);

  return { extensionId, locale, params, copy: dictionaries[`./locales/${locale}.json`] };
}

export function localize({ locale, copy }, titleKey) {
  const root = document.documentElement;
  const lang = locale.replace('_', '-');
  if (root.lang !== lang) root.lang = lang;
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  if (root.dir !== dir) root.dir = dir;
  if (document.title !== copy[titleKey]) document.title = copy[titleKey];
  for (const element of document.querySelectorAll('[data-copy]')) {
    const value = copy[element.dataset.copy];
    if (element.textContent !== value) element.textContent = value;
  }
}

export function bindLanguageSelector(initialContext, titleKey, onLocaleChange) {
  function render(context) {
    localize(context, titleKey);
    onLocaleChange(context);
  }

  render(initialContext);
  mountLanguageDialog(document.querySelector('#language'), {
    locale: initialContext.locale,
    getLabel: (locale) => dictionaries[`./locales/${locale}.json`].language_label,
    onChange: () => render(readContext()),
  });
}

export function carryContext(link, params) {
  const url = new URL(link.href);
  url.search = params.toString();
  if (link.href !== url.href) link.href = url.href;
}
