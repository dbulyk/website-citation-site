import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCitation } from '../src/formatter.js';

test('APA webpage omits repeated organization and does not append publisher as another source', () => {
  const input = {
    style: 'apa',
    title: 'The top 10 causes of death',
    url: 'https://www.who.int/news-room/fact-sheets/detail/the-top-10-causes-of-death',
    website: 'World Health Organization',
    authors: [{ type: 'organization', name: 'World Health Organization' }],
    issued: { year: 2018, month: 5, day: 24 },
  };
  const expected = 'World Health Organization. (2018, May 24). The top 10 causes of death. https://www.who.int/news-room/fact-sheets/detail/the-top-10-causes-of-death';
  for (const publisher of ['World Health Organization', 'Different Publisher']) {
    const result = formatCitation({ ...input, publisher });
    assert.equal(result.reference.text, expected);
    assert.equal(result.inText.text, '(World Health Organization, 2018)');
  }
});

test('MLA organization author, site and publisher are not repeated', () => {
  const result = formatCitation({
    style: 'mla', title: 'A Useful Page', website: 'United Nations',
    url: 'https://example.org/page',
    authors: [{ type: 'organization', name: 'United Nations' }],
    publisher: 'United Nations', issued: { year: 2020 },
  });
  assert.equal(result.reference.text, '“A Useful Page.” United Nations, 2020, example.org/page.');
  assert.equal(result.inText.text, '(“A Useful Page”)');
});
