import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCitation } from '../src/formatter.js';

const mantel = {
  style: 'apa',
  title: 'How to be a caregiver for someone with multiple sclerosis',
  url: 'https://www.aarp.org/caregiving/health/info-2025/multiple-sclerosis-care-plan/',
  website: 'AARP',
  authors: [{ type: 'person', given: 'Barbara', family: 'Mantel' }],
  issued: { year: 2025, month: 4, day: 24 },
};
const who = {
  style: 'apa',
  title: 'The top 10 causes of death',
  url: 'https://www.who.int/news-room/fact-sheets/detail/the-top-10-causes-of-death',
  website: 'World Health Organization',
  authors: [{ type: 'organization', name: 'World Health Organization' }],
  issued: { year: 2018, month: 5, day: 24 },
};
const deresiewicz = {
  style: 'mla',
  title: 'The Death of the Artist—and the Birth of the Creative Entrepreneur',
  url: 'https://theatlantic.com/magazine/archive/2015/01/the-death-of-the-artist-and-the-birth-of-the-creative-entrepreneur/383497/',
  website: 'The Atlantic',
  authors: [{ type: 'person', given: 'William', family: 'Deresiewicz' }],
  issued: { year: 2014, month: 12, day: 28 },
};

function plainFromHtml(html) {
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#(?:39|x27);/gi, "'")
    .replace(/&nbsp;|&#160;/g, ' ');
}
function checkRichMatchesText(result) {
  for (const part of [result.reference, result.inText]) {
    assert.equal(plainFromHtml(part.html), part.text);
  }
}

test('APA individual webpage uses full publication date and italic title', () => {
  const result = formatCitation(mantel);
  assert.equal(result.reference.text, 'Mantel, B. (2025, April 24). How to be a caregiver for someone with multiple sclerosis. AARP. https://www.aarp.org/caregiving/health/info-2025/multiple-sclerosis-care-plan/');
  assert.match(result.reference.html, /<(?:i|em)>How to be a caregiver for someone with multiple sclerosis(?:\.)?<\/(?:i|em)>/);
  assert.equal(result.inText.text, '(Mantel, 2025)');
  checkRichMatchesText(result);
  assert.equal(formatCitation({ ...mantel, form: 'narrative' }).inText.text, 'Mantel (2025)');
});

test('APA omits website name repeated from organization author', () => {
  const result = formatCitation(who);
  assert.equal(result.reference.text, 'World Health Organization. (2018, May 24). The top 10 causes of death. https://www.who.int/news-room/fact-sheets/detail/the-top-10-causes-of-death');
  assert.match(result.reference.html, /<(?:i|em)>The top 10 causes of death(?:\.)?<\/(?:i|em)>/);
  assert.equal(result.inText.text, '(World Health Organization, 2018)');
  checkRichMatchesText(result);
});

test('MLA webpage has quoted title, italic website and author-only citations', () => {
  const result = formatCitation(deresiewicz);
  assert.equal(result.reference.text, 'Deresiewicz, William. “The Death of the Artist—and the Birth of the Creative Entrepreneur.” The Atlantic, 28 Dec. 2014, theatlantic.com/magazine/archive/2015/01/the-death-of-the-artist-and-the-birth-of-the-creative-entrepreneur/383497/.');
  assert.match(result.reference.html, /<(?:i|em)>The Atlantic<\/(?:i|em)>/);
  assert.equal(result.inText.text, '(Deresiewicz)');
  checkRichMatchesText(result);
  assert.equal(formatCitation({ ...deresiewicz, form: 'narrative' }).inText.text, 'Deresiewicz');
});
