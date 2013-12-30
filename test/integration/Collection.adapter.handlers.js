var Waterline = require('../../lib/waterline'),
    adapter = require('./fixtures/adapter.withHandlers.fixture'),
    assert = require('assert'),
    should = require('should'),
    util = require('util'),
    _ = require('lodash');


// Helpers
//////////////////////////////////////////////////////////////////////////////
var bootstrap = function(done) {
  var self = this;

  var Model = Waterline.Collection.extend({
    attributes: {},
    adapter: 'barbaz',
    tableName: 'tests'
  });

  var waterline = new Waterline();
  waterline.loadCollection(Model);

  waterline.initialize({ adapters: { barbaz: adapter }}, function(err, colls) {
    if(err) return done(err);
    SomeCollection = colls.tests;
    self.SomeCollection = SomeCollection;
    done();
  });
};



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

    var testMsg =
      typeof arguments[0] === 'string' ?
      arguments[0] : '';
    var mochaDescribeFn = arguments[1] || function () { it('should not crash', function () {}); };

    if (typeof arguments[0] !== 'string') mochaDescribeFn = arguments[0];


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



var expect = {
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





var test = {

  // Deferred object allows chained usage, i.e.:
  // adapterMethod(foo).inspect(mochaDescribeFn)
  adapterMethod: function (nameOfMethod) {
    return new Deferred({
      nameOfMethod: nameOfMethod
    });
  }
};
//////////////////////////////////////////////////////////////////////////////


























describe('Waterline Collection', function() {

  describe('error negotiation & handlers', function() {

    before(bootstrap);



    describe('Vocabulary methods upgrade callbacks to handlers', function () {

      _.each([
        'find',
        'create',
        'destroy'
      ],
      function eachMethod (methodName) {
        test.adapterMethod(methodName)
          .options({ _simulate: 'traditionalError' })
          .expect(expect.cbHasErr)
          .inspect('Adapter method (' + methodName + ') calls: `cb(err)`');

        test.adapterMethod(methodName)
          .options({ _simulate: 'traditionalSuccess' })
          .expect(expect.cbHasNoErr)
          .inspect('Adapter method (' + methodName + ') calls: `cb()`');

        // TODO: test other usages (handlers)
      });


      // "Update" is a special case
      // TODO: test update

    });








    // Methods of dummy custom adapter methods do exactly what you would expect
    // based on their names.  Usage signature is: `Foo.bar(options, callback)`
    describe('Custom methods still work', function () {

      it('should have the expected methods for use in our test', function () {
        this.SomeCollection.traditionalError.should.be.a.Function;
        this.SomeCollection.traditionalSuccess.should.be.a.Function;
      });

      test.adapterMethod('traditionalError')
        .expect(expect.cbHasErr)
        .inspect();

      test.adapterMethod('traditionalSuccess')
        .expect(expect.cbHasNoErr)
        .inspect();
    });

  });
});
