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

    _.each([
      'find',
      'create',
      'destroy'
    ],
    function eachMethod (methodName) {
      test.adapterMethod(methodName)
        .usage({ _simulate: 'traditionalError' })
        .expect(expect.cbHasErr)
        .inspect('Adapter.' + methodName + '() calls: `cb(err)`');

      test.adapterMethod(methodName)
        .usage({ _simulate: 'traditionalSuccess' })
        .expect(expect.cbHasNoErr)
        .inspect('Adapter.' + methodName + '() calls: `cb()`');

      // TODO: test other usages (handlers)
    });


    // "Update" is a special case since it has an extra arg
    test.adapterMethod('update')
      .usage({ _simulate: 'traditionalError' }, {/* dummy values argument */})
      .expect(expect.cbHasErr)
      .inspect('Adapter.update() calls: `cb(err)`');








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
