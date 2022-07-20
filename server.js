/*
The MIT License (MIT)

Copyright (c) 2019 Gregg Tavares

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/
'use strict';

const express = require('express');
const enableDestroy = require('server-destroy');
const EventEmitter = require('events');
const http = require('http');
const os = require('os');
const getUnusedPort = require('./get-unused-port.js');

const debug = process.env.DEBUG ? console.log : () => {};

/**
 * @typedef {Object} Logger
 * @property {function} log
 * @property {function} error
 * @property {ansiColor} [c] ansi-colors compatible colorizer.
 */

/**
 * @typedef {Object} Settings
 * @property {string} root folder to server
 * @property {number} port port to server
 * @property {boolean} [local] true = only serve to the local machine
 * @property {Logger} [logger] function for logging
 * @property {boolean} [scan] true = scan for a port starting at `port`
 */

const noopLogger = {
  log() {},
  error() {},
  c: new Proxy({}, {
    get(/*target, name*/) {
      return s => s;
    },
  }),
};

function fixPathname(pathname) {
  return pathname.startsWith('/') ? pathname : `/${pathname}`;
}

class Server extends EventEmitter {
  constructor(settings) {
    super();
    const root = settings.root;
    const local = settings.local;
    const hostname = local ? '127.0.0.1' : undefined;
    const logger = settings.logger || noopLogger;
    const log = logger.log.bind(logger);
    const error = logger.error.bind(logger);
    const c = logger.c || noopLogger.c;

    const app = express();

    function setHeaders(res, /*path, stat */) {
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate', // HTTP 1.1.
        'Pragma':        'no-cache',                            // HTTP 1.0.
        'Expires':       '0',                                   // Proxies.
      });
    }

    const staticOptions = {
      fallthrough: true,  // true = call next middleware if no file, false = return 404
      setHeaders: setHeaders,
    };

    app.use((req, res, next) => {
      log(`${req.method} ${c.cyan(req.originalUrl)}`);
      next();
    });

    const pathToContent = new Map();
    this.addFile = (pathname, mimeType, content) => {
      pathToContent.set(fixPathname(pathname), {mimeType, content});
    };
    this.deleteFile = (pathname) => {
      pathToContent.delete(fixPathname(pathname));
    };
    app.use((req, res, next) => {
      const m = pathToContent.get(req.path);
      if (!m) {
        next();
        return;
      }
      const {mimeType, content} = m;
      res.setHeader('Content-Type', mimeType);
      res.send(content);
    });


    app.use(express.static(root, staticOptions));

    function localErrorHandler(err, req, res/*, next*/) {
      debug(`ERROR: ${req.method} ${req.url} ${err}`);
      error(`ERROR: ${req.method} ${c.cyan(req.url)} ${err}`);
      res.status(500).send(`<pre>${err}</pre>`);
    }

    function nonErrorLocalErrorHandler(req, res/*, next*/) {
      debug(`ERROR: ${req.method} ${req.url} [404]`);
      error(`ERROR: ${req.method} ${c.cyan(req.url)} [404: does not exist]`);
      res.status(404).send(`<pre>ERROR 404: No such path ${req.path}</pre>`);
    }

    app.use(nonErrorLocalErrorHandler);
    app.use(localErrorHandler);

    (async() => {
      let server;
      let started = false;

      try {
        debug('starting server');

        let port = await getUnusedPort(settings.port, '127.0.0.1');

        server = http.createServer(app);
        server.on('error', (e) => {
          if (!settings.scan || started) {
            error('ERROR:', e.message);
            this.emit('error', e);
            return;
          }
          if (settings.scan) {
            ++port;
            server.listen(port, hostname);
          }
        });
        server.on('listening', () => {
          started = true;
          log(c.yellow(`server started on ${hostname || '::'}${port} for path: ${c.cyan(root)}`));
          log(c.yellow('available on:'));
          const protocol = settings.ssl ? 'https://' : 'http://';
          log(`   ${protocol}localhost:${port}`);
          if (!hostname) {
            const iFaces = os.networkInterfaces();
            Object.keys(iFaces).forEach(function(dev) {
              iFaces[dev].forEach(function(details) {
                if (details.family === 'IPv4') {
                  log(`   ${protocol}${details.address}:${port}`);
                }
              });
            });
          }
          this.emit('start', {
            port,
            protocol,
            baseUrl: `${protocol}localhost:${port}`,
          });
        });
        server.on('close', () => {
          this.emit('close');
        });
        enableDestroy(server);
        server.listen(port, hostname);
      } catch (e) {
        debug('error starting server');
        error('ERROR:', e, e.message, e.stack);
        this.emit('error', e);
      }

      this.close = function() {
        server.destroy();
      };
    })();
  }
}

module.exports = Server;
