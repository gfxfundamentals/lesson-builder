/* module */
'use strict';

module.exports = class Date {
  static now() {
    return 1664468399782;
  }
  static UTC() {
    return new Date();
  }
  toString() {
    return '2022-09-29T16:19:31.973Z';
  }
  getTime() {
    return Date.now();
  }
  getUTCFullYear() {
    return 2022;
  }
  getUTCMonth() {
    return 8;
  }
  getUTCDate() {
    return 15;
  }
  getUTCDay() {
    return 5;
  }
  getUTCMinutes() {
    return 17;
  }
  setUTCMinutes() {
  }
  getUTCHours() {
    return 12;
  }
  getUTCSeconds() {
    return 31;
  }
};