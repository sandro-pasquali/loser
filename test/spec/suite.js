"use strict";

let util = require('util');
let _ = require('lodash');
let inst = require('../../lib')({
    size : 1000,
    keyPrefix : 'loser:'
});

module.exports = function(test, Promise) {

    return inst

    .set('foo', {
        bar: 'baz'
    })
    .then(() => inst.get('foo'))
    .then(val => {
        test.ok(_.isPlainObject(val), 'Correctly set and fetched Object from cache')
    })
    .catch(err => {
        test.fail('Did not correctly set and get Object from cache');
    })

    .then(() => inst.set('foo', 'baz'))
    .then(() => inst.get('foo'))
    .then(val => {
        test.ok(_.isString(val), 'Correctly set and fetched String from cache')
    })
    .catch(err => {
        test.fail('Did not correctly set and get String from cache');
    })

    return Promise.resolve('ok')
};