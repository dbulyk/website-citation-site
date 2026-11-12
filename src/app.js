import { formatCitation } from './formatter.js';
import { applySiteCopy, setSiteCopy } from './site-language.js';

const byId = (id) => document.getElementById(id);
const source = byId('source-details');
const citation = byId('citation');
const copyButton = byId('copy');
const copyStatus = byId('copy-status');
const firstAuthor = byId('first-author');
const extraAuthors = byId('extra-authors');
const addAuthor = byId('add-author');
const removeFirstAuthor = byId('remove-first-author');
const exampleButtons = document.querySelectorAll('[data-example]');
const dateFields = ['year', 'month', 'day'].map(byId);
const resultPanel = document.querySelector('.result-sticky');
const extraDetails = document.querySelector('.source-extra');
const checked = (name) => document.querySelector('input[name="' + name + '"]:checked').value;
const value = (id) => byId(id).value.trim();
const examples = {
  person: {
    url: 'https://example.com/windowsill-herbs',
    title: 'Growing herbs on a windowsill',
    website: 'The Little Garden',
    first: 'Maya',
    last: 'Bennett',
    date: [2024, 4, 18],
    authorType: 'person',
  },
  organization: {
    url: 'https://example.org/neighborhood-trees',
    title: 'A guide to neighborhood trees',
    website: 'Green Street Project',
    organization: 'Green Street Project',
    date: [2023, 6, 12],
    authorType: 'organization',
  },
  none: {
    url: 'https://example.net/history-of-paper',
    title: 'A short history of paper',
    website: 'Paper Corner',
    authorType: 'none',
  },
};
let currentCitation;
let copyPending = false;
let copyOfferInterrupted = false;

function setError(element, key, ...fields) {
  setSiteCopy(element, key);
  for (const field of fields) field.setAttribute('aria-invalid', String(Boolean(key)));
}

function authorFields(row) {
  return {
    given: row.querySelector('[data-given]'),
    family: row.querySelector('[data-family]'),
    organization: row.querySelector('[data-organization]'),
  };
}

function readAuthor(row, type, error) {
  const { given, family, organization } = authorFields(row);
  const person = type === 'person';
  const namedOrganization = type === 'organization';
  row.querySelector('[data-person-fields]').hidden = !person;
  row.querySelector('[data-organization-field]').hidden = !namedOrganization;
  const missingFamily = person && !family.value.trim();
  const missingOrganization = namedOrganization && !organization.value.trim();
  setError(error, missingFamily ? 'validation.last' : missingOrganization ? 'validation.organization' : '');
  family.setAttribute('aria-invalid', String(missingFamily));
  organization.setAttribute('aria-invalid', String(missingOrganization));
  if (person) return { type, given: given.value, family: family.value };
  if (namedOrganization) return { type, name: organization.value };
}

function readAuthors() {
  const first = readAuthor(firstAuthor, checked('authorType'), byId('author-error'));
  byId('more-authors').hidden = !first;
  extraAuthors.hidden = !extraAuthors.childElementCount;
  removeFirstAuthor.hidden = !first || extraAuthors.hidden;
  if (!first) return [];
  return [first, ...Array.from(extraAuthors.children, (row) => readAuthor(
    row, row.querySelector('[data-author-type]').value, row.querySelector('[data-author-error]'),
  ))];
}

function readPublicationDate() {
  const noDate = byId('no-date').checked;
  const [year, month, day] = dateFields.map(({ value }) => {
    const part = value.trim();
    return part ? (/^\d+$/.test(part) ? Number(part) : NaN) : undefined;
  });
  byId('publication-date').hidden = noDate;
  let errorKey = '';
  let invalid;
  if (!noDate) {
    if (!Number.isSafeInteger(year) || year < 1) {
      errorKey = 'validation.year';
      invalid = dateFields[0];
    } else if ((month !== undefined || day !== undefined) && !(month >= 1 && month <= 12)) {
      errorKey = 'validation.month';
      invalid = dateFields[1];
    } else if (day !== undefined && !(day >= 1 && day <= new Date(Date.UTC(2000 + year % 400, month, 0)).getUTCDate())) {
      errorKey = 'validation.day';
      invalid = dateFields[2];
    }
  }
  setSiteCopy(byId('date-error'), errorKey);
  for (const field of dateFields) field.setAttribute('aria-invalid', String(field === invalid));
  return noDate ? undefined : { year, month, day };
}

function readAccessDate() {
  const field = byId('access-date');
  const date = field.valueAsDate;
  setError(byId('access-date-error'), field.validity.badInput ? 'validation.access' : '', field);
  if (date) return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

function render() {
  const style = checked('style');
  const inText = checked('mode') === 'intext';
  byId('intext-options').hidden = !inText;
  byId('locator-fields').hidden = !inText;
  setSiteCopy(byId('result-style'), style === 'apa' ? 'style.apa' : 'style.mla');
  setSiteCopy(byId('result-label'), inText ? 'result.intext' : 'result.reference');
  setSiteCopy(byId('result-help'), inText ? 'result.help_intext' : 'result.help_reference');

  const url = value('url');
  const title = value('title');
  const locator = inText && value('locator') ? { type: value('locator-type'), value: value('locator') } : undefined;
  const input = {
    style, url, title, locator,
    website: value('website'),
    authors: readAuthors(),
    issued: readPublicationDate(),
    accessed: readAccessDate(),
    publisher: value('publisher'),
    form: inText ? checked('form') : undefined,
  };
  const validUrl = /^https?:\/\//i.test(url) && URL.canParse(url);
  setError(byId('url-error'), validUrl ? '' : 'validation.url', byId('url'));
  setError(byId('title-error'), title ? '' : 'validation.title', byId('title'));

  currentCitation = undefined;
  let placeholderKey = 'result.empty';
  const hasActiveInvalidField = Array.from(source.querySelectorAll('[aria-invalid="true"]'))
    .some((field) => !field.closest('[hidden]'));
  if (!hasActiveInvalidField) {
    try {
      const result = formatCitation(input);
      currentCitation = inText ? result.inText : result.reference;
    } catch {
      placeholderKey = 'error.format';
    }
  }
  citation.classList.toggle('empty', !currentCitation);
  copyButton.disabled = !currentCitation;
  if (currentCitation) {
    delete citation.dataset.siteCopy;
    citation.innerHTML = currentCitation.html;
  } else {
    setSiteCopy(citation, placeholderKey);
  }
}

function reportCopy(key = '', failed = false) {
  copyStatus.classList.toggle('error-status', failed);
  setSiteCopy(copyStatus, key);
}

function update() {
  dismissCopyOffer();
  reportCopy();
  render();
}

function markExample(name) {
  for (const button of exampleButtons) button.setAttribute('aria-pressed', String(button.dataset.example === name));
}

function setFirstType(type) {
  source.querySelector('input[name="authorType"][value="' + type + '"]').checked = true;
}

function selectExample(name) {
  const example = examples[name];
  for (const id of ['url', 'title', 'website', 'first', 'last', 'organization', 'publisher', 'access-date', 'locator']) {
    byId(id).value = example[id] ?? '';
  }
  byId('locator-type').value = 'page';
  dateFields.forEach((field, index) => { field.value = example.date?.[index] ?? ''; });
  byId('no-date').checked = !example.date;
  setFirstType(example.authorType);
  extraAuthors.replaceChildren();
  markExample(name);
  update();
}

function renumberAuthors() {
  Array.from(extraAuthors.children).forEach((row, index) => {
    const number = index + 2;
    const error = row.querySelector('[data-author-error]');
    error.id = 'author-error-' + number;
    const { family, organization } = authorFields(row);
    family.setAttribute('aria-describedby', error.id);
    organization.setAttribute('aria-describedby', error.id);
    setSiteCopy(row.querySelector('legend'), 'author.numbered', number);
    setSiteCopy(row.querySelector('[data-remove-author]'), 'author.remove_numbered', number);
  });
}

function changeAuthorRows(focusTarget) {
  renumberAuthors();
  markExample();
  update();
  focusTarget.focus();
}

addAuthor.addEventListener('click', () => {
  const row = byId('author-template').content.firstElementChild.cloneNode(true);
  extraAuthors.append(row);
  applySiteCopy(row, document.documentElement.lang);
  changeAuthorRows(authorFields(row).given);
});

extraAuthors.addEventListener('click', ({ target }) => {
  const button = target.closest('[data-remove-author]');
  if (!button) return;
  const row = button.closest('.author-row');
  const next = row.nextElementSibling ?? row.previousElementSibling;
  row.remove();
  changeAuthorRows(next?.querySelector('[data-remove-author]') ?? addAuthor);
});

removeFirstAuthor.addEventListener('click', () => {
  const row = extraAuthors.firstElementChild;
  const { given, family, organization } = authorFields(row);
  const type = row.querySelector('[data-author-type]').value;
  setFirstType(type);
  byId('first').value = given.value;
  byId('last').value = family.value;
  byId('organization').value = organization.value;
  row.remove();
  changeAuthorRows(byId(type === 'person' ? 'first' : 'organization'));
});

source.addEventListener('input', () => {
  markExample();
  update();
});
source.addEventListener('submit', (event) => event.preventDefault());
resultPanel.addEventListener('input', update);
for (const button of exampleButtons) {
  button.addEventListener('click', () => selectExample(button.dataset.example));
}

const dialog = byId('install-dialog');
const installLink = byId('auto-offer');
const closeCopyOffer = byId('close-auto-offer');
const copyRow = byId('copy-row');
const offerCopy = {
  capture: ['dialog.capture_title', 'dialog.capture_body'],
  library: ['dialog.library_title', 'dialog.library_body'],
};
let offerTrigger;

function setCopyOffer(visible) {
  copyRow.classList.toggle('has-offer', visible);
  setSiteCopy(copyButton, visible ? 'result.copy_again' : 'result.copy');
  installLink.hidden = closeCopyOffer.hidden = !visible;
}

function dismissCopyOffer() {
  if (copyPending) copyOfferInterrupted = true;
  if (installLink.hidden) return;
  if (document.activeElement === installLink || document.activeElement === closeCopyOffer) {
    copyButton.focus({ preventScroll: true });
  }
  setCopyOffer(false);
}

closeCopyOffer.addEventListener('click', () => {
  copyButton.focus({ preventScroll: true });
  dismissCopyOffer();
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || dialog.open) return;
  dismissCopyOffer();
});

for (const button of document.querySelectorAll('[data-offer]')) {
  button.addEventListener('click', () => {
    offerTrigger = button;
    const [heading, body] = offerCopy[button.dataset.offer];
    setSiteCopy(byId('offer-title'), heading);
    setSiteCopy(byId('offer-body'), body);
    dismissCopyOffer();
    dialog.showModal();
  });
}

const firstDialogControl = dialog.querySelector('[autofocus]');
const lastDialogControl = dialog.querySelector('.offer-continue');
dialog.addEventListener('keydown', (event) => {
  if (event.key !== 'Tab') return;
  const boundary = event.shiftKey ? firstDialogControl : lastDialogControl;
  if (document.activeElement === boundary) {
    event.preventDefault();
    const opposite = event.shiftKey ? lastDialogControl : firstDialogControl;
    opposite.focus();
  }
});
dialog.addEventListener('close', () => {
  offerTrigger.focus({ preventScroll: true });
});

async function writeCitation({ html, text }) {
  const clipboard = navigator.clipboard;
  if (clipboard?.write && typeof ClipboardItem === 'function') {
    try {
      await clipboard.write([new ClipboardItem({
        'text/plain': new Blob([text], { type: 'text/plain' }),
        'text/html': new Blob([html], { type: 'text/html' }),
      })]);
      return;
    } catch {}
  }
  await clipboard.writeText(text);
}

copyButton.addEventListener('click', async () => {
  if (copyPending || !currentCitation) return;
  dismissCopyOffer();
  reportCopy();
  const copied = currentCitation;
  copyOfferInterrupted = false;
  copyPending = true;
  try {
    await writeCitation(copied);
    reportCopy(copied === currentCitation ? 'copy.success' : 'copy.previous');
    if (!dialog.open && !copyOfferInterrupted && copied === currentCitation) {
      setCopyOffer(true);
    }
  } catch {
    reportCopy('copy.error', true);
  } finally {
    copyPending = false;
  }
});

const languageSelect = byId('site-language');
const walkthrough = document.querySelector('.walkthrough-frame');

function localizeWalkthrough() {
  const demoDocument = walkthrough.contentDocument;
  if (!demoDocument?.documentElement) return;
  const language = document.documentElement.lang;
  demoDocument.documentElement.lang = language;
  applySiteCopy(demoDocument, language);
}

function setLanguage(language) {
  document.documentElement.lang = language;
  applySiteCopy(document, language);
  localizeWalkthrough();
}

languageSelect.value = new URL(location.href).searchParams.get('lang') === 'ru' ? 'ru' : 'en';
walkthrough.addEventListener('load', localizeWalkthrough);
setLanguage(languageSelect.value);
languageSelect.addEventListener('change', () => {
  const language = languageSelect.value === 'ru' ? 'ru' : 'en';
  const url = new URL(location.href);
  url.searchParams.set('lang', language);
  history.replaceState(history.state, '', url);
  setLanguage(language);
});

selectExample('person');

extraDetails.querySelector('summary').addEventListener('click', (event) => {
  const pointer = event.detail > 0;
  const alreadyAnimating = extraDetails.classList.contains('pointer-toggle');
  extraDetails.classList.toggle('pointer-toggle', pointer);
  if (pointer && !alreadyAnimating) {
    // Apply the transition to the current size before the native click toggles open.
    getComputedStyle(extraDetails, '::details-content').blockSize;
  }
});
extraDetails.addEventListener('transitionend', (event) => {
  if (event.pseudoElement === '::details-content' && ['block-size', 'height'].includes(event.propertyName)) {
    extraDetails.classList.remove('pointer-toggle');
  }
});

if ('ResizeObserver' in window) {
  new ResizeObserver(([entry]) => {
    const height = entry.borderBoxSize?.[0]?.blockSize ?? resultPanel.getBoundingClientRect().height;
    resultPanel.style.setProperty('--result-height', `${height}px`);
  }).observe(resultPanel, { box: 'border-box' });

  const demoObserver = new ResizeObserver(([entry]) => {
    walkthrough.style.height = `${Math.ceil(entry.target.getBoundingClientRect().height)}px`;
  });

  function observeWalkthrough() {
    demoObserver.disconnect();
    // The browser exposes contentDocument only for the same-origin frame.
    const demo = walkthrough.contentDocument?.querySelector('.cw-demo');
    if (demo) demoObserver.observe(demo, { box: 'border-box' });
    else walkthrough.style.removeProperty('height');
  }

  walkthrough.addEventListener('load', observeWalkthrough);
  observeWalkthrough();
}
