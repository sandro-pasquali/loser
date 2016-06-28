"use strict";

let util = require('util');
let _ = require('lodash');
let inst = require('../../lib')({
    size : 1000,
    keyPrefix : 'loser:'
});

module.exports = function(test, Promise) {

    return Promise.resolve('ok')
};