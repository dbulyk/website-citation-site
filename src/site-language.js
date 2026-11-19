const files = import.meta.glob('./site-copy/*.json', { eager: true, import: 'default' });
const dictionaries = Object.fromEntries(Object.entries(files)
  .map(([path, copy]) => [path.slice('./site-copy/'.length, -'.json'.length), copy]));

export const siteLocales = Object.keys(dictionaries);

export function getSiteLanguageLabel(language) {
  return dictionaries[language]['language.label'];
}

function writeText(element, dictionary) {
  const { siteCopy, siteNumber } = element.dataset;
  const template = siteCopy ? dictionary[siteCopy] : '';
  const text = siteNumber === undefined ? template : template.replace('{number}', siteNumber);
  if (element.textContent !== text) element.textContent = text;
}

export function setSiteCopy(element, key, number) {
  if (key) element.dataset.siteCopy = key;
  else delete element.dataset.siteCopy;
  if (number !== undefined) element.dataset.siteNumber = number;
  else delete element.dataset.siteNumber;
  writeText(element, dictionaries[element.ownerDocument.documentElement.lang]);
}

export function applySiteCopy(root, language) {
  const dictionary = dictionaries[language];
  for (const element of root.querySelectorAll('[data-site-copy]')) {
    writeText(element, dictionary);
  }
  for (const attribute of ['aria-label', 'placeholder', 'title']) {
    const binding = `data-site-${attribute}`;
    for (const element of root.querySelectorAll(`[${binding}]`)) {
      const text = dictionary[element.getAttribute(binding)];
      if (element.getAttribute(attribute) !== text) element.setAttribute(attribute, text);
    }
  }
}
