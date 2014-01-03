/**
 * Module dependencies
 */
var assert = require('assert'),
    should = require('should'),
    util = require('util'),
    _ = require('lodash');


module.exports = {
  cbHasErr: function (shouldMsg) {
    it(shouldMsg || 'should provide conventional error arg to caller cb', function () {
      var err = this.resultArgs[0];
      assert(err, 'Error argument should be present.');
    });
  },
  cbHasNoErr: function (shouldMsg) {
    it(shouldMsg || 'should provide NO error arg to caller cb', function () {
      var err = this.resultArgs[0];
      assert(!err, 'Error argument should NOT be present- but it was:\n' + util.inspect(err));
    });
  },

  errorHandler: function (shouldMsg) {
    it(shouldMsg || 'should trigger the `error` handler', function () {
      should(this.handlerName).equal('error');
    });
  },

  invalidHandler: function (shouldMsg) {
    it(shouldMsg || 'should trigger the `invalid` handler', function () {
      should(this.handlerName).equal('invalid');
    });
  },

  successHandler: function (shouldMsg) {
    it(shouldMsg || 'should trigger the `success` handler', function () {
      should(this.handlerName).equal('success');
    });
  }
};
