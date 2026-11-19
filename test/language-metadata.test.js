import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

async function readJson(url) {
  return JSON.parse(await readFile(url, 'utf8'));
}

const languages = await readJson(new URL('../src/languages.json', import.meta.url));
const translations = await readJson(new URL('../src/language-dialog-copy.json', import.meta.url));

function assertText(value, description) {
  assert.ok(typeof value === 'string' && value.trim(), description);
}

for (const [directory, label] of [['../src/site-copy/', 'language.label'], ['../welcome/locales/', 'language_label']]) {
  test(`every locale in ${directory} has a language dialog label and metadata`, async () => {
    const folder = new URL(directory, import.meta.url);
    const files = await readdir(folder, { withFileTypes: true });
    for (const file of files.filter((entry) => entry.isFile() && entry.name.endsWith('.json'))) {
      const locale = file.name.slice(0, -'.json'.length);
      const copy = await readJson(new URL(file.name, folder));
      assertText(copy[label], `${file.name} must define ${label}`);
      const language = languages[locale];
      assert.ok(language, `${locale} must have an entry in languages.json`);
      assertText(language.autonym, `${locale} must define an autonym`);
      assertText(language.english_name, `${locale} must define an English name`);
      assert.match(language.flag_country ?? '', /^[A-Z]{2}$/, `${locale} must define a flag country`);
      for (const key of ['choose_language', 'close', 'search_languages', 'no_languages_found']) {
        assertText(translations[locale]?.[key], `${locale} must define ${key}`);
      }
    }
  });
}
