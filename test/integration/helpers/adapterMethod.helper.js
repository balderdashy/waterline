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
    var prettyUsage = '';
    prettyUsage += '.' +config.nameOfMethod + '(';
    prettyUsage += (_.map(state.usage, function (arg){ return util.inspect(arg); })).join(',');
    prettyUsage += ')';
    state.testMsg = state.testMsg || prettyUsage;

    describe(state.testMsg, function () {

      // Simulates a call like :: `SomeCollection.nameOfMethod( options, cb )`
      before(function (done){

        var mochaCtx = this;

        // Decide the fn, args, and `this` value (ctx)
        var fn = mochaCtx.SomeCollection[config.nameOfMethod];
        var ctx = mochaCtx.SomeCollection;
        var args = state.usage || [];


        if ( !state.useHandlers ) {

          // console.log('Doing: ', config.nameOfMethod, 'with args:',args);
          // Add callback as final argument
          // fn.apply(ctx,args.concat([function adapterFnCallback () {
          //   // console.log('result args::',arguments);
          //   mochaCtx.resultArgs = Array.prototype.slice.call(arguments);
          //   return done();
          // }]));
          //
          fn.apply(ctx,args.concat([function adapterFnCallback () {
            mochaCtx.resultArgs = Array.prototype.slice.call(arguments);
            // console.log('!);');
            return done();
          }]));

          return;
        }

        else {

          // console.log('WITH HANDLERS!! Doing:', config.nameOfMethod, 'with args:',args);
          // console.log('fn::',fn);

          // Or use handlers instead
          fn.apply(ctx, args).exec({
            success: function (){
              // console.log('SUCCESS HANDLER');
              mochaCtx.resultArgs = Array.prototype.slice.call(arguments);
              mochaCtx.handlerName = 'success';
              return done();
            },
            error: function (){
              // console.log('ERROR HANDLER');
              mochaCtx.resultArgs = Array.prototype.slice.call(arguments);
              mochaCtx.handlerName = 'error';
              return done();
            },
            invalid: function (){
              // console.log('INVALID HANDLER');
              mochaCtx.resultArgs = Array.prototype.slice.call(arguments);
              mochaCtx.handlerName = 'invalid';
              return done();
            }
          });

          return;
        }



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


  /**
   * @return {Deferred} [chainable]
   */
  this.callbackStyle = function (style) {
    state.useHandlers = style !== 'cb';
    return deferred;
  };


  /**
   * @param  {String} testMsg  [optional override]
   * @param  {Function} mochaDescribeFn  [optional override]
   * @return {Deferred} [chainable]
   */
  this.inspect = function ( /* [testMsg], mochaDescribeFn */ ) {

    var testMsg = typeof arguments[0] === 'string' ? arguments[0] : '';
    if (testMsg) {
      state.testMsg = testMsg;
    }

    var mochaDescribeFn = typeof arguments[0] !== 'string' ? arguments[0] : arguments[1];
    if (mochaDescribeFn) {
      state.mochaDescribeFn = mochaDescribeFn;
    }

    _run();
    return deferred;
  };



  /**
   * Save specified arguments as the usage of the function we're testing.
   * @return {Deferred} [chainable]
   */
  this.usage = function () {
    state.usage = Array.prototype.slice.call(arguments) || [];
    return deferred;
  };


  /**
   * @param  {Function} fn  [function to test]
   * @return {Deferred} [chainable]
   */
  this.expect = function (fn) {
    state.expectations.push(fn);
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

