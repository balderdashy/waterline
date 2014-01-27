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
    before(bootstrapCollection({
      adapter: require('./fixtures/adapter.withHandlers.fixture')
    }));

    // Vocabulary methods should upgrade callbacks to handlers

    var dummyValues = {};
    _.each({
        find: {},
        create: {},
        update: {
          extraArgs: [dummyValues]
        },
        destroy: {}
      },
      function eachMethod(testOpts, methodName) {

        // We simulate different types of cb/handler usage by sneaking a property
        // into the first argument.
        var SIMULATE = {
          CB: {
            'err': [{
              _simulate: 'traditionalError'
            }],
            '': [{
              _simulate: 'traditionalSuccess'
            }]
          },
          ERROR: {
            'err': [{
              _simulate: 'error'
            }],
            '': [{
              _simulate: 'anonError'
            }]
          },
          INVALID: {
            'err': [{
              _simulate: 'invalid'
            }],
            '': [{
              _simulate: 'anonInvalid'
            }]
          },
          SUCCESS: {
            'err': [{
              _simulate: 'success'
            }],
            '': [{
              _simulate: 'anonSuccess'
            }]
          }
        };

        function _mixinExtraArgs(firstArg) {
          return firstArg.concat(testOpts.extraArgs || []);
        }
        SIMULATE = _.mapValues(SIMULATE, function(group) {
          return _.mapValues(group, _mixinExtraArgs);
        });

        // Test all the different usages on the adapter side:
        function testAdapterUsage(style) {

          // Adapter invokes callback
          test.adapterMethod(methodName)
            .usage.apply(test, SIMULATE.CB['err'])
            .expect(style === 'cb' ? expect.cbHasErr : expect.errorHandler)
            .callbackStyle(style)
            .inspect();
          test.adapterMethod(methodName)
            .usage.apply(test, SIMULATE.CB[''])
            .expect(style === 'cb' ? expect.cbHasNoErr : expect.successHandler)
            .callbackStyle(style)
            .inspect();

          // Adapter invokes error handler
          test.adapterMethod(methodName)
            .usage.apply(test, SIMULATE.ERROR['err'])
            .expect(style === 'cb' ? expect.cbHasErr : expect.errorHandler)
            .callbackStyle(style)
            .inspect();
          test.adapterMethod(methodName)
            .usage.apply(test, SIMULATE.ERROR[''])
            .expect(style === 'cb' ? expect.cbHasErr : expect.errorHandler)
            .callbackStyle(style)
            .inspect();

          // Adapter invokes invalid handler
          test.adapterMethod(methodName)
            .usage.apply(test, SIMULATE.INVALID['err'])
            .expect(style === 'cb' ? expect.cbHasErr : expect.errorHandler)
            .callbackStyle(style)
            .inspect();
          test.adapterMethod(methodName)
            .usage.apply(test, SIMULATE.INVALID[''])
            .expect(style === 'cb' ? expect.cbHasErr : expect.errorHandler)
            .callbackStyle(style)
            .inspect();

          // Adapter invokes success handler
          test.adapterMethod(methodName)
            .usage.apply(test, SIMULATE.SUCCESS['err'])
            .expect(style === 'cb' ? expect.cbHasNoErr : expect.successHandler)
            .callbackStyle(style)
            .inspect();
          test.adapterMethod(methodName)
            .usage.apply(test, SIMULATE.SUCCESS[''])
            .expect(style === 'cb' ? expect.cbHasNoErr : expect.successHandler)
            .callbackStyle(style)
            .inspect();
        }

        // Test the different usages on the app side:
        testAdapterUsage('cb');
        testAdapterUsage('handlers');

      });



    // Methods of dummy custom adapter methods do exactly what you would expect
    // based on their names.  Usage signature is: `Foo.bar(options, callback)`

    describe('custom methods', function() {

      // Custom methods should still work
      it('should have the expected methods for use in our test', function() {
        this.SomeCollection.traditionalError.should.be.a.Function;
        this.SomeCollection.traditionalSuccess.should.be.a.Function;
      });

      var dummyOptions = {};
      test.adapterMethod('traditionalError')
        .usage(dummyOptions)
        .expect(expect.cbHasErr)
        .callbackStyle('cb')
        .inspect();

      test.adapterMethod('traditionalSuccess')
        .usage(dummyOptions)
        .expect(expect.cbHasNoErr)
        .callbackStyle('cb')
        .inspect();
    });
  });

});
