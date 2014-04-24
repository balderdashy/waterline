/**
 * Module dependencies
 */
var innerJoin = require('../../../lib/waterline/query/integrator/innerJoin');
var assert = require('assert');
var should = require('should');
var _ = require('lodash');


describe('innerJoin', function() {

  // Clear the require cache
  Object.keys(require.cache).forEach(function (modulePath) {
    delete require.cache[modulePath];
  });

  var fixtures = {
    cache: require('../../support/fixtures/integrator/cache'),
    joinResults: require('../../support/fixtures/integrator/joinResults')
  };

  describe('with invalid input', function() {

    it('should throw if options are invalid', function() {
      assert.throws(function() {
        innerJoin({
          left: 238523523952358,
          right: 'something invalid',
          leftKey: {
            something: 'invalid'
          },
          rightKey: {
            wtf: new Date()
          },
        });
      });

      assert.throws(function() {
        innerJoin('something completely ridiculous');
      });
    });

    it('should throw if options are missing', function() {
      assert.throws(function() {
        innerJoin({
          left: [],
          right: [],
          leftKey: 'foo'
        });
      });
      assert.throws(function() {
        innerJoin({
          left: [],
          right: [],
          rightKey: 'foo'
        });
      });
      assert.throws(function() {
        innerJoin({
          right: [],
          rightKey: 'foo'
        });
      });
    });
  });


  describe('when run with valid input', function() {

    var results;
    var expected = {
      'results.length': 2,
      properties: [
        'id', 'subject', 'body', 'from',
        // Joined properties WILL always exist since this is an outer join.
        'user_id'
      ],
      results: fixtures.joinResults.___inner___message___message_to_user
    };

    it('should not throw', function() {
      assert.doesNotThrow(function() {
        results = innerJoin({
          left: fixtures.cache.message,
          right: fixtures.cache.message_to_user,
          leftKey: 'id',
          rightKey: 'message_id'
        });
      });
    });

    it('output should be an array', function() {
      results.should.be.Array;
    });

    it('output should match the expected results', function() {

      // Check that expected # of results exist.
      results.should.have.lengthOf(expected['results.length']);

      // Check that results are exactly correct.
      results.should.eql(expected.results);
    });

  });

});
