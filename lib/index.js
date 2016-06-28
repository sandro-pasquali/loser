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

    // TODO: make this transactional?
    //
    function makeSpace() {
        return client
        .zcardAsync(store)
        .then(size => {
            if(size > maxSize) {

                // - get #buffer members with lowest score
                // - remove these keys from #lookup
                // - remove the #buffer members with lowest score
                //
                return client
                .zrangeAsync(store, 0, buffer)
                .then(doomed => client.hdelAsync(lookup, doomed))
                .then(rem => zremrangebyrankAsync(store, 0, buffer))
            }
            return 1;
        });
    }

    // Set cache #key to #value.
    // We always update the #lookup with key->value.
    // If already keeping score, do nothing.
    // If not, create score.
    //
    function set(key, value) {

        if(_.isObject(value)) {
            value = JSON.stringify(value);
        }

        return makeSpace()
        .then(() => client.hexistsAsync(lookup, key))
        .then(exists => {
            return client
            .hsetAsync(lookup, key, value)
            .then(() => !exists ? client.zaddAsync(store, 0, key) : 1);
        });
    }

    // Get the cache value and update score
    //
    function get(key) {
        return client
        .hgetAsync(lookup, key)
        .then(val => {
            if(val) {

                // If the JSON parse fails, we check if a Syntax Error
                // in catch (ie. parse error), and return original #val.
                // If not SyntaxError in catch, some general error that
                // the implementation should handle, so re-throw.
                // Successful parse proceeds normally through #then
                //
                return client
                .zincrbyAsync(store, 1.0, key)
                .then(() => JSON.parse(val))
                .catch(err => {
                   if(err instanceof SyntaxError) {
                       return val;
                   }

                   throw err;
                });
            }
            return val;
        });
    }

    return {
        get : get,
        set : set
    }
};