/**
 * Module dependencies
 */
var assert = require('assert'),
    should = require('should'),
    util = require('util'),
    _ = require('lodash');


// Helpers/suites
var bootstrapCollection = require('./helpers/Collection.bootstrap');
var test = {
  adapterMethod: require('./helpers/adapterMethod.helper.js')
};
var expect = require('./helpers/cb.helper.js');




describe('Waterline Collection', function() {

  describe(':: error negotiation & handlers ::', function() {

    // Bootstrap a collection
    before( bootstrapCollection({
      adapter: require('./fixtures/adapter.withHandlers.fixture')
    }) );



    // Vocabulary methods should upgrade callbacks to handlers

    _.each({
      find: {},
      create: {},
      update: { extraArgs: [{ /* dummy values argument */ }] },
      destroy: {}
    },
    function eachMethod (testOpts, methodName) {

      // We simulate different types of cb/handler usage by sneaking a property
      // into the first argument.
      var SIMULATE = {
        CB: {
          'err': [{ _simulate: 'traditionalError' }],
          '': [{ _simulate: 'traditionalSuccess' }]
        },
        ERROR: {
          'err': [{ _simulate: 'error' }],
          '': [{ _simulate: 'anonError' }]
        },
        INVALID: {
          'err': [{ _simulate: 'invalid' }],
          '': [{ _simulate: 'anonInvalid' }]
        },
        SUCCESS: {
          'err': [{ _simulate: 'success' }],
          '': [{ _simulate: 'anonSuccess' }]
        }
      };
      function _mixinExtraArgs (firstArg) {return firstArg.concat(testOpts.extraArgs || []);}
      SIMULATE = _.mapValues(SIMULATE, function (group) { return _.mapValues(group, _mixinExtraArgs); });


      // Now test the different usages:
      // 

      // Adapter invokes callback
      test.adapterMethod(methodName)
        .usage.apply(test, SIMULATE.CB['err'])
        .expect(expect.cbHasErr)
        .inspect();//.inspect('Adapter.' + methodName + '() calls: `cb(err)`');
      test.adapterMethod(methodName)
        .usage.apply(test, SIMULATE.CB[''])
        .expect(expect.cbHasNoErr)
        .inspect();//.inspect('Adapter.' + methodName + '() calls: `cb()`');

      // Adapter invokes error handler
      test.adapterMethod(methodName)
      .usage.apply(test, SIMULATE.ERROR['err'])
      .expect(expect.cbHasErr)
      .inspect();
      test.adapterMethod(methodName)
      .usage.apply(test, SIMULATE.ERROR[''])
      .expect(expect.cbHasErr)
      .inspect();

      // Adapter invokes invalid handler
      test.adapterMethod(methodName)
      .usage.apply(test, SIMULATE.INVALID['err'])
      .expect(expect.cbHasErr)
      .inspect();
      test.adapterMethod(methodName)
      .usage.apply(test, SIMULATE.INVALID[''])
      .expect(expect.cbHasErr)
      .inspect();

      // Adapter invokes success handler
      test.adapterMethod(methodName)
      .usage.apply(test, SIMULATE.SUCCESS['err'])
      .expect(expect.cbHasNoErr)
      .inspect();
      test.adapterMethod(methodName)
      .usage.apply(test, SIMULATE.SUCCESS[''])
      .expect(expect.cbHasNoErr)
      .inspect();

    });








    // Methods of dummy custom adapter methods do exactly what you would expect
    // based on their names.  Usage signature is: `Foo.bar(options, callback)`
    

    // Custom methods should still work
    it('should have the expected methods for use in our test', function () {
      this.SomeCollection.traditionalError.should.be.a.Function;
      this.SomeCollection.traditionalSuccess.should.be.a.Function;
    });

    test.adapterMethod('traditionalError')
      .usage({/* dummy options argument */})
      .expect(expect.cbHasErr)
      .inspect();

    test.adapterMethod('traditionalSuccess')
      .usage({/* dummy options argument */})
      .expect(expect.cbHasNoErr)
      .inspect();
  });

});




