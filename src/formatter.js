import CSL from 'citeproc';
import apa from './csl/apa.js';
import mla from './csl/mla.js';
import locale from './csl/en-US.js';

const SOURCE_ID = 'webpage';
const APA_WEBPAGE_STYLE = apa.replace(
  /(<macro name="source-DOI-URL">[\s\S]*?<\/if>)/,
  `$1
      <else-if type="webpage" variable="accessed URL" match="all">
        <group delimiter=" ">
          <text term="retrieved" text-case="capitalize-first"/>
          <date form="text" variable="accessed" suffix=","/>
          <text term="from"/>
          <text variable="URL"/>
        </group>
      </else-if>`,
);
const STYLES = { apa: APA_WEBPAGE_STYLE, mla };
const engineSlots = new Map();

function replaceCitationLayout(xml, layout) {
  return xml.replace(
    /(<citation\b[^>]*>[\s\S]*?)<layout\b[^>]*>[\s\S]*?<\/layout>(\s*<\/citation>)/,
    (_, before, after) => before + layout + after,
  );
}

const NARRATIVE_STYLES = {
  apa: replaceCitationLayout(APA_WEBPAGE_STYLE, `<layout delimiter="; ">
    <group delimiter=" ">
      <text macro="author-short"/>
      <group delimiter=", " prefix="(" suffix=")">
        <text macro="date-short"/>
        <text macro="label-locator"/>
      </group>
    </group>
  </layout>`).replace(/<macro name="author-short">[\s\S]*?<\/macro>/, (macro) =>
    macro.replaceAll('and="symbol"', 'and="text"')),
  mla: replaceCitationLayout(mla, `<layout delimiter="; ">
    <group delimiter=" ">
      <text macro="author-short"/>
      <choose>
        <if locator="line page timestamp" match="any">
          <text variable="locator" prefix="(" suffix=")"/>
        </if>
        <else>
          <text macro="label-locator" prefix="(" suffix=")"/>
        </else>
      </choose>
    </group>
  </layout>`).replace(
    /(<macro name="author-short">[\s\S]*?<name\b[^>]*\/>)/,
    '$1\n        <et-al term="and others"/>',
  ),
};

const LITERAL_CODES = { '\uE000': '\uE000', '<': '\uE001', '>': '\uE002' };
const LITERAL_CHARACTERS = { '\uE000': '\uE000', '\uE001': '<', '\uE002': '>' };
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
const CITEPROC_ESCAPES = { '&#38;': '&', '&#60;': '<', '&#62;': '>' };

function literalText(value) {
  return value?.replace(/[<>\uE000]/g, (char) => '\uE000' + LITERAL_CODES[char]);
}

function formatPart(markup) {
  const fragments = markup.split(/(<\/?(?:i|sup)>)/g);
  let html = '';
  let text = '';
  for (const [index, fragment] of fragments.entries()) {
    if (index % 2) {
      html += fragment;
      continue;
    }
    const content = fragment
      .replace(/&#(?:38|60|62);/g, (entity) => CITEPROC_ESCAPES[entity])
      .replace(/\uE000([\uE000-\uE002])/g, (_, code) => LITERAL_CHARACTERS[code]);
    text += content;
    html += content.replace(/[&<>]/g, (char) => HTML_ESCAPES[char]);
  }
  return { html, text };
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function optionalText(value, error) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new Error(error);
  return value.trim() || undefined;
}

function requiredText(value, error) {
  const result = optionalText(value, error);
  if (!result) throw new Error(error);
  return result;
}

function toCslAuthor(author) {
  if (!isRecord(author)) throw new Error('Enter a person or organization for each author.');
  if (author.type === 'organization') {
    const name = requiredText(author.name, 'Enter an organization name.');
    return { literal: literalText(name) };
  }
  if (author.type === 'person') {
    const given = optionalText(author.given, 'Enter the given name as text.');
    const family = requiredText(author.family, 'Enter a family name.');
    return { given: literalText(given), family: literalText(family) };
  }
  throw new Error('Unsupported author type.');
}

function toCslDate(date, full = false) {
  if (date === undefined) return undefined;
  const field = full ? 'access date' : 'publication date';
  if (!isRecord(date)) throw new Error(`Enter a valid ${field}.`);
  const { year, month, day } = date;
  if (!Number.isSafeInteger(year) || year < 1) {
    throw new Error(`Enter a positive whole year for the ${field}.`);
  }
  if (full && (month === undefined || day === undefined)) {
    throw new Error('Enter the month and day of access.');
  }

  const parts = [year];
  if (month !== undefined || day !== undefined) {
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error(`Enter a month from 1 to 12 for the ${field}.`);
    }
    parts.push(month);
  }
  if (day !== undefined) {
    const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (!Number.isInteger(day) || day < 1 || day > daysInMonth[month - 1]) {
      throw new Error(`Enter a valid day for the ${field}.`);
    }
    parts.push(day);
  }
  return { 'date-parts': [parts] };
}

function toCslItem(input) {
  const { authors, style } = input;
  const title = requiredText(input.title, 'Enter a page title.');
  const url = requiredText(input.url, 'Enter a valid HTTP or HTTPS URL.');
  if (!/^https?:\/\//i.test(url) || !URL.canParse(url)) {
    throw new Error('Enter a valid HTTP or HTTPS URL.');
  }
  if (!Array.isArray(authors)) throw new Error('Provide an authors list.');

  const website = optionalText(input.website, 'Enter the website name as text.');
  const publisher = optionalText(input.publisher, 'Enter the publisher name as text.');
  const foldedWebsite = website?.toLowerCase();
  const foldedPublisher = publisher?.toLowerCase();
  const author = Array.from(authors, toCslAuthor);
  const organization = author.length === 1 && authors[0].type === 'organization'
    ? authors[0].name.trim().toLowerCase()
    : undefined;
  const omitWebsite = style === 'apa' && organization && foldedWebsite === organization;
  const omitAuthor = style === 'mla' && organization && foldedPublisher === organization;
  const omitPublisher = style === 'apa' || foldedPublisher === foldedWebsite;

  return {
    id: SOURCE_ID,
    type: 'webpage',
    title: literalText(title),
    URL: literalText(style === 'mla' ? url.replace(/^https?:\/\//i, '') : url),
    'container-title': omitWebsite ? undefined : literalText(website),
    author: omitAuthor ? [] : author,
    issued: toCslDate(input.issued),
    accessed: toCslDate(input.accessed, true),
    publisher: omitPublisher ? undefined : literalText(publisher),
  };
}

function toCitationItem(locator) {
  if (locator === undefined) return { id: SOURCE_ID };
  if (!isRecord(locator) || !['page', 'paragraph', 'section'].includes(locator.type)) {
    throw new Error('Choose a page, paragraph, or section locator.');
  }
  const value = requiredText(locator.value, 'Enter a locator value.');
  return { id: SOURCE_ID, label: locator.type, locator: literalText(value) };
}

function createEngineSlot(xml) {
  const slot = { item: undefined };
  slot.engine = new CSL.Engine({
    retrieveItem: () => slot.item,
    retrieveLocale: () => locale,
  }, xml, 'en-US', true);
  slot.engine.opt.development_extensions.wrap_url_and_doi = false;
  slot.engine.setOutputFormat('html');
  return slot;
}

export function formatCitation(input) {
  if (!isRecord(input)) throw new Error('Provide citation details.');
  const { style, form = 'parenthetical' } = input;
  if (style !== 'apa' && style !== 'mla') throw new Error('Unsupported citation style.');
  if (form !== 'parenthetical' && form !== 'narrative') throw new Error('Unsupported citation form.');
  const item = toCslItem(input);
  const citationItem = toCitationItem(input.locator);
  const key = `${style}:${form}`;
  let slot = engineSlots.get(key);
  if (!slot) {
    const xml = form === 'narrative' ? NARRATIVE_STYLES[style] : STYLES[style];
    slot = createEngineSlot(xml);
    engineSlots.set(key, slot);
  }

  const { engine } = slot;
  slot.item = item;
  try {
    engine.updateItems([SOURCE_ID]);
    const entry = engine.makeBibliography()?.[1]?.[0];
    const reference = entry?.trim().match(/^<div class="csl-entry">([\s\S]+)<\/div>$/)?.[1];
    const inText = engine.makeCitationCluster([citationItem]);
    if (!reference || !inText || inText === '[NO_PRINTED_FORM]') {
      throw new Error('Could not format this citation.');
    }
    const result = { reference: formatPart(reference), inText: formatPart(inText) };
    engine.restoreProcessorState([]);
    return result;
  } catch (error) {
    engineSlots.delete(key);
    throw error;
  } finally {
    slot.item = undefined;
  }
}
