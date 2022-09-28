'use strict';

const jsdom = require('jsdom');
const {JSDOM} = jsdom;

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

function getNumLeadingSpace(s) {
  const numLeadingSpaces = 0;
  for (let i = 0; i < s.length; ++s) {
    const code = s.codePointAt(i);
    switch (code) {
      case 0x20:  // space
        ++numLeadingSpaces;
        break;
      case 0x09:  // tab
        // ....t  => 8
        // .....t => 8
        numLeadingSpaces = ((numLeadingSpaces + 4) / 4 | 0) * 4;
        break;
    }
  }
  return numLeadingSpaces;
}

function createSaveCodeBlockFn(codeBlocks) {
  return (codeBlock) => {
    const id = `\n==CODEBLOCK_ID_${codeBlocks.length}==`;
    codeBlocks.push(codeBlock[0] === '\n' ? codeBlock.substring(1) : codeBlock);
    return id;
  };
}

/*

block of text

    code block

    code block continued

1.  head

    text

2.  head

    block of text

        code block

        code block continued

    block of text

3.  head

    4. head

        block of text

        code block

        code block continued

        block of text

    block of text

block of text

*/

/*
function extractIndentedCodeBlocks(content, saveCodeBlockFn) {
  // --- extract indented code blocks ---
  const lines = content.split('\n');
  const newLines = [];
  // 3 modes.
  //   blank line
  //   line that starts with 4 or more space
  //   else
  const listRE = /^\s*(-|\*|\d+\.)/;

  let blockStartLineNo;
  let blockEndLineNo;
  let indentStack = [];
  let currentIndentLevel = 0;

  const addBlockIfFound = () => {
    if (blockEndLineNo !== undefined) {
      const block = lines.slice(blockStartLineNo, blockEndLineNo).join('\n');
      newLines.push(saveCodeBlockFn(block), '');
      //const numBlankLines = lineNo - blockEndLineNo;
      //newLines.push(...new Array(numBlankLines).fill(''));
      blockEndLineNo = undefined;
      blockStartLineNo = undefined;
    }
  };

  lines.forEach((line, lineNo) => {
    if (line.trim() === '') {
      // blank line
      if (blockStartLineNo !== undefined) {
        if (blockEndLineNo === undefined) {
          // remember this, because we started a block
          // but this blank line may or many not end it.
          blockEndLineNo = lineNo;
        }
      } else {
        newLines.push(line);
      }
    } else {
      const numLeadingSpaces = getNumLeadingSpace(line);
      // cases:
      //  * it's +/- 1 from current
      //      replace current
      //  * it's +4 from current (it's a code block)

      if (line.startsWith(currentCodeIndent)) {
      // this is imperfect because lists can start with 4 spaces
      //
      // 1.  Foo
      //     1. Bar
      //
      if (blockStartLineNo === undefined) {
        // start a new block
        blockStartLineNo = lineNo;
      }
    } else if (
        // Is it a list?
        if (listRE.test(line)) {
          // Yes, skip it
          newLines.push(line);
        } else {
{
      addBlockIfFound();
      newLines.push(line);
    }
  });
  if (blockStartLineNo !== undefined) {
    blockEndLineNo = lines.length;
    addBlockIfFound();
  }
  content = newLines.join('\n');
  return content;
}
*/

/**
 * Extracts markdown code blocks (eg, `abc`, and ```def```)
 * We need this because we need to extract the HTML (see extractHTMLSnippets)
 * but to do that we first need to remove the codeblocks else we'll see
 * them as HTML :rolleyes:
 *
 * @param {string} content
 * @returns {content: string, codeBlocks: *}
 */
function extractCodeBlocks(content) {
  const tripleTickRE = /\n *```[\s\S]*?```/g;
  const singleTickRE = /`[\s\S]*?`/g;

  const codeBlocks = [];
  const saveCodeBlockFn = createSaveCodeBlockFn(codeBlocks);

  // --- extract triple backtick blocks ---
  content = content.replace(tripleTickRE, saveCodeBlockFn);

//  content = extractIndentedCodeBlocks(content, saveCodeBlockFn);

  // --- extract single backtick codeblocks ---
  content = content.replace(singleTickRE, saveCodeBlockFn);

  return { content, codeBlocks };
}

function insertCodeBlocks(codeBlocks, content) {
  const codeBlockRE = /==CODEBLOCK_ID_(\d+)==/g;
  function restoreCodeBlock(m, m1) {
    return codeBlocks[parseInt(m1)];
  }
  content = content.replace(codeBlockRE, restoreCodeBlock);
  return content;
}

/**
 * Extracts all the HTML snippets and replaces them
 * with <span>==HTML_SNIPPET_<num>==</span>. This is needed because
 * the markdown sucks and so we need to hide all html from it.
 * @param {string} content
 * @returns {content: string, snippets: *}
 */
function extractHTMLSnippets(content) {
  const dom = new JSDOM(content, {includeNodeLocations: true});
  const headBody = dom.window.document.documentElement.children;
  const body = headBody[1];
  const nodes = [...body.childNodes];
  const parts = [];
  const snippets = [];
  let lastEnd = 0;
  let lastNodeType;
  for (const node of nodes) {
    const {startOffset, startCol, startLine, endOffset, endLine} = dom.nodeLocation(node);
    let take = true;
    if (node.nodeType === 1) {
      // ELEMENT_NODE
      // is this a stand alone snippet or inline?
      if (startLine !== endLine ||
          startCol === 1 && content[endOffset] === '\n') {
        // it's standalone
        take = false;
        const snippet = content.substring(startOffset, endOffset);
        // was the last thing we found a snippet?
        if (lastNodeType === 1) {
          // yes, so append this to it.
          snippets[snippets.length - 1] += snippet;
        } else {
          // was the last thing just a blank line and thing before
          // that a snippet?
          if (parts.length >= 2 &&
              parts[parts.length - 1] === '\n' &&
              parts[parts.length - 2].startsWith('==HTML_SNIPPET_')) {
            // append to previous snippet, including `\n` and remove
            // '\n' from non-snippet
            parts[parts.length - 1] = '';
            snippets[snippets.length - 1] += `\n${snippet}`;
          } else {
            // create new snippet
            parts.push(content.substring(lastEnd, startOffset));
            parts.push(`==HTML_SNIPPET_${snippets.length}==`);
            snippets.push(snippet);
          }
        }
      }
    }
    if (take) {
      // OTHER
      parts.push(content.substring(lastEnd, endOffset));
    }
    lastEnd = endOffset;
    lastNodeType = node.nodeType;
  }
  parts.push(content.substring(lastEnd));
  return {
    content: parts.join(''),
    snippets,
  };
}

/**
 * Reinsert HTML snippets
 * @param {*} snippets as returned from extractHTMLSnippets
 * @param {string} content
 * @returns {string}
 */
function insertHTMLSnippets(snippets, content) {
  const pHtmlSnippetRE = /<p>==HTML_SNIPPET_(\d+)==<\/p>/g;
  const htmlSnippetRE = /==HTML_SNIPPET_(\d+)==/g;

  function restoreSnippet(m, m1) {
    return snippets[parseInt(m1)];
  }

  content = content.replace(pHtmlSnippetRE, restoreSnippet);
  content = content.replace(htmlSnippetRE, restoreSnippet);

  return content;
}

module.exports = {
  createSaveCodeBlockFn,
//  extractIndentedCodeBlocks,
  extractHandlebars,
  insertHandlebars,
  extractCodeBlocks,
  insertCodeBlocks,
  extractHTMLSnippets,
  insertHTMLSnippets,
};
