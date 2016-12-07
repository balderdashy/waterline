/**
 * Module dependencies
 */
var assert = require('assert');
var _ = require('@sailshq/lodash');
var leftOuterJoin = require('../../../lib/waterline/utils/integrator/leftOuterJoin');


describe('Integrator ::', function() {
  describe('LeftOuterJoin ::', function() {
    var fixtures = {
      cache: require('../../support/fixtures/integrator/cache'),
      joinResults: require('../../support/fixtures/integrator/joinResults')
    };

    describe('with invalid input', function() {
      it('should throw if options are invalid', function() {
        assert.throws(function() {
          leftOuterJoin({
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
          leftOuterJoin('something completely ridiculous');
        });
      });

      it('should throw if options are missing', function() {
        assert.throws(function() {
          leftOuterJoin({
            left: [],
            right: [],
            leftKey: 'foo'
          });
        });
        assert.throws(function() {
          leftOuterJoin({
            left: [],
            right: [],
            rightKey: 'foo'
          });
        });
        assert.throws(function() {
          leftOuterJoin({
            right: [],
            rightKey: 'foo'
          });
        });
      });
    });

    describe('when run with valid input', function() {
      var results;
      var expected = {
        'results.length': 4,
        properties: [
          'id', 'subject', 'body', 'from',
          // Joined properties won't always exist since this is an outer join.
          /* 'user_id','email' */
        ],
        results: fixtures.joinResults.message___message_to_user
      };

      it('should not throw', function() {
        assert.doesNotThrow(function() {
          results = leftOuterJoin({
            left: fixtures.cache.message,
            right: fixtures.cache.message_to_user,
            leftKey: 'id',
            rightKey: 'message_id'
          });
        });
      });

      it('should output an array', function() {
        assert(_.isArray(results));
      });

      it('should match the expected results', function() {
        // Check that expected # of results exist.
        assert.equal(results.length, expected['results.length']);

        // Check that results are exactly correct.
        assert.deepEqual(results, expected.results);
      });

      describe('when run again, using previous results as left side', function() {
        var results_2;
        var expected = {
          'results_2.length': 4,
          properties: [
            // Joined properties (user_id, email) won't always exist since this is an outer join.
            'id', 'subject', 'body', 'from',
          ],
          results: fixtures.joinResults.message___message_to_user___user
        };

        it('should not throw', function() {
          assert.doesNotThrow(function() {
            results_2 = leftOuterJoin({
              left: results,
              right: fixtures.cache.user,
              leftKey: '.user_id',
              rightKey: 'id',
              childNamespace: '..'
            });
          });
        });

        it('should be an array', function() {
          assert(_.isArray(results_2));
        });

        it('should match the expected results', function() {
          // Check that it has the correct # of results
          assert.equal(results_2.length, expected['results_2.length']);

          // Check that it has properties
          _.each(results_2, function(result) {
            _.each(expected.properties, function(property) {
              assert(_.has(result, property));
            });
          });

          // Check that results are exactly correct (deep equality).
          assert.deepEqual(results_2, expected.results);
        });
      });
    });

    describe('with no matching child rows', function() {
      var results;

      // Empty out the child table in cache
      before(function() {
        fixtures.cache.message_to_user = [];
      });

      it('should not throw', function() {
        assert.doesNotThrow(function() {
          results = leftOuterJoin({
            left: fixtures.cache.message,
            right: fixtures.cache.message_to_user,
            leftKey: 'id',
            rightKey: 'message_id'
          });
        });
      });

      it('should still return all the items from parent table', function() {
        assert(_.isArray(results));
        assert.equal(results.length, fixtures.cache.message.length);
      });
    });
  });
});
