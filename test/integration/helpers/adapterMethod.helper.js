/**
 * Module dependencies
 */
var assert = require('assert'),
    should = require('should'),
    util = require('util'),
    _ = require('lodash');


/**
 * Helper class for more literate asynchronous tests.
 * @param {Object} config
 */
var Deferred = function (config) {

  var deferred = this;

  var state = {
    expectations: []
  };



  var _run = function ( ) {

    // Generate a better default test message
    state.testMsg = state.testMsg || 
      ('.' +config.nameOfMethod + '('+(state.options ? util.inspect(state.options) : '')+')');

    describe(state.testMsg, function () {

      // Simulates a call like :: `SomeCollection.nameOfMethod( options, cb )`
      before(function (done){  

        var mochaCtx = this;

        var ctx = mochaCtx.SomeCollection;
        var fn = mochaCtx.SomeCollection[config.nameOfMethod];
        var options = state.options || {};
        var cb = function adapterFnCallback () {
          // console.log('result args::',arguments);
          mochaCtx.resultArgs = Array.prototype.slice.call(arguments);
          return done();
        };
        // console.log('Doing: ', config.nameOfMethod, 'with opts:',options);
        fn.apply(ctx, [options, cb]);
      });


      // Run explicit describe function if specified
      if (state.mochaDescribeFn) {
        state.mochaDescribeFn();
      }

      // Otherwise check expectations
      else {
        _.each(state.expectations, function (expectFn) {
          expectFn();
        });
      }
    });

  };



  this.inspect = function ( /* [testMsg], mochaDescribeFn */ ) {

    // Message override
    var testMsg = typeof arguments[0] === 'string' ? arguments[0] : '';
    var mochaDescribeFn = typeof arguments[0] !== 'string' ? arguments[0] : arguments[1];
    mochaDescribeFn = mochaDescribeFn;// || function () { it('should not crash', function () {}); };



    state.mochaDescribeFn = mochaDescribeFn;
    state.testMsg = testMsg;

    _run();

    // Chainable
    return deferred;
  };



  this.options = function (options) {

    state.options = options || {};

    // Chainable
    return deferred;
  };


  this.expect = function (fn) {
    state.expectations.push(fn);

    // Chainable
    return deferred;
  };
};




















// Deferred object allows chained usage, i.e.:
// adapterMethod(foo).inspect(mochaDescribeFn)
function adapterMethod (nameOfMethod) {
  return new Deferred({
    nameOfMethod: nameOfMethod
  });
}


/**
 * Test an adapter method
 * @type {Function}
 */
module.exports = adapterMethod;

