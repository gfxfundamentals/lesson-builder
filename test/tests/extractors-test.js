/* global describe it */
'use strict';

const assert = require('chai').assert;

const {
  extractHandlebars,
  insertHandlebars,
} = require('../../lib/extractors.js');

const showContent = process.env['SHOW_CONTENT']
    ? (label, content) => console.log(`======================= [ ${label} ] ==============================================\n${content}`)
    : _ => _;

describe('extractors', () => {
  it('extracts handlebars', () => {

const s = `

This is a test

{{example href="foo"}}

`;

const expected = `

This is a test

==HANDLEBARS_ID_1==

`;

      const {content, handlebars} = extractHandlebars(s);
      showContent('before', s);
      showContent('after', content);
      showContent('snippets', handlebars);
      assert.equal(content, expected);

      const result = insertHandlebars(handlebars, content);
      assert.equal(result, s);

  });

});