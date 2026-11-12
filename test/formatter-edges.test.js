import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCitation } from '../src/formatter.js';

// Sources: https://apastyle.apa.org/style-grammar-guidelines/references/examples/webpage-website-references
// https://apastyle.apa.org/style-grammar-guidelines/references/missing-information
// https://apastyle.apa.org/style-grammar-guidelines/citations/quotations/no-page-numbers
// https://style.mla.org/source-with-no-author/
// https://style.mla.org/citing-mla-handbook-ninth-edition/
// https://style.mla.org/in-text-citations-overview/
// https://style.mla.org/same-author-different-coauthors/
// https://style.mla.org/cite-multiple-web-pages/

const person = (given, family) => ({ type: 'person', given, family });
const smith = person('Alice', 'Smith');
const jones = person('Ben', 'Jones');
const brown = person('Cara', 'Brown');
const base = { style: 'apa', title: 'A useful page', website: 'Example Site', url: 'https://example.org/page', authors: [smith], issued: { year: 2020 } };
const format = (change) => formatCitation({ ...base, ...change });

test('APA webpage with neither author nor date leads with italic title', () => {
  const r = format({ authors: [], issued: undefined });
  assert.equal(r.reference.text, 'A useful page. (n.d.). Example Site. https://example.org/page');
  assert.equal(r.inText.text, '(A Useful Page, n.d.)');
  assert.match(r.reference.html, /<(?:i|em)>A useful page<\/(?:i|em)>/);
  assert.match(r.inText.html, /<(?:i|em)>A Useful Page<\/(?:i|em)>/);
});

test('MLA webpage with neither author nor date leads with quoted title', () => {
  const r = format({ style: 'mla', title: 'A Useful Page', authors: [], issued: undefined });
  assert.equal(r.reference.text, '“A Useful Page.” Example Site, example.org/page.');
  assert.equal(r.inText.text, '(“A Useful Page”)');
});

test('APA two authors keep both names in reference and citation', () => {
  const r = format({ authors: [smith, jones] });
  assert.equal(r.reference.text, 'Smith, A., & Jones, B. (2020). A useful page. Example Site. https://example.org/page');
  assert.equal(r.inText.text, '(Smith & Jones, 2020)');
  assert.equal(format({ authors: [smith, jones], form: 'narrative' }).inText.text, 'Smith and Jones (2020)');
});

test('APA three authors list all in reference and use et al. in citation', () => {
  const r = format({ authors: [smith, jones, brown] });
  assert.equal(r.reference.text, 'Smith, A., Jones, B., & Brown, C. (2020). A useful page. Example Site. https://example.org/page');
  assert.equal(r.inText.text, '(Smith et al., 2020)');
});

test('APA 21 authors retain first 19 and last, omitting twentieth', () => {
  const families = ['Adams','Baker','Clark','Davis','Evans','Foster','Green','Hill','Irwin','Jones','King','Lewis','Mason','Nelson','Owens','Parker','Quinn','Reed','Stone','Turner','Vega'];
  const authors = families.map(family => person('Alex', family));
  const r = format({ authors });
  assert.equal(r.reference.text.replace('…', '. . .'), `${families.slice(0, 19).map(name => `${name}, A.`).join(', ')}, . . . Vega, A. (2020). A useful page. Example Site. https://example.org/page`);
  assert.doesNotMatch(r.reference.text, /Turner|&/);
  assert.equal(r.inText.text, '(Adams et al., 2020)');
});

test('MLA two authors list names and cite both', () => {
  const r = format({ style: 'mla', title: 'A Useful Page', authors: [smith, jones] });
  assert.equal(r.reference.text, 'Smith, Alice, and Ben Jones. “A Useful Page.” Example Site, 2020, example.org/page.');
  assert.equal(r.inText.text, '(Smith and Jones)');
});

test('MLA three authors list lead author and et al.', () => {
  const r = format({ style: 'mla', title: 'A Useful Page', authors: [smith, jones, brown] });
  assert.equal(r.reference.text, 'Smith, Alice, et al. “A Useful Page.” Example Site, 2020, example.org/page.');
  assert.equal(r.inText.text, '(Smith et al.)');
  assert.equal(format({ style: 'mla', title: 'A Useful Page', authors: [smith, jones, brown], form: 'narrative' }).inText.text, 'Smith and others');
});

test('organization name is a literal in APA and MLA', () => {
  const authors = [{ type: 'organization', name: 'United Nations' }];
  assert.equal(format({ authors }).reference.text, 'United Nations. (2020). A useful page. Example Site. https://example.org/page');
  assert.equal(format({ authors }).inText.text, '(United Nations, 2020)');
  assert.equal(format({ style: 'mla', title: 'A Useful Page', authors }).inText.text, '(United Nations)');
});

test('MLA author equal to publisher moves organization to publisher and keys citation to title', () => {
  const r = format({ style: 'mla', title: 'A Useful Page', authors: [{ type: 'organization', name: 'United Nations' }], publisher: 'United Nations' });
  assert.equal(r.reference.text, '“A Useful Page.” Example Site, United Nations, 2020, example.org/page.');
  assert.equal(r.inText.text, '(“A Useful Page”)');
});

test('APA year and year-month precision remain distinct', () => {
  assert.equal(format({ issued: { year: 2020 } }).reference.text, 'Smith, A. (2020). A useful page. Example Site. https://example.org/page');
  assert.equal(format({ issued: { year: 2020, month: 7 } }).reference.text, 'Smith, A. (2020, July). A useful page. Example Site. https://example.org/page');
});

test('MLA year and year-month precision remain distinct', () => {
  assert.equal(format({ style: 'mla', title: 'A Useful Page', issued: { year: 2020 } }).reference.text, 'Smith, Alice. “A Useful Page.” Example Site, 2020, example.org/page.');
  assert.equal(format({ style: 'mla', title: 'A Useful Page', issued: { year: 2020, month: 7 } }).reference.text, 'Smith, Alice. “A Useful Page.” Example Site, July 2020, example.org/page.');
});

test('APA user-supplied access date formats as retrieval date', () => {
  const r = format({ issued: undefined, accessed: { year: 2024, month: 4, day: 23 } });
  assert.equal(r.reference.text, 'Smith, A. (n.d.). A useful page. Example Site. Retrieved April 23, 2024, from https://example.org/page');
});

test('MLA user-supplied access date follows URL', () => {
  const r = format({ style: 'mla', title: 'A Useful Page', issued: undefined, accessed: { year: 2024, month: 4, day: 23 } });
  assert.equal(r.reference.text, 'Smith, Alice. “A Useful Page.” Example Site, example.org/page. Accessed 23 Apr. 2024.');
});

test('APA locator distinguishes page and paragraph', () => {
  assert.equal(format({ locator: { type: 'page', value: '5' } }).inText.text, '(Smith, 2020, p. 5)');
  assert.equal(format({ locator: { type: 'paragraph', value: '3' } }).inText.text, '(Smith, 2020, para. 3)');
  assert.equal(format({ form: 'narrative', locator: { type: 'page', value: '5' } }).inText.text, 'Smith (2020, p. 5)');
});

test('MLA page locator has no invented page prefix', () => {
  assert.equal(format({ style: 'mla', locator: { type: 'page', value: '5' } }).inText.text, '(Smith 5)');
  assert.equal(format({ style: 'mla', form: 'narrative', locator: { type: 'page', value: '5' } }).inText.text, 'Smith (5)');
});

test('paragraph and section locators retain their value without invented page prefix', () => {
  for (const style of ['apa', 'mla']) for (const type of ['paragraph', 'section']) {
    const text = format({ style, locator: { type, value: '3' } }).inText.text;
    assert.match(text, /3/);
    assert.doesNotMatch(text, /(?:^|\s)p\.\s*3/);
  }
});

test('real calendar dates accepted including leap day', () => {
  assert.doesNotThrow(() => format({ issued: { year: 2024, month: 2, day: 29 }, accessed: { year: 2024, month: 2, day: 29 } }));
});

test('invalid calendar and partial dates are rejected at boundary', () => {
  for (const issued of [{ year: 2023, month: 2, day: 29 }, { year: 2024, month: 4, day: 31 }, { year: 2024, month: 13 }, { year: 2024, day: 3 }, { year: 0 }]) assert.throws(() => format({ issued }));
  assert.throws(() => format({ accessed: { year: 2024, month: 2, day: 30 } }));
});

test('missing required metadata and unsafe URLs are rejected', () => {
  for (const change of [{ title: '' }, { url: '' }, { url: 'javascript:alert(1)' }, { url: 'data:text/html,hi' }, { url: 'not a URL' }, { style: 'chicago' }, { authors: [{ type: 'person', given: 'Alice', family: '' }] }, { authors: [{ type: 'organization', name: '' }] }]) assert.throws(() => format(change));
});

test('untrusted metadata is text, never executable markup', () => {
  const title = '<img src=x onerror=alert(1)> & a page';
  const r = format({ title });
  assert.ok(r.reference.text.includes(title));
  assert.doesNotMatch(r.reference.html, /<img\b/i);
  assert.match(r.reference.html, /&lt;img/);
});

test('successive calls isolate author, title, date, style and narrative state', () => {
  const first = format({ form: 'narrative' });
  assert.equal(first.reference.text, 'Smith, A. (2020). A useful page. Example Site. https://example.org/page');
  assert.equal(first.inText.text, 'Smith (2020)');
  const second = format({ style: 'mla', title: 'A New Page', authors: [jones], issued: { year: 2023 }, form: 'parenthetical' });
  assert.equal(second.reference.text, 'Jones, Ben. “A New Page.” Example Site, 2023, example.org/page.');
  assert.equal(second.inText.text, '(Jones)');
  const third = format({ title: 'Another page', authors: [brown], issued: { year: 2021 }, form: 'parenthetical' });
  assert.equal(third.reference.text, 'Brown, C. (2021). Another page. Example Site. https://example.org/page');
  assert.equal(third.inText.text, '(Brown, 2021)');
});
