/* global describe it */
'use strict';

const assert = require('chai').assert;

const {
  //extractHandlebars,
  //insertHandlebars,
  extractCodeBlocks,
  //insertCodeBlocks,
  extractHTMLSnippets,
  //insertHTMLSnippets,
} = require('../../lib/extractors.js');

const showContent = process.env['SHOW_CONTENT']
    ? (label, content) => console.log(`======================= [ ${label} ] ==============================================\n${content}`)
    : _ => _;

describe('extractors', () => {

  it('extracts code blocks', () => {
const s = `

This is a test

\`\`\`js
this is a code block
\`\`\`

More stuff

    this is a code block

Stuff

    this is another code block

    that is 3 lines line

1.  This

    2. this is not
    3. a code block

*   This is

    * Not a codeblock

foo
`;

const expected = `

This is a test

==CODEBLOCK_ID_0==

More stuff

==CODEBLOCK_ID_1==

Stuff

==CODEBLOCK_ID_2==

1.  This

    2. this is not
    3. a code block

*   This is

    * Not a codeblock

foo
`;

    const {content, codeBlocks} = extractCodeBlocks(s);
    showContent('before', s);
    showContent('after', content);
    showContent('codeBlocks', codeBlocks);
    assert.equal(content, expected);
  });

  it('extracts code blocks 2', () => {

    const s = `
Wenn du [webglfundamentals.org](https://webglfundamentals.org) bereits
gelesen hast, wird es dür dich einige Änderungen geben die dir bewusst sein sollten.

## Multiline Template Literals

Auf webglfundamentals.org werden fast alle Skripte in nicht-javascript
\`script\` Tags gehalten. 


    <script id="vertexshader" type="not-js">;
    shader
    goes
    here
    </script>;

    ...

    var vertexShaderSource = document.querySelector("#vertexshader").text;

Auf webgl2fundamentals.org bin ich zu multiline template literals übergegangen

    var vertexShaderSource = \`
    shader
    goes
    here
    \`;

multiline template literals werden von allen WebGL-fähigen Browsern unterstützt,
den IE11 ausgenommen. Wenn du IE11 benutzen möchtest, solltest du einen Transpiler 
`;

    const expected = `
Wenn du [webglfundamentals.org](https://webglfundamentals.org) bereits
gelesen hast, wird es dür dich einige Änderungen geben die dir bewusst sein sollten.

## Multiline Template Literals

Auf webglfundamentals.org werden fast alle Skripte in nicht-javascript
\`script\` Tags gehalten. 


==CODEBLOCK_ID_0==

Auf webgl2fundamentals.org bin ich zu multiline template literals übergegangen

==CODEBLOCK_ID_1==

multiline template literals werden von allen WebGL-fähigen Browsern unterstützt,
den IE11 ausgenommen. Wenn du IE11 benutzen möchtest, solltest du einen Transpiler 
`;

    const expectedCodeBlocks = [`\
    <script id="vertexshader" type="not-js">;
    shader
    goes
    here
    </script>;

    ...

    var vertexShaderSource = document.querySelector("#vertexshader").text;`, `\
    var vertexShaderSource = \`
    shader
    goes
    here
    \`;`,
    ];

    const {content, codeBlocks} = extractCodeBlocks(s);
    showContent('before', s);
    showContent('after', content);
    showContent('codeBlocks', codeBlocks);
    assert.equal(content, expected);
    assert.deepEqual(codeBlocks, expectedCodeBlocks);
  });

  it('extracts html snippets', () => {

const s = `

This is a test

==CODEBLOCK_ID_0==

<pre class="prettyprint other"><code>
==HANDLEBARS_ID_1==<div>
  <div>test</div>
</div>==HANDLEBARS_ID_2==
</code></pre>


In any case if we compute the cross product of our <span class="z-axis">==CODEBLOCK_ID_2==</span> and
<span style="color: gray;">==CODEBLOCK_ID_3==</span> we'll get the <span class="x-axis">xAxis</span> for the camera.

And now that we have the <span class="x-axis">==CODEBLOCK_ID_4==</span> we can cross the <span class="z-axis">==CODEBLOCK_ID_5==</span> and the <span class="x-axis">==CODEBLOCK_ID_6==</span>
which will give us the camera's <span class="y-axis">==CODEBLOCK_ID_7==</span>

`;

const expected = `

This is a test

==CODEBLOCK_ID_0==

==HTML_SNIPPET_0==


In any case if we compute the cross product of our <span class="z-axis">==CODEBLOCK_ID_2==</span> and
<span style="color: gray;">==CODEBLOCK_ID_3==</span> we'll get the <span class="x-axis">xAxis</span> for the camera.

And now that we have the <span class="x-axis">==CODEBLOCK_ID_4==</span> we can cross the <span class="z-axis">==CODEBLOCK_ID_5==</span> and the <span class="x-axis">==CODEBLOCK_ID_6==</span>
which will give us the camera's <span class="y-axis">==CODEBLOCK_ID_7==</span>

`;

      const {content, snippets} = extractHTMLSnippets(s);
      showContent('before', s);
      showContent('after', content);
      showContent('snippets', snippets);
      assert.equal(content, expected);

  });

  it('extracts html snippets 2', () => {
    const s = `
우리가 로딩할 두개의 이미지는 아래와 같습니다.

<style>.glocal-center { text-align: center; } .glocal-center-content { margin-left: auto; margin-right: auto; }</style>
<div class="glocal-center"><table class="glocal-center-content"><tr><td><img src="../resources/leaves.jpg" /> <img src="../resources/star.jpg" /></td></tr></table></div>

아래는 WebGL에서 두 개의 이미지를 곱한 결과입니다.
`;
    const expected = `
우리가 로딩할 두개의 이미지는 아래와 같습니다.

==HTML_SNIPPET_0==

아래는 WebGL에서 두 개의 이미지를 곱한 결과입니다.
`;
      const {content, snippets} = extractHTMLSnippets(s);
      showContent('before', s);
      showContent('after', content);
      showContent('snippets', snippets);
      assert.equal(content, expected);
  });

});