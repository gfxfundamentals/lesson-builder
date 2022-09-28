'use strict';

/**
 * Extracts all the {{...}} and {{{...}}} from the text
 * and replaces them with ==HANDLEBARS_ID_<num>==.
 *
 * This is used so the markdown parser doesn't see the
 * content of the handlebars and much it up.
 *
 * @param {string} content
 * @returns {content: string, handlebars: *}
 */
function extractHandlebars(content) {
  // Yes, this is 💩 but I don't really want to write a parser.
  const escapeHtmlRE = /\{\{#escapehtml\}\}[\s\S]*?\{\{\/escapehtml\}\}/g;
  const tripleRE = /\{\{\{[\s\S]*?\}\}\}/g;
  const doubleRE = /\{\{[\s\S]*?\}\}/g;

  let numExtractions = 0;
  const handlebars = {
  };

  function saveHandlebar(match) {
    const id = `==HANDLEBARS_ID_${++numExtractions}==`;
    handlebars[id] = match;
    return id;
  }

  content = content.replace(escapeHtmlRE, saveHandlebar);
  content = content.replace(tripleRE, saveHandlebar);
  content = content.replace(doubleRE, saveHandlebar);

  return {
    content,
    handlebars,
  };
}

/**
 * Reinserts the previously extracted handlebars
 * @param {*} handlebars returned from extractHandlebars
 * @param {string} content
 * @returns {string}
 */
function insertHandlebars(handlebars, content) {
  const handlebarRE = /==HANDLEBARS_ID_\d+==/g;

  function restoreHandlebar(match) {
    const value = handlebars[match];
    if (value === undefined) {
      throw new Error(`no match restoring handlebar for: ${match}`);
    }
    return value;
  }

  content = content.replace(handlebarRE, restoreHandlebar);

  return content;
}

module.exports = {
  extractHandlebars,
  insertHandlebars,
};
