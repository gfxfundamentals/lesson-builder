/*
 * Copyright 2014, Gregg Tavares.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Gregg Tavares. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const util = require('util');

function execute(cmd, args, callback, options) {
  const spawn = require('child_process').spawn;

  const proc = spawn(cmd, args, options);
  let stdout = [];
  let stderr = [];

  proc.stdout.setEncoding('utf8');
  proc.stdout.on('data', function(data) {
      const str = data.toString();
      const lines = str.split(/(\r?\n)/g);
      stdout = stdout.concat(lines);
  });

  proc.stderr.setEncoding('utf8');
  proc.stderr.on('data', function(data) {
      const str = data.toString();
      const lines = str.split(/(\r?\n)/g);
      stderr = stderr.concat(lines);
  });

  proc.on('close', function(code) {
    const result = {exitCode: code, stdout: stdout.join('\n'), stderr: stderr.join('\n')};
    if (parseInt(code) !== 0) {
      callback(result);
    } else {
      callback(null, result);
    }
  });
}

exports.execute = execute;
exports.executeP = util.promisify(execute);

// I'd use the glob module but too many vulnerabilities etc
// and I don't need any special functionality.
function glob(spec) {
  const dirname = path.dirname(spec);
  const basename = path.basename(spec);
  const exp = basename.replace(/\./g, '\\.').replace(/\*/g, '.*?');
  const re = new RegExp(exp);

  const files = fs.readdirSync(dirname)
     .filter(f => re.test(f))
     .map(f => path.join(dirname, f));

  return files;
}
exports.glob = glob;

function createExposedPromise() {
  let resolve;
  let reject;
  const promise = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  return {
    promise,
    resolve,
    reject,
  };
}

exports.createExposedPromise = createExposedPromise;