import languages from './languages.json';
import translations from './language-dialog-copy.json';
import './language-dialog.css';

function element(tag, className, text = '') {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  return node;
}

function decoration(className, text) {
  const node = element('span', className, text);
  node.setAttribute('aria-hidden', 'true');
  return node;
}

function flag(country) {
  return String.fromCodePoint(...Array.from(country, (letter) => 0x1f1e6 + letter.charCodeAt(0) - 65));
}

export function mountLanguageDialog(trigger, { locale, locales = Object.keys(languages), getLabel, onChange }) {
  const triggerFlag = decoration('language-flag');
  const triggerName = element('bdi', 'language-trigger-name');
  triggerName.dir = 'auto';
  trigger.append(triggerFlag, triggerName, decoration('language-chevron'));

  const dialog = element('dialog', 'language-dialog');
  const head = element('div', 'language-dialog-head');
  const title = element('h2', 'language-dialog-title');
  title.id = 'language-dialog-title';
  dialog.setAttribute('aria-labelledby', title.id);
  const close = element('button', 'language-close', '×');
  close.type = 'button';
  close.addEventListener('click', () => dialog.close());
  head.append(title, close);
  dialog.append(head);

  const grid = element('div', 'language-grid');
  const search = locales.length > 2 ? element('input', 'language-search') : null;
  const empty = search ? element('p', 'language-empty') : null;
  if (search) {
    search.type = 'text';
    search.setAttribute('role', 'searchbox');
    search.inputMode = 'search';
    search.autocomplete = 'off';
    search.setAttribute('autofocus', '');
    search.addEventListener('input', filterOptions);
    empty.setAttribute('role', 'status');
    dialog.append(search, grid, empty);
  } else {
    close.setAttribute('autofocus', '');
    dialog.append(grid);
  }

  const options = locales.map((code) => {
    const { autonym, english_name: englishName, flag_country: country } = languages[code];
    const tag = code.replace('_', '-');
    const button = element('button', 'language-option');
    button.type = 'button';
    const name = element('bdi', 'language-option-name', autonym);
    name.lang = tag;
    name.dir = 'auto';

    const caption = element('span', 'language-option-caption');
    const detail = element('bdi', 'language-option-detail', `${englishName} · ${tag}`);
    detail.lang = 'en';
    detail.dir = 'ltr';
    caption.append(name, detail);
    const check = decoration('language-check', '✓');
    button.append(decoration('language-flag', flag(country)), caption, check);
    button.addEventListener('click', () => {
      if (code !== locale) {
        locale = code;
        const url = new URL(location.href);
        url.searchParams.set('lang', locale);
        history.replaceState(history.state, '', url);
        onChange(locale);
        renderLocale();
      }
      dialog.close();
    });
    grid.append(button);
    return { code, button, check, terms: [autonym, englishName, code, tag].map((term) => term.toLowerCase()) };
  });

  function filterOptions() {
    const query = search.value.trim().toLowerCase();
    let hasResults = false;
    for (const { button, terms } of options) {
      button.hidden = !terms.some((term) => term.includes(query));
      hasResults ||= !button.hidden;
    }
    empty.textContent = hasResults ? '' : translations[locale].no_languages_found;
  }

  function renderLocale() {
    const copy = translations[locale];
    const { autonym, flag_country: country } = languages[locale];
    dialog.lang = triggerName.lang = locale.replace('_', '-');
    dialog.dir = locale === 'ar' ? 'rtl' : 'ltr';
    triggerFlag.textContent = flag(country);
    triggerName.textContent = autonym;
    trigger.setAttribute('aria-label', `${getLabel(locale)}: ${autonym}`);
    title.textContent = copy.choose_language;
    close.setAttribute('aria-label', copy.close);
    if (search) {
      search.setAttribute('aria-label', copy.search_languages);
      search.placeholder = copy.search_languages;
    }
    for (const { code, button, check } of options) {
      button.setAttribute('aria-pressed', String(code === locale));
      check.hidden = code !== locale;
    }
  }

  renderLocale();
  document.body.append(dialog);
  trigger.addEventListener('click', () => {
    if (search) {
      search.value = '';
      filterOptions();
    }
    if (document.activeElement !== trigger) trigger.focus({ preventScroll: true });
    dialog.showModal();
    dialog.scrollTop = 0;
  });
}
