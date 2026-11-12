import en from './site-copy/en.json';
import ru from './site-copy/ru.json';

const dictionaries = { en, ru };

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
