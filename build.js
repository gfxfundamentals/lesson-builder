/* eslint no-undef: "error" */

/*

This entire file is one giant hack and really needs to be cleaned up!

*/

'use strict';

const requiredNodeVersion = 16;
if (parseInt((/^v(\d+)\./).exec(process.version)[1]) < requiredNodeVersion) {
  throw Error(`requires at least node: ${requiredNodeVersion}`);
}

let fetch = function() {
  // we'll replace this later, below.
  debugger;  // eslint-disable-line no-debugger
};

function slugify(s) {
  return s
    .toLowerCase()
    .trim()
    .replace(/<[!/a-z].*?>/ig, '')
    .replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g, '')
    .replace(/\s/g, '-');
}

module.exports = function(settings) { // wrapper in case we're in module_context mode

const hackyProcessSelectFiles = settings.filenames !== undefined;

const cache      = new (require('inmemfilecache'))();
const Feed       = require('feed').Feed;
const fs         = settings.fs || require('fs');
const Handlebars = require('handlebars');
const hanson     = require('hanson');
const md         = require('markdown-it')({
    html: true,
    langPrefix: 'lang-',
    typographer: true,
    quotes: '“”‘’',
})
  .use(require('markdown-it-anchor'), {
      tabIndex: false,
      slugify,
  })
  .use(require('markdown-it-footnote'));
const path       = require('path');
const sitemap    = require('sitemap');
const utils      = require('./lib/utils');
const url        = require('url');
const colors     = require('ansi-colors');
const colorSupport = require('color-support');
const sizeOfImage = require('image-size');
const ThumbnailGenerator = require('./thumbnail');
const {
  extractHandlebars,
  insertHandlebars,
} = require('./lib/extractors.js');

const g_cacheid = Date.now();
const packageJSON = JSON.parse(fs.readFileSync('package.json', {encoding: 'utf8'}));
const {URL} = url;

colors.enabled = colorSupport.hasBasic;

const g_errors = [];
function error(...args) {
  g_errors.push([...args].join(' '));
  console.error(colors.red(...args));  // eslint-disable-line no-console
}

const g_warnings = [];
function warn(...args) {
  g_warnings.push([...args].join(' '));
  console.warn(colors.yellow(...args));  // eslint-disable-line no-console
}

function log(...args) {
  console.log(...args);  // eslint-disable-line no-console
}

let numErrors = 0;
function failError(...args) {
  ++numErrors;
  error(...args);
}

function applyObject(src, dst) {
  Object.keys(src).forEach(function(key) {
    dst[key] = src[key];
  });
  return dst;
}

function mergeObjects() {
  const merged = {};
  Array.prototype.slice.call(arguments).forEach(function(src) {
    applyObject(src, merged);
  });
  return merged;
}

function readFile(fileName) {
  try {
    return cache.readFileSync(fileName, 'utf-8');
  } catch (e) {
    error('could not read:', fileName);
    throw e;
  }
}

function readHANSON(fileName) {
  const text = readFile(fileName);
  try {
    return hanson.parse(text);
  } catch (e) {
    throw new Error(`can not parse: ${fileName}: ${e}`);
  }
}

function writeFileIfChanged(fileName, content) {
  if (fs.existsSync(fileName)) {
    const old = readFile(fileName);
    if (content === old) {
      return;
    }
  }
  const dirname = path.dirname(fileName);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, {recursive: true});
  }
  fs.writeFileSync(fileName, content);
  console.log('Wrote: ' + fileName);  // eslint-disable-line
}

function copyFile(src, dst) {
  writeFileIfChanged(dst, readFile(src));
}

function replaceParams(str, params) {
  const template = Handlebars.compile(str);
  if (Array.isArray(params)) {
    params = mergeObjects.apply(null, params.slice().reverse());
  }

  return template(params);
}

function encodeParams(params) {
  const values = Object.values(params).filter(v => v);
  if (!values.length) {
    return '';
  }
  return '&' + Object.entries(params).map((kv) => {
    return `${encodeURIComponent(kv[0])}=${encodeURIComponent(kv[1])}`;
  }).join('&');
}

function encodeQuery(query) {
  if (!query) {
    return '';
  }
  return '?' + query.split('&').map(function(pair) {
    return pair.split('=').map(function(kv) {
      return encodeURIComponent(decodeURIComponent(kv));
    }).join('=');
  }).join('&');
}

function encodeUrl(src) {
  const u = url.parse(src);
  u.search = encodeQuery(u.query);
  return url.format(u);
}

function TemplateManager() {
  const templates = {};

  this.apply = function(filename, params) {
    let template = templates[filename];
    if (!template) {
      template = Handlebars.compile(readFile(filename));
      templates[filename] = template;
    }

    if (Array.isArray(params)) {
      params = mergeObjects.apply(null, params.slice().reverse());
    }

    return template(params);
  };

  this.applyString = function(string, params) {
    let template = templates[string];
    if (!template) {
      template = Handlebars.compile(string);
      templates[string] = template;
    }

    if (Array.isArray(params)) {
      params = mergeObjects.apply(null, params.slice().reverse());
    }

    return template(params);
  };
}

const templateManager = new TemplateManager();

Handlebars.registerHelper('include', function(filename, options) {
  let context;
  if (options && options.hash && options.hash.filename) {
    const varName = options.hash.filename;
    filename = options.data.root[varName];
    if (filename === undefined) {
      throw new Error(`no value for key "${varName}" in include macro`);
    }
    context = {...options.data.root, ...options.hash};
  } else {
    context = options.data.root;
  }
  return templateManager.apply(filename, context);
});

Handlebars.registerHelper('ifexists', function(options) {
  const filename = path.join(process.cwd(), replaceParams(options.hash.filename, options.hash));
  const exists = fs.existsSync(filename);
  if (exists) {
    return options.fn(this);
  } else {
    return options.inverse(this);
  }
});

Handlebars.registerHelper('example', function(options) {
  options.hash.width   = options.hash.width  ? 'width:  ' + options.hash.width  + 'px;' : '';
  options.hash.height  = options.hash.height ? 'height: ' + options.hash.height + 'px;' : '';
  options.hash.caption = options.hash.caption || options.data.root.defaultExampleCaption;
  options.hash.examplePath = options.data.root.examplePath;
  options.hash.encodedUrl = encodeURIComponent(encodeUrl(options.hash.url));
  options.hash.url = encodeUrl(options.hash.url);
  options.hash.cacheid = g_cacheid;
  options.hash.params = encodeParams({
    startPane: options.hash.startPane,
  });
  return templateManager.apply(path.join(settings.templatePath, 'example.template'), options.hash);
});

function getTranslation(root, msgId) {
  const lang = root.lang;
  const translations = root.translations;
  const origTranslations = root.origLangInfo.translations;
  let str = translations[msgId];
  if (!str) {
    warn(`missing ${lang} translation for msgId: ${msgId}`);
    str = origTranslations[msgId];
    translations[msgId] = str;
  }
  return str;
}

Handlebars.registerHelper('warning', function(options) {
  const root = options.data.root;
  const link = options.hash.link || `${root.packageJSON.homepage}}/blob/master/{$root.contentFileName}`;
  const translation = getTranslation(root, options.hash.msgId);
  const msg = templateManager.applyString(translation, {...root, link});
  const data = {
    ...root,
    msg,
  };
  const str = templateManager.apply(path.join(settings.templatePath, 'warning.template'), data);
  return str;
});

function getProperty(obj, propSpec) {
  const parts = propSpec.split('.');
  let data = obj;
  for (const part of parts) {
    if (!Object.prototype.hasOwnProperty.call(data, part)) {
      return undefined;
    }
    data = data[part];
  }
  return data;
}

function getPropertyOr(obj, propSpecs) {
  const specs = propSpecs.split(',');
  for (const spec of specs) {
    const value = getProperty(obj, spec);
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
}

// lets you insert build time data but stringified
// const foo = {{{stringify names="langInfo"}}};
// const title = {{{stringify names="langInfo.title"}}};
// const title = {{{stringify names="langInfo.title,originalLangInfo.title"}}};
Handlebars.registerHelper('stringify', function(options) {
  const data = getPropertyOr(options.data.root, options.hash.names);
  if (data === undefined) {
    throw new Error(`no property '${options.hash.names}' for {{{stringify}}}`);
  }
  return JSON.stringify(data, null, 2);
});

/*
This won't work because handlebars is going to try to parse
the content. For example

{{{escapeHTML content="<div class="foo"></div>"}}}

Won't work because of the nested quotes and having to manually
escape the quotes defeats the purpose.
*/

Handlebars.registerHelper('escapehtml', function(options) {
  return Handlebars.escapeExpression(options.fn(this));
});

Handlebars.registerHelper('diagram', function(options) {

  options.hash.width  = options.hash.width || '400';
  options.hash.height = options.hash.height || '300';
  options.hash.examplePath = options.data.root.examplePath;
  options.hash.className = options.hash.className || '';
  options.hash.url = encodeUrl(options.hash.url);

  return templateManager.apply(path.join(settings.templatePath, 'diagram.template'), options.hash);
});

Handlebars.registerHelper('image', function(options) {

  options.hash.examplePath = options.data.root.examplePath;
  options.hash.className = options.hash.className || '';
  options.hash.caption = options.hash.caption || undefined;

  if (options.hash.url.substring(0, 4) === 'http') {
    options.hash.examplePath = '';
  }

  return templateManager.apply(path.join(settings.templatePath, 'image.template'), options.hash);
});

Handlebars.registerHelper('selected', function(options) {
  const key = options.hash.key;
  const value = options.hash.value;
  const re = options.hash.re;
  const sub = options.hash.sub;

  const a = this[key];
  let b = options.data.root[value];

  if (re) {
    const r = new RegExp(re);
    b = b.replace(r, sub);
  }

  return a === b ? 'selected' : '';
});

function slashify(s) {
  return s.replace(/\\/g, '/');
}

function articleFilter(f) {
  if (hackyProcessSelectFiles) {
    if (!settings.filenames.has(f)) {
      return false;
    }
  }
  return !process.env['ARTICLE_FILTER'] || f.indexOf(process.env['ARTICLE_FILTER']) >= 0;
}


const readDirs = function(dirPath) {
  const dirsOnly = function(filename) {
    const stat = fs.statSync(filename);
    return stat.isDirectory();
  };

  const addPath = function(filename) {
    return path.join(dirPath, filename);
  };

  return fs.readdirSync(`${settings.rootFolder}/lessons`)
      .map(addPath)
      .filter(dirsOnly);
};

const isLangFolder = function(dirname) {
  const filename = path.join(dirname, 'langinfo.hanson');
  return fs.existsSync(filename);
};


const pathToLang = function(filename) {
  const lang = path.basename(filename);
  const lessonBase = `${settings.rootFolder}/lessons`;
  const lessons = `${lessonBase}/${lang}`;
  return {
    lang,
    toc: `${settings.rootFolder}/lessons/${lang}/toc.html`,
    lessons: `${lessonBase}/${lang}`,
    template: path.join(settings.templatePath, 'lesson.template'),
    examplePath: `/${lessonBase}/`,
    home: `/${lessons}/`,
  };
};

let g_langs = [
  // English is special (sorry it's where I started)
  {
    template: path.join(settings.templatePath, 'lesson.template'),
    lessons: `${settings.rootFolder}/lessons`,
    lang: 'en',
    toc: `${settings.rootFolder}/lessons/toc.html`,
    examplePath: `/${settings.rootFolder}/lessons/`,
    home: '/',
  },
];

g_langs = g_langs.concat(readDirs(`${settings.rootFolder}/lessons`)
    .filter(isLangFolder)
    .map(pathToLang));

const extractHeader = (function() {
  const headerRE = /([A-Z0-9_-]+): (.*?)$/i;

  return function(content) {
    const metaData = { };
    const lines = content.split('\n');
    for (;;) {
      const line = lines[0].trim();
      const m = headerRE.exec(line);
      if (!m) {
        break;
      }
      metaData[m[1].toLowerCase()] = m[2];
      lines.shift();
    }
    return {
      content: lines.join('\n'),
      headers: metaData,
    };
  };
}());

const parseMD = function(content) {
  return extractHeader(content);
};

const loadMD = function(contentFileName) {
  const content = cache.readFileSync(contentFileName, 'utf-8');
  const data = parseMD(content);
  data.link = contentFileName.replace(/\\/g, '/').replace(/\.md$/, '.html');
  return data;
};

function loadFiles(filenames) {
  const byFilename = {};
  filenames.forEach((fileName) => {
    const data = loadMD(fileName);
    byFilename[path.basename(fileName)] = data;
  });
  return byFilename;
}

const Builder = function(outBaseDir, options) {

  const g_articlesByLang = {};
  let g_articles = [];
  let g_langInfo;
  let g_originalLangInfo;
  let g_thumbailGen;
  const g_langDB = {};
  const g_outBaseDir = outBaseDir;
  const g_origPath = options.origPath;

  const toc = readHANSON(settings.tocHanson || 'toc.hanson');

  const g_siteThumbnailFilename = path.join(settings.rootFolder, 'lessons', 'resources', settings.thumbnailOptions.thumbnailBackground || settings.siteThumbnail);
  const g_siteThumbnail = {
    url: `${settings.baseUrl}/${settings.rootFolder}/lessons/resources/${settings.siteThumbnail}`,
    size: sizeOfImage(g_siteThumbnailFilename),
  };

  // These are the english articles.
  const g_allOriginalArticlesFullPath = utils.glob(path.join(g_origPath, '*.md'))
      .filter(a => !a.endsWith('index.md'));
  const g_origArticles = g_allOriginalArticlesFullPath
      .map(a => path.basename(a))
      .filter(articleFilter);

  const g_originalByFileName = loadFiles(g_allOriginalArticlesFullPath);

  function isSameDomain(url, pageUrl) {
    const fdq1 = new URL(pageUrl);
    const fdq2 = new URL(url, pageUrl);
    return fdq1.origin === fdq2.origin;
  }

  function getUrlPath(url) {
    // yes, this is a hack
    const q = url.indexOf('?');
    return q >= 0 ? url.substring(0, q) : url;
  }

  // Try top fix relative links. This *should* only
  // happen in translations
  const iframeLinkRE = /(<iframe[\s\S]*?\s+src=")(.*?)(")/g;
  const imgLinkRE = /(<img[\s\S]*?\s+src=")(.*?)(")/g;
  const aLinkRE = /(<a[^>]*?\s+href=")(.*?)(")/g;
  const mdLinkRE = /(\[[\s\S]*?\]\()(.*?)(\))/g;
  const handlebarLinkRE = /({{{.*?\s+url=")(.*?)(")/g;
  const scriptLinkRE = /(<script[\s\S]*?\s+src=")(.*?)(")/g;
  const linkRE = /(<link[\s\S]*?\s+href=")(.*?)(")/g;
  const linkREs = [
    iframeLinkRE,
    imgLinkRE,
    aLinkRE,
    mdLinkRE,
    handlebarLinkRE,
    scriptLinkRE,
    linkRE,
  ];
  function hackRelLinks(content, pageUrl/*, contentFileName*/) {
    //const basedir = path.dirname(contentFileName);
    // console.log('---> pageUrl:', pageUrl);
    function fixRelLink(m, prefix, url, suffix) {
      if (isSameDomain(url, pageUrl)) {
        // a link that starts with "../" should be "../../" if it's in a translation
        // a link that starts with "resources" should be "../resources" if it's in a translation
        //const testName = path.join(basedir, url);
        //if (!fs.existsSync(testName)) {
          if (url.startsWith('../') ||
              url.startsWith('resources')) {
            // console.log('  url:', url);
            return `${prefix}../${url}${suffix}`;
          }
        //}
      }
      return m;
    }

    return content
        .replace(imgLinkRE, fixRelLink)
        .replace(aLinkRE, fixRelLink)
        .replace(iframeLinkRE, fixRelLink)
        .replace(scriptLinkRE, fixRelLink)
        .replace(linkRE, fixRelLink);
  }

  /**
   * Get all the local urls based on a regex that has <prefix><url><suffix>
   */
  function getUrls(regex, str) {
    const links = new Set();
    let m;
    do {
      m = regex.exec(str);
      if (m  && m[2][0] !== '#' && isSameDomain(m[2], 'http://example.com/a/b/c/d')) {
        links.add(getUrlPath(m[2]));
      }
    } while (m);
    return links;
  }

  /**
   * Get all the local links in content
   */
  function getLinks(content) {
    return new Set(linkREs.map(re => [...getUrls(re, content)]).flat());
  }

  function fixUrls(regex, content, origLinks) {
    return content.replace(regex, (m, prefix, url, suffix) => {
      const q = url.indexOf('?');
      const urlPath = q >= 0 ? url.substring(0, q) : url;
      const urlQuery = q >= 0 ? url.substring(q) : '';
      if (!origLinks.has(urlPath) &&
          isSameDomain(urlPath, 'https://foo.com/a/b/c/d.html') &&
          !(/\/..\/^/.test(urlPath)) &&   // hacky test for link to main page. Example /webgl/lessons/ja/
          urlPath[0] !== '#') {  // test for same page anchor -- bad test :(
        for (const origLink of origLinks) {
          if (urlPath.endsWith(origLink)) {
            const newUrl = `${origLink}${urlQuery}`;
            log('  fixing:', url, 'to', newUrl);
            return `${prefix}${newUrl}${suffix}`;
          }
        }
        failError('could not fix:', url);
      }
      return m;
    });
  }

  const showContent = process.env['SHOW_CONTENT']
      ? (label, content) => console.log(`======================= [ ${label} ] ==============================================\n${content}`)
      : _ => _;

  const applyTemplateToContent = async function(templatePath, contentFileName, outFileName, opt_extra, data) {
    // Call prep's Content which parses the HTML. This helps us find missing tags
    // should probably call something else.
    //Convert(md_content)
    const relativeOutName = slashify(outFileName).substring(g_outBaseDir.length);
    const pageUrl = `${settings.baseUrl}${relativeOutName}`;
    const metaData = data.headers;
    const content = data.content;
    //console.log(JSON.stringify(metaData, undefined, '  '));
    showContent('orig', content);
    const {handlebars, content: noHandlebarsContent} = extractHandlebars(content);
    showContent('no handlebars', noHandlebarsContent);
    let html = md.render(noHandlebarsContent);
    showContent('HTML', html);
    // HACK! :-(
    // There's probably a way to do this in marked
    html = html.replace(/<pre><code/g, '<pre class="prettyprint notranslate" translate="no"><code');
    html = html.replace(/<code>/g, '<code class="notranslate" translate="no">');
    showContent('with snippets', html);
    // HACK! :-(
    if (opt_extra && opt_extra.home && opt_extra.home.length > 1) {
      html = hackRelLinks(html, pageUrl, contentFileName);
    }
    html = insertHandlebars(handlebars, html);
    showContent('with handlebars', html);
    html = replaceParams(html, [
      opt_extra,
      g_langInfo,
      {
        origLangInfo: g_originalLangInfo,
        contentFileName,
        packageJSON,
      },
    ]);
    const pathRE = new RegExp(`^\\/${settings.rootFolder}\\/lessons\\/$`);
    const langs = Object.keys(g_langDB).map((name) => {
      const lang = g_langDB[name];
      const url = slashify(path.join(lang.basePath, path.basename(outFileName)))
         .replace('index.html', '')
         .replace(pathRE, '/');
      return {
        lang: lang.lang,
        language: lang.language,
        url: url,
      };
    });
    metaData['content'] = html;
    metaData['langs'] = langs;
    metaData['src_file_name'] = slashify(contentFileName);
    metaData['dst_file_name'] = relativeOutName;
    metaData['basedir'] = '';
    metaData['toc'] = opt_extra.toc;
    metaData['tocHtml'] = g_langInfo.tocHtml;
    metaData['templateOptions'] = opt_extra.templateOptions;
    metaData['langInfo'] = g_langInfo;
    metaData['originalLangInfo'] = g_originalLangInfo;
    metaData['url'] = pageUrl;
    metaData['settings'] = settings;
    metaData['relUrl'] = relativeOutName;
    metaData['screenshot'] = opt_extra.screenshot || g_siteThumbnail.url;
    metaData['screenshotSize'] = opt_extra.screenshotSize || g_siteThumbnail.size;
    const basename = path.basename(contentFileName, '.md');
    for (const ext of ['.jpg', '.png']) {
      const filename = path.join(settings.rootFolder, 'lessons', 'screenshots', basename + ext);
      if (fs.existsSync(filename)) {
        metaData['screenshot'] = `${settings.baseUrl}/${settings.rootFolder}/lessons/screenshots/${basename}${ext}`;
        const size = sizeOfImage(filename);
        metaData['screenshotSize'] = size;
        break;
      }
    }
    let output = templateManager.apply(templatePath, metaData);
    if (settings.postHTMLFn) {
      output = settings.postHTMLFn(output);
    }
    writeFileIfChanged(outFileName, output);

    return metaData;
  };

  const applyTemplateToFile = async function(templatePath, contentFileName, outFileName, opt_extra) {
    console.log('processing: ', contentFileName);  // eslint-disable-line
    opt_extra = opt_extra || {};
    const data = loadMD(contentFileName);
    const metaData = await applyTemplateToContent(templatePath, contentFileName, outFileName, opt_extra, data);
    g_articles.push(metaData);
  };

  const applyTemplateToFiles = async function(templatePath, filesSpec, extra) {
    const allFiles = utils.glob(filesSpec).sort();
    const files = allFiles.filter(articleFilter);
    const byFilename = loadFiles(allFiles);

    function getLocalizedCategory(category) {
      const localizedCategory = g_langInfo.categoryMapping[category];
      if (localizedCategory) {
        return localizedCategory;
      }
      warn(`no localization for category: ${category} in langinfo.hanson file for ${extra.lang}`);
      const categoryName = g_originalLangInfo.categoryMapping[category];
      if (!categoryName) {
        throw new Error(`no English mapping for category: ${category} in langinfo.hanson file for english`);
      }
      return categoryName;
    }

    function addLangToLink(link) {
      return extra.lang === 'en'
        ? link
        : `${path.dirname(link)}/${extra.lang}/${path.basename(link)}`;
    }

    function tocLink(fileName) {
      let data = byFilename[fileName];
      let link;
      if (data) {
        link = data.headers.link || data.link;
      } else {
        data = g_originalByFileName[fileName];
        if (!data) {
          throw new Error(`original ${fileName} from 'toc.hanson' does not exist`);
        }
        link = data.headers.link || addLangToLink(data.link);
      }
      const toc = data.headers.toc || data.headers.title;
      if (toc === '#') {
        return [...data.content.matchAll(/<a\s*id="(.*?)"\s*data-toc="(.*?)"\s*><\/a>/g)].map(([, id, title]) => {
          const hashLink = `${link}#${id}`;
          return `<li><a href="/${hashLink}">${title}</a></li>`;
        }).join('\n');
      }
      return `<li><a href="/${link}">${toc}</a></li>`;
    }

    function makeToc(toc) {
      return `${
        Object.entries(toc).map(([category, files]) => `  <li>${getLocalizedCategory(category)}</li>
        <ul>
          ${Array.isArray(files)
            ? files.map(tocLink).join('\n')
            : makeToc(files)
          }
        </ul>`
        ).join('\n')
      }`;
    }

    g_langInfo.tocHtml = `<ul>${makeToc(toc)}</ul>`;
    g_langInfo.carousel = JSON.stringify([...g_langInfo.tocHtml.matchAll(/<a href="(.*?)"/g)]
      .filter(m => !m[1].includes('#'))
      .map((m, ndx) => {
        return {
          '@type': 'ListItem',
          'position': ndx + 1,
          'url': `${settings.baseUrl}${m[1]}`,
        };
      }), null, 2);

    for (const fileName of files) {
      const ext = path.extname(fileName);
      if (!byFilename[path.basename(fileName)]) {
        if (!hackyProcessSelectFiles) {
          throw new Error(`${fileName} is not in toc.hanson`);
        }
        warn(fileName, 'is not in toc.hanson');
      }

      const baseName = fileName.substr(0, fileName.length - ext.length);
      const outFileName = path.join(outBaseDir, baseName + '.html');

      {
        const data = loadMD(fileName);
        settings.thumbnailOptions.text[0].text = data.headers.toc || data.headers.title;
        const thumb = await g_thumbailGen.generate({
          backgroundFilename: g_siteThumbnailFilename,
          ...settings.thumbnailOptions,
        });

        const basename = path.basename(baseName);
        const filename = path.join(settings.outDir, settings.rootFolder, 'lessons', 'screenshots', `${basename}_${g_langInfo.langCode}.jpg`);

        const size = sizeOfImage(thumb);
        extra['screenshot'] = `${settings.baseUrl}/${settings.rootFolder}/lessons/screenshots/${path.basename(filename)}`;
        extra['screenshotSize'] = { width: size.width, height: size.height };

        writeFileIfChanged(filename, thumb);
      }

      await applyTemplateToFile(templatePath, fileName, outFileName, extra);
    }

  };

  const addArticleByLang = function(article, lang) {
    const filename = path.basename(article.dst_file_name);
    let articleInfo = g_articlesByLang[filename];
    const url = `${settings.baseUrl}${article.dst_file_name}`;
    if (!articleInfo) {
      articleInfo = {
        url: url,
        changefreq: 'monthly',
        links: [],
      };
      g_articlesByLang[filename] = articleInfo;
    }
    articleInfo.links.push({
      url: url,
      lang: lang,
    });
  };

  const getLanguageSelection = function(lang) {
    const lessons = lang.lessons;
    const langInfo = readHANSON(path.join(lessons, 'langinfo.hanson'));
    langInfo.langCode = langInfo.langCode || lang.lang;
    langInfo.baseDirname = lang.lang;
    langInfo.home = lang.home;
    langInfo.translations = langInfo.translations || {};
    g_langDB[lang.lang] = {
      lang: lang.lang,
      language: langInfo.language,
      basePath: '/' + lessons,
      langInfo: langInfo,
    };
  };

  this.preProcess = async function(langs) {
    g_thumbailGen = new ThumbnailGenerator();
    langs.forEach(getLanguageSelection);
    g_originalLangInfo = g_langDB['en'].langInfo;
  };

  this.close = async function() {
    await g_thumbailGen.close();
  };

  this.process = async function(options) {
    console.log('Processing Lang: ' + options.lang);  // eslint-disable-line
    g_articles = [];
    g_langInfo = g_langDB[options.lang].langInfo;

    await applyTemplateToFiles(options.template, path.join(options.lessons, settings.lessonGrep), options);

    const articlesFilenames = g_articles.map(a => path.basename(a.src_file_name));

    function linkIsIndex(link) {
      const base = `/${settings.rootFolder}/lessons/`;
      const index = `${base}${options.lang}`;
      const indexSlash = `${index}/`;
      //console.log(index, indexSlash);
      return link === index || link === indexSlash || link === base;
    }

    // should do this first was easier to add here
    if (options.lang !== 'en') {
      const existing = g_origArticles.filter(name => articlesFilenames.indexOf(name) >= 0);
      existing.forEach((name) => {
        //const origMdFilename = path.join(g_origPath, name);
        const transMdFilename = path.join(g_origPath, options.lang, name);

        const ext = path.extname(name);
        const baseName = name.substr(0, name.length - ext.length);
        const originHTMLFilename = path.join(outBaseDir, g_langDB.en.basePath, baseName + '.html');
        const transHTMLFilename = path.join(outBaseDir, options.lessons, baseName + '.html');

        const origLinks = getLinks(readFile(originHTMLFilename));
        const transLinks = getLinks(fs.readFileSync(transHTMLFilename, {encoding: 'utf8'}));

        if (process.env['ARTICLE_VERBOSE']) {
          log('---[', transMdFilename, ']---');
          log('origLinks: ---\n   ', [...origLinks].join('\n    '));
          log('transLinks: ---\n   ', [...transLinks].join('\n    '));
        }

        let show = true;
        transLinks.forEach((link) => {
          link = link
              .replace(`${options.lang}/`, '')
              .replace(/^..\//, '');
          if (!origLinks.has(link)) {
            if (linkIsIndex(link)) {
              return;
            }
            if (show) {
              show = false;
              failError('---[', transMdFilename, ']---');
            }
            failError(`   link:[${link}] not found in English file`);
          }
        });

        if (!show && process.env['ARTICLE_FIX']) {
          // there was an error, try to auto-fix
          let fixedMd = fs.readFileSync(transMdFilename, {encoding: 'utf8'});
          linkREs.forEach((re) => {
            fixedMd = fixUrls(re, fixedMd, origLinks);
          });
          fs.writeFileSync(transMdFilename, fixedMd);
        }
      });
    }

    if (hackyProcessSelectFiles) {
      return;
    }

    // generate place holders for non-translated files
    const missing = g_origArticles.filter(name => articlesFilenames.indexOf(name) < 0);
    for (const name of missing) {
      const ext = path.extname(name);
      const baseName = name.substr(0, name.length - ext.length);
      const outFileName = path.join(outBaseDir, options.lessons, baseName + '.html');
      const data = {...loadMD(path.join(g_origPath, name))};
      data.content = g_langInfo.missing;
      const extra = {
        origLink: '/' + slashify(path.join(g_origPath, baseName + '.html')),
        toc: options.toc,
      };
      console.log('  generating missing:', outFileName);  // eslint-disable-line
      await applyTemplateToContent(
          path.join(settings.templatePath, 'missing.template'),
          path.join(options.lessons, 'langinfo.hanson'),
          outFileName,
          extra,
          data);
    }

    function dateFromGitLog(result, filename, timeType) {
      //console.log(filename, timeType, `'${result.stdout}`);
      const dateStr = result.stdout.split('\n')[0].trim();
      const seconds = parseInt(dateStr);
      if (!isNaN(seconds)) {
        return new Date(seconds * 1000);
      }
      const stat = fs.statSync(filename);
      console.log('got date from filename:', stat[timeType]);
      return new Date(stat[timeType]);
    }

    for (const article of g_articles) {
      {
        const result = await utils.executeP('git', [
            'log',
            '--format=%cd',
            '--date=unix',
            '--name-only',
            '--diff-filter=A',
            article.src_file_name,
        ]);
        article.dateAdded = dateFromGitLog(result, article.src_file_name, 'ctimeMs');
      }
      {
        const result = await utils.executeP('git', [
           'log',
           '--format=%cd',
           '--date=unix',
           '--name-only',
           '--max-count=1',
           article.src_file_name,
         ]);
        article.dateModified = dateFromGitLog(result, article.src_file_name, 'mtimeMs');
      }
    }

    let articles = g_articles.filter(function(article) {
      return article.dateAdded !== undefined;
    });
    articles = articles.sort(function(a, b) {
      return b.dateAdded - a.dateAdded;
    });

    if (articles.length) {
      const feed = new Feed({
        title:          g_langInfo.title,
        description:    g_langInfo.description,
        link:           g_langInfo.link,
        image:          `${settings.baseUrl}/${settings.rootFolder}/lessons/resources/${settings.siteThumbnail}`,
        date:           settings.feedDate || articles[0].dateModified,
        published:      settings.feedDate || articles[0].dateModified,
        updated:        settings.feedDate || articles[0].dateModified,
        author: {
          name:       `${settings.siteName} Contributors`,
          link:       `${settings.baseUrl}/contributors.html`,
        },
      });

      articles.forEach(function(article) {
        feed.addItem({
          title:          article.title,
          link:           `${settings.baseUrl}${article.dst_file_name}`,
          description:    '',
          author: [
            {
              name:       `${settings.siteName} Contributors`,
              link:       `${settings.baseUrl}/contributors.html`,
            },
          ],
          // contributor: [
          // ],
          date:           settings.feedDate || article.dateModified,
          published:      settings.feedDate || article.dateAdded,
          // image:          posts[key].image
        });

        addArticleByLang(article, options.lang);
      });

      const outPath = path.join(g_outBaseDir, options.lessons, 'atom.xml');
      console.log('write:', outPath);  // eslint-disable-line
      writeFileIfChanged(outPath, feed.atom1());
    } else {
      console.log('no articles!');  // eslint-disable-line
    }

    // this used to insert a table of contents
    // but it was useless being auto-generated
    await applyTemplateToFile(path.join(settings.templatePath, 'index.template'), path.join(options.lessons, 'index.md'), path.join(g_outBaseDir, options.lessons, 'index.html'), {
      toc: options.toc,
      table_of_contents: '',
      templateOptions: g_langInfo,
      tocHtml: g_langInfo.tocHtml,
    });
  };

  this.writeGlobalFiles = async function() {
    const sm = sitemap.createSitemap({
      hostname: settings.baseUrl,
      cacheTime: 600000,
    });
    const articleLangs = { };
    Object.keys(g_articlesByLang).forEach(function(filename) {
      const article = g_articlesByLang[filename];
      const langs = {};
      article.links.forEach(function(link) {
        langs[link.lang] = true;
      });
      articleLangs[filename] = langs;
      sm.add(article);
    });
    writeFileIfChanged(path.join(g_outBaseDir, 'sitemap.xml'), sm.toString());
    copyFile(path.join(g_outBaseDir, `${settings.rootFolder}/lessons/atom.xml`), path.join(g_outBaseDir, 'atom.xml'));
    copyFile(path.join(g_outBaseDir, `${settings.rootFolder}/lessons/index.html`), path.join(g_outBaseDir, 'index.html'));

    applyTemplateToFile(path.join(settings.templatePath, 'index.template'), 'contributors.md', path.join(g_outBaseDir, 'contributors.html'), {
      table_of_contents: '',
      templateOptions: '',
    });

    {
      const filename = path.join(settings.outDir, 'link-check.html');
      const html = `
      <html>
      <body>
      ${g_langs.map(lang => `<a href="${lang.home}">${lang.lang}</a>`).join('\n')}
      </body>
      </html>
      `;
      writeFileIfChanged(filename, html);
    }

    {
      let data;
      console.log(`LESSON_BUILDER_ENV: '${process.env.LESSON_BUILDER_ENV}'`);
      if (process.env.LESSON_BUILDER_ENV === 'production') {
        const {owner, repo} = settings;
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contributors`);
        data = await res.json();
      } else {
        // just an example
        data = [
          {
            'login': 'greggman',
            'id': 234804,
            'node_id': 'MDQ6VXNlcjIzNDgwNA==',
            'avatar_url': 'https://avatars2.githubusercontent.com/u/234804?v=4',
            'gravatar_id': '',
            'url': 'https://api.github.com/users/greggman',
            'html_url': 'https://github.com/greggman',
            'followers_url': 'https://api.github.com/users/greggman/followers',
            'following_url': 'https://api.github.com/users/greggman/following{/other_user}',
            'gists_url': 'https://api.github.com/users/greggman/gists{/gist_id}',
            'starred_url': 'https://api.github.com/users/greggman/starred{/owner}{/repo}',
            'subscriptions_url': 'https://api.github.com/users/greggman/subscriptions',
            'organizations_url': 'https://api.github.com/users/greggman/orgs',
            'repos_url': 'https://api.github.com/users/greggman/repos',
            'events_url': 'https://api.github.com/users/greggman/events{/privacy}',
            'received_events_url': 'https://api.github.com/users/greggman/received_events',
            'type': 'User',
            'site_admin': false,
            'contributions': 1100,
          },
          {
            'login': 'PrincessGod',
            'id': 20556748,
            'node_id': 'MDQ6VXNlcjIwNTU2NzQ4',
            'avatar_url': 'https://avatars2.githubusercontent.com/u/20556748?v=4',
            'gravatar_id': '',
            'url': 'https://api.github.com/users/PrincessGod',
            'html_url': 'https://github.com/PrincessGod',
            'followers_url': 'https://api.github.com/users/PrincessGod/followers',
            'following_url': 'https://api.github.com/users/PrincessGod/following{/other_user}',
            'gists_url': 'https://api.github.com/users/PrincessGod/gists{/gist_id}',
            'starred_url': 'https://api.github.com/users/PrincessGod/starred{/owner}{/repo}',
            'subscriptions_url': 'https://api.github.com/users/PrincessGod/subscriptions',
            'organizations_url': 'https://api.github.com/users/PrincessGod/orgs',
            'repos_url': 'https://api.github.com/users/PrincessGod/repos',
            'events_url': 'https://api.github.com/users/PrincessGod/events{/privacy}',
            'received_events_url': 'https://api.github.com/users/PrincessGod/received_events',
            'type': 'User',
            'site_admin': false,
            'contributions': 79,
          },
        ];
      }
      const filename = path.join(settings.outDir, 'contributors.js');
      const js = `
const contributors = ${JSON.stringify(data)};
`;
      fs.writeFileSync(filename, js);
    }
  };


};

async function main() {
  const fetchModule = await import('node-fetch');
  fetch = fetchModule.default;

  const b = new Builder(settings.outDir, {
    origPath: `${settings.rootFolder}/lessons`,  // english articles
  });

  await b.preProcess(g_langs);

  if (hackyProcessSelectFiles) {
    const langsInFilenames = new Set();
    [...settings.filenames].forEach((filename) => {
      const m = /lessons\/(\w{2}|\w{5})\//.exec(filename);
      const lang = m ? m[1] : 'en';
      langsInFilenames.add(lang);
    });
    g_langs = g_langs.filter(lang => langsInFilenames.has(lang.lang));
  }

  try {
    for (const lang of g_langs) {
      await b.process(lang);
    }
    if (!hackyProcessSelectFiles) {
      await b.writeGlobalFiles(g_langs);
    }

    g_warnings.slice().forEach(str => warn(str));
    g_errors.slice().forEach(str => error(str));
    if (numErrors) {
      throw new Error(`${numErrors} errors`);
    }
  } finally {
    cache.clear();
    await b.close();
  }
}

return main();

};

