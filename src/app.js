import { formatCitation } from './formatter.js';

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
const emptyCitation = 'Your citation will appear here as you enter the source details.';
let currentCitation;
let copyPending = false;

function setError(element, message, ...fields) {
  element.textContent = message;
  for (const field of fields) field.setAttribute('aria-invalid', String(Boolean(message)));
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
  setError(error, missingFamily ? 'Enter a last name.' : missingOrganization ? 'Enter an organization name.' : '');
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
  let message = '';
  let invalid;
  if (!noDate) {
    if (!Number.isSafeInteger(year) || year < 1) {
      message = 'Enter a valid publication year, or select No date.';
      invalid = dateFields[0];
    } else if ((month !== undefined || day !== undefined) && !(month >= 1 && month <= 12)) {
      message = 'Enter a month from 1 to 12.';
      invalid = dateFields[1];
    } else if (day !== undefined && !(day >= 1 && day <= new Date(Date.UTC(2000 + year % 400, month, 0)).getUTCDate())) {
      message = 'Enter a valid day for that month and year.';
      invalid = dateFields[2];
    }
  }
  byId('date-error').textContent = message;
  for (const field of dateFields) field.setAttribute('aria-invalid', String(field === invalid));
  return noDate ? undefined : { year, month, day };
}

function readAccessDate() {
  const field = byId('access-date');
  const date = field.valueAsDate;
  setError(byId('access-date-error'), field.validity.badInput ? 'Enter a complete, valid access date.' : '', field);
  if (date) return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

function render() {
  const style = checked('style');
  const inText = checked('mode') === 'intext';
  byId('intext-options').hidden = !inText;
  byId('locator-fields').hidden = !inText;
  byId('result-style').textContent = style === 'apa' ? 'APA 7' : 'MLA 9';
  byId('result-label').textContent = inText ? 'In-text' : 'Reference';
  byId('result-help').textContent = inText
    ? 'Use this short citation in the text of your work.'
    : 'Use this full entry in your reference list. In MLA, add it to your Works Cited list.';

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
  setError(byId('url-error'), validUrl ? '' : 'Enter a valid website URL, including https:// or http://.', byId('url'));
  setError(byId('title-error'), title ? '' : 'Enter a page title.', byId('title'));

  currentCitation = undefined;
  let placeholder = emptyCitation;
  const hasActiveInvalidField = Array.from(source.querySelectorAll('[aria-invalid="true"]'))
    .some((field) => !field.closest('[hidden]'));
  if (!hasActiveInvalidField) {
    try {
      const result = formatCitation(input);
      currentCitation = inText ? result.inText : result.reference;
    } catch {
      placeholder = 'Couldn’t create the citation. Check the source details.';
    }
  }
  citation.classList.toggle('empty', !currentCitation);
  copyButton.disabled = !currentCitation;
  if (currentCitation) citation.innerHTML = currentCitation.html;
  else citation.textContent = placeholder;
}

function reportCopy(message = '', failed = false) {
  copyStatus.classList.toggle('error-status', failed);
  copyStatus.textContent = message;
}

function update() {
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
    row.querySelector('legend').textContent = 'Author ' + number;
    row.querySelector('[data-remove-author]').textContent = 'Remove author ' + number;
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
document.querySelector('.result-sticky').addEventListener('input', update);
for (const button of exampleButtons) {
  button.addEventListener('click', () => selectExample(button.dataset.example));
}

const dialog = byId('install-dialog');
const autoOffer = byId('auto-offer');
const announcement = byId('auto-offer-announcement');
const offerKey = 'website-citation-install-offer-seen';
const offerCopy = {
  capture: ['Capture details from a page', 'Open the source page in desktop Chrome and use Website Citation to collect its citation details.'],
  library: ['Keep citations in your library', 'Use the Website Citation extension to save citations in its library for later.'],
};
let offerSeen = false;
let offerTrigger;
try {
  offerSeen = sessionStorage.getItem(offerKey) === '1';
} catch {}

function suppressOffer() {
  offerSeen = true;
  try {
    sessionStorage.setItem(offerKey, '1');
  } catch {}
}

function dismissAutoOffer() {
  if (autoOffer.contains(document.activeElement)) {
    const focusTarget = copyButton.disabled ? document.querySelector('[data-offer="library"]') : copyButton;
    focusTarget.focus({ preventScroll: true });
  }
  autoOffer.hidden = true;
  announcement.textContent = '';
  suppressOffer();
}

for (const id of ['close-auto-offer', 'continue-auto-offer']) {
  byId(id).addEventListener('click', dismissAutoOffer);
}

for (const button of document.querySelectorAll('[data-offer]')) {
  button.addEventListener('click', () => {
    offerTrigger = button;
    const [heading, body] = offerCopy[button.dataset.offer];
    byId('offer-title').textContent = heading;
    byId('offer-body').textContent = body;
    dialog.showModal();
    autoOffer.hidden = true;
    announcement.textContent = '';
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
  suppressOffer();
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
  const copied = currentCitation;
  copyPending = true;
  try {
    await writeCitation(copied);
    reportCopy(copied === currentCitation ? 'Citation copied.' : 'Previous citation copied.');
    if (!offerSeen && !dialog.open) {
      suppressOffer();
      autoOffer.hidden = false;
      announcement.textContent = 'Cite as you browse. ' + autoOffer.querySelector('p').textContent;
    }
  } catch {
    reportCopy('Couldn’t copy the citation. Please try again.', true);
  } finally {
    copyPending = false;
  }
});

selectExample('person');
