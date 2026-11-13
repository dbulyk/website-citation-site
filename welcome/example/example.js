import { bindLanguageSelector, carryContext, readContext } from '../context.js';

const back = document.querySelector('#back');

bindLanguageSelector(readContext(), 'example_title', ({ copy, params }) => {
  carryContext(back, params);
  for (const field of ['title', 'author']) {
    const metadata = document.querySelector(`meta[name="citation_${field}"]`);
    const value = copy[`example_${field}`];
    if (metadata.content !== value) metadata.content = value;
  }
});
