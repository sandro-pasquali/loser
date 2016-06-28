'use strict';

let Promise = require('bluebird');
let _ = require('lodash');

module.exports = options => {

    options = options || {};

    let maxSize = options.size || 20;
    let prefix = options.prefix || 'loser:';
    let buffer = options.buffer || 10;

    if(!_.isString(prefix)) {
        throw new Error('#prefix must be undefined, or a String');
    }

    if(!_.isFinite(maxSize)) {
        throw new Error('#size must be undefined, or a Number');
    }

    if(!_.isFinite(buffer)) {
        throw new Error('#buffer must be undefined, or a Number');
    }

    maxSize = Math.abs(maxSize);
    buffer = Math.abs(buffer);

    let lookup = `${prefix}lru-lookup`;
    let store = `${prefix}lru-store`;

    // redis-hook will promisify for us
    //
    options.promisfy = true;
    let client = require('redis-hook')(options);

    function makeSpace() {
        return client
        .zcardAsync(store)
        .then(size => {
            if(size > maxSize) {
                return client
                .zremrangebyrankAsync(store, 0, buffer)
                .then(() => client.zrangeAsync(store, 0, buffer))
                .then(doomed => client.hdelAsync(lookup, doomed))
            }
            return 1;
        });
    }

    function set(key, value) {
        return makeSpace()
        .then(() => client.hexistsAsync(lookup, key))
        .then(exists => {
            return client
            .hsetAsync(lookup, key, value)
            .then(() => !exists ? client.zaddAsync(store, 0, key) : 1);
        });
    }

    function get(key) {
        return client
        .zincrbyAsync(store, key, 1.0)
        .then(score => client.hgetAsync(lookup, key))
        .then(val => {
            val ? .then(nv => nv ? true : false) : false
        });
    }

};