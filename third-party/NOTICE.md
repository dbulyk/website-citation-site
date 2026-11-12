# Citation formatter notices

## citeproc-js

The formatter uses the `citeproc` npm package, pinned to `2.4.63` in `package-lock.json`, from [Juris-M/citeproc-js](https://github.com/juris-m/citeproc-js). Copyright (c) 2009–2019 Frank Bennett.

[citeproc-LICENSE](citeproc-LICENSE) reproduces the package's original dual-license notice. This site distributes citeproc-js under [CPAL 1.0](CPAL-1.0.txt). The [original npm source archive](citeproc-2.4.63.tgz) contains the unmodified source used by this build.

## Citation Style Language

The XML strings below reproduce the files in the Website Citation extension at commit `0859043c7770ae4cc01ecac29e45313a6ed6a01b`. Each XML file retains its author and contributor credits, style or locale identifier, and rights element. All three are licensed under [Creative Commons Attribution-ShareAlike 3.0](CC-BY-SA-3.0.txt).

| Local source | Upstream source | Upstream `<updated>` | Module |
| --- | --- | --- | --- |
| `csl/apa.csl` | [APA Style 7th edition](https://github.com/citation-style-language/styles/blob/master/apa.csl) | `2026-02-07T00:00:00+00:00` | [apa.js](../src/csl/apa.js) |
| `csl/mla.csl` | [MLA Handbook 9th edition (in-text citations)](https://github.com/citation-style-language/styles/blob/master/modern-language-association.csl) | `2026-02-03T00:00:00+00:00` | [mla.js](../src/csl/mla.js) |
| `csl/locales-en-US.xml` | [English (US) locale](https://github.com/citation-style-language/locales/blob/master/locales-en-US.xml) | `2026-01-10T00:00:00+00:00` | [en-US.js](../src/csl/en-US.js) |

- The extension's APA copy already includes two local changes. Commit `38de1cda0ad8edd0f9972a23fbe62d144e98f7a2` suppresses the locator label for nonnumeric sections in `label-locator`. Commit `9261ea492eb1e4668f2176384312badd4e1c2c72` removes the webpage publisher fallback from the full and short author macros so anonymous webpages can use the title.
- Each file is stored as a JavaScript template literal so both Node and Vite can import it directly. The resulting XML strings are byte-identical to the extension copies.
- `src/formatter.js` derives narrative citation layouts in memory. The APA variant puts the year and any locator in parentheses and uses textual “and” in the short author macro. The MLA variant puts only a supplied locator in parentheses and selects the English locale’s “and others” term in the short author macro for three or more authors. MLA parenthetical citations and bibliography entries retain “et al.”
- Both APA forms derive a webpage branch in the `source-DOI-URL` macro. When an access date and URL are supplied, the branch renders “Retrieved” and “from” from the English locale with its full text date format. The existing DOI branch retains precedence.
- The formatter supplies standard CSL webpage metadata. APA omits the publisher and a website name that repeats the sole organization author. MLA omits the publisher when it matches the website name and omits the sole organization author when it matches the original publisher, even if the publisher is also omitted. Name comparisons ignore case and surrounding whitespace.
- The derived styles carry the same CC BY-SA 3.0 license. The vendored XML and locale are preserved byte-for-byte.
