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
      // console.log('RESULT AGS :',this.resultArgs);
      var err = this.resultArgs[0];
      assert(!err, 'Error argument should NOT be present.');
    });
  }
};
