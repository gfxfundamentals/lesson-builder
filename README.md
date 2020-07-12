# GFXFundamentals Lesson Builder

This is the lesson builder (static site generator) used on
[WebGLFundamentals](https://webglfundamentals.org),
[WebGL2Fundamentals](https://webgl2fundamentals.org), and
[ThreeJSFundamentals](https://threejsfundamentals.org).

The code is a mess as it started small and got hacked over time.

Still, I got tired of propagating changes between projects so
I managed to get it separated out.

I'm not sure it has any features over something like Jekyll except

1. it's written in JavaScript.

   I'm not saying Ruby is bad. Only that
I really only want to have to maintain one dev environment.

   I particularly like that npm defaults to all dependencies being local.
No knowledge needed. In special incantations. It just works.
My, very limited experience with
Ruby is that Ruby expects many things to be globally installed
and you have to use other tools to help you make things local.

2. I think, but I'm probably wrong, that it handles HTML better.

   My markdown files have lots of embedded HTML. For whatever
reason most of time I try this in other systems they get confused
and end up seeing markdown inside portions of HTML. I probably
just don't know how to use them correctly.

3. It handles multiple languages

   I'm sure other systems do that too but it's not a common request
so I'm guessing that's often less supported.

Anyway, I'm not trying to promote this as a solution to anything.
It's just what I have hacked together over the years to make
the sites listed above.

# Docs

These are in no way complete. They're most notes to myself.

## .md files

.md files have front matter like headers at the front. Basically a keyword
followed by a colon. and a space. A blank line ends the front matter
and starts the content

* `Title`: The title for the page

* `TOC`: (optional) The title for the table of contents if different

* `Description`: A description currently only used for meta data like for facebook/twitter

* `Link`: (optional) A link to some other page

  The link's sole purpose is to put an external link in the table of contents.
  It also lets the title of that link be localized (the link can be localized too)
  as in

  some-article.md

  ```
  Title: How to use Canvas
  Link: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
  ```

  ja/some-article.md

  ```
  Title: Canvasの使い方
  Link: https://developer.mozilla.org/ja/docs/Web/API/Canvas_API
  ```

English lessons sit in .md files in a folder called `lessons` below a folder named whatever, usually the topic of the site. Example `webgl/lessons/some-lesson.md`. Translations have .md files
of the same name one subfolder deeper, ideally using the language
code. Example `webgl/lessons/zh_cn/some-lesson.md`.

## required files

```
contributors.md
toc.hanson
build/templates/index.template
build/templates/lessons.template
build/templates/missing.template
build/templates/example.template
build/templates/diagram.template
<topic>/lessons/index.md
<topic>/lessons/toc.html
<topic>/lessons/langinfo.hanson
<topic>/lessons/at-least-one-lesson.md
```

## langinfo.hanson

Each language folder as well as the English folder have a `langinfo.hanson` file which is similar to JSON except comments
and trailing commas are allowed.

The contents is 

```js
{
  // The language (will show up in the language selection menu)
  language: 'English',

  // only needed if different from the folder name
  langCode: 'en',

  // Phrase that appears under examples
  defaultExampleCaption: "click here to open in a separate window",

  // Title that appears on each page
  title: 'WebGL Fundamentals',

  // Basic description that appears on each page
  description: 'Learn WebGL from the ground up. No magic',

  // Link to the language root.
  link: 'https://webglfundamentals.org/webgl/lessons/ja',  // replace `ja` with country code

  // html that appears after the article and before the comments
  commentSectionHeader: '<div>Questions? <a href="https://stackoverflow.com/questions/tagged/webgl">Ask on stackoverflow</a>.</div>\n        <div>Issue/Bug? <a href="https://github.com/gfxfundamentals/webgl-fundamentals/issues">Create an issue on github</a>.</div>',

  // markdown that appears for untranslated articles
  missing: "Sorry this article has not been translated yet. [Translations Welcome](https://github.com/gfxfundamentals/webgl-fundamentals)! 😄\n\n[Here's the original English article for now]({{{origLink}}}).",

  // the phrase "Table of Contents"
  toc: "Table of Contents",

  // translation of categories for table of contents
  categoryMapping: {
    'fundamentals': "Fundamentals",
    'image-processing': "Image Processing",
    'matrices': "2D translation, rotation, scale, matrix math",
    '3d': "3D",
    'lighting': "Lighting",
    'organization': "Structure and Organization",
    'geometry': "Geometry",
    'textures': "Textures",
    'rendertargets': "Rendering To A Texture",
    '2d': "2D",
    'text': "Text",
    'misc': "Misc",
    'reference': "Reference",
  },

}
```

## toc.hanson

This is the table of contents. It looks like this

```js
{
  "topic1": [
    "some-article.md",
    "some-other-article.md",
  ],
  "topic2": [
    "another-article.md",
    "yet-another-article.md",
  ],
  "topic3": [
    "sub-topic1": [
      "foo-article.md",
      "bar-article.md",
    ],
  ]
}
```

The actual HTML generated is a nested `<ul>` list where `topic1` is translated via the `langInfo.json` and the titles come from
the articles/lessons.

## toc.html

This is a language specific template the table of contents.
allowing you to add links that are language specific. Example:

```html
{{{tocHtml}}}
<ul>
  <li><a href="/docs/">Helper API Docs</a></li>
  <li><a href="https://twgljs.org">TWGL, A tiny WebGL helper library</a></li>
  <li><a href="https://github.com/gfxfundamentals/webgl-fundamentals">github</a></li>
</ul>
```

Yes: this should be renamed to `toc.template` 😅

## index.md

This is the language specific content of index.html for each
language that gets inserted as `content` into the index.template.

Example:

```md
Title: WebGL Fundamentals

WebGL from the ground up. No magic.

These are a set of articles that teach WebGL from basic principles.
They are NOT old rehashed out of date OpenGL articles like many others on the net.
They are entirely new, discarding the old out of date ideas and bringing you
to a full understanding of what WebGL really is and how it really works.

{{{include "webgl/lessons/toc.html"}}}
```

## Building

```js
const buildStuff = require('@gfxfundamentals/lesson-builder');
async function main() {}
  const buildSettings = {
    outDir: 'out',  // where to generate the site
    baseUrl: 'https://webglfundamentals.org',  // the site
    rootFolder: 'webgl',  // folder where `lessons` folder is
    lessonGrep: 'webgl*.md',  // grep to find .md files for lessons
    siteName: 'WebGLFundamentals',
    siteThumbnail: 'webglfundamentals.jpg',  // in rootFolder/lessons/resources 
    templatePath: 'build/templates',  // where the templates are
    thumbnailOptions: {
      thumbnailBackground: 'webglfundamentals.jpg',
      text: [
        {
          font: '100px lesson-font',
          verticalSpacing: 100,
          offset: [100, 120],
          textAlign: 'left',
          shadowOffset: [15, 15],
          strokeWidth: 15,
          textWrapWidth: 1000,
        },
      ],
    },
  };

  await buildStuff(buildSettings);
}
```

You can build specific lessons by passing in an array of filenames
in the settings 

```js
{
  ...
  filenames: [
    'some-article.md',
    'another-article.md',
  ];
}
```

This is mostly to facilitate a continuous build. If you monitor
for lesson article changing then you can pass the list of changed
files to build just those files.

Note: the builder only builds the index.html, lessons html, sitemap.xml, link-check.html. It does not copy any other files.
(examples, images, etc...). Use other build tools for that.

## .templates

The build system looks for [handlebars](https://handlebarsjs.com) template files in `build\templates`.
The main templates it expects are `index.template` which it uses for the index.html file for each language
and `lesson.template` which it use for each lesson.

Available to the templates are the following variables.

* `langInfo` is the contents of the langinfo.hanson file above.

* `langInfo.baseDirname`: The basename of the language folder. 

  There is no good reason for this to be different than the `langCode` but it can be.

* `langInfo.home`: The path to the home eg `topic/lessons/ja`

* `langInfo.carousel`: Some JSON for Schema.org schema. 

  Example usage

  ```html
  <script type="application/ld+json">
  {
    "@context":"https://schema.org",
    "@type":"ItemList",
    "itemListElement":
    {{{langInfo.carousel}}}
  }
  </script>
  ```

* `content`: The .md file converted to HTML

* `langs`: An array of info for all available languages

   Each entry includes 
   
   * `language`: The text from the langinfo.language
   * `url` (the URL to the corresponding page for this language)
   * `relUrl` (the relative URL for this language from this page)

      effective if this is "" then the page being generated is
      this language (not really)

   Here is an example handlebars template generating a language `<select>` dropdown using `langs`

   ```html
   <select class="language">
   {{#each langs}}
      <option value="{{url}}" {{{selected key="url" value="relUrl" re="index\.html" sub="" }}}>{{language}}</a>
    {{/each}}
   </select>
   ```

* `title`: The title of the lesson from the .md front matter

* `description`: The description of the less from the .md from matter

* `toc` 

* `src_file_name`: the .md file

* `dst_file_name`: the .html file being written

* `toc`: ???

* `tocHTML`: the language specific generated table of contents

* `url`: The url of the page

* `relUrl`: The relative url of the page

* `screenshot`: url for a screenshot for meta tags

* `screenshotSize`: the size of the screenshot

* `templateOptions`: same as `langInfo` above. Just cruft.

## handlebar helpers

* `include`: Includes another template

  ```
  {{{include "some/other/file"}}}

* `ifexists`: Checks if a file exists

  ```
  {{#ifexists filename="foo/{{bar}}/test.txt" bar={{langInfo.langCode}}}
     <div>it exists</div>
  {{else}}
     <div>it does not exist</div>
  {{/ifexists}}
  ```

* `example`: Inserts an example using `example.template`

  {{{example url="../some-example.html}}}

  Optionally takes a `caption`, `width`, `height`, `startPane`

  {{{example url="../example.html" caption="adjust slider" width="500" height="400"}}}

  Passed to `example.template` are the `width`, `height`, `caption`, `examplePath` (so links are absolute),
  `encodedUrl` in case there is a query string
  `url`, `cacheid` for cache busting, `params` (which is whatever
  the `startPane` parameter was)

* `diagram`: Inserts an diagram using `diagram.template`

  Optionally takes a `caption`, `width`, `height`, and a `className`

  Passed to `diagram.template` are the `width`, `height`, `caption`, `examplePath` (so links are absolute),
  `url`, `className`

* `image`: Inserts an image using `image.template`

  Optionally takes a `caption`, and a `className`

* `selected`: Inserts the word `selected`. See `langs`

## Debugging 

You can set the following environment variables to help find
issues.

* `ARTICLE_FILTER`: only articles with this substring in the filename will be built

* `ARTICLE_VERBOSE`: Set to 1, Prints more info (not much though)

* `ARTICLE_FIX`: Set to 1, Tries to fix URLS

  I don't totally remember what this is for but it loads
  an lesson .md file, tries to fix some URLs, then writes
  that .md file back out. So, be sure your originals are
  checked into git.