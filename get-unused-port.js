'use strict';

const net = require('net');
const Socket = net.Socket;

/**
 * Tries to "CONNECT" to the given hostname:port.
 * Increments the port until it fails to connect
 * because if it succeeds then the port is in use.
 *
 * adapted from: https://stackoverflow.com/a/66116887/128511
 *
 * @param {number} port port to start scanning at, default: 8080
 * @param {*} hostname name of host to connect to default: "localhost"
 *    other common values might be '0.0.0.0' or '127.0.0.1'
 * @returns {number} the first unused port
 */
module.exports = function getUnusedPort(port = 8080, hostname = 'localhost') {
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    const timeout = () => {
      // we timed out, this port is not in-use
      resolve(port);
      socket.destroy();
    };

    const next = () => {
      socket.destroy();
      resolve(getUnusedPort(++port, hostname));
    };

      setTimeout(timeout, 100);
      socket.on('timeout', timeout);
      socket.on('connect', next);

      socket.on('error', error => {
        if (error.code !== 'ECONNREFUSED') {
          // a deeper error than just in-use/not-in-use
          reject(error);
        } else {
          // we failed to connect so this port is not in-use
          resolve(port);
        }
      });

      socket.connect(port, hostname);
  });
};
