/**
 * Test dependencies
 */
var assert = require('assert');
var _ = require('@sailshq/lodash');
var leftOuterJoin = require('../../../lib/waterline/utils/integrator/leftOuterJoin');
var populate = require('../../../lib/waterline/utils/integrator/populate');

describe('Integrator ::', function() {
  describe('Populate ::', function() {
    var fixtures = {
      cache: _.cloneDeep(require('../../support/fixtures/integrator/cache')),
      populateResults: _.cloneDeep(require('../../support/fixtures/integrator/populateResults'))
    };

    describe('N..1 ::', function() {
      var results = _.cloneDeep(fixtures.cache.message);
      var expected = {
        length: 3,
        properties: ['to', 'id', 'subject', 'body', 'from'],
        results: fixtures.populateResults.message___message_to_user
      };

      it('should not throw', function() {
        assert.doesNotThrow(function() {
          populate({
            parentRows: results,
            alias: 'to',
            childRows: leftOuterJoin({
              left: fixtures.cache.message,
              right: fixtures.cache.message_to_user,
              leftKey: 'id',
              rightKey: 'message_id'
            }),
            parentPK: 'id',
            childPK: '.' + 'user_id',
            fkToChild: '.' + 'user_id'
          });
        });
      });

      it('output should be an array', function() {
        assert(_.isArray(results));
      });

      it('output should match the expected results', function() {
        assert.equal(results.length, expected.length);

        _.each(results, function(row) {
          _.each(expected.properties, function(prop) {
            assert(_.has(row, prop));
          });
        });

        assert.deepEqual(results, expected.results);
      });
    });

    describe('N..M ::', function() {
      var results = _.cloneDeep(fixtures.cache.message);
      var expected = {
        length: 3,
        properties: ['to', 'id', 'subject', 'body', 'from'],
        results: _.cloneDeep(fixtures.populateResults.message___message_to_user___user)
      };

      it('should not throw', function() {
        assert.doesNotThrow(function() {
          populate({
            parentRows: results,
            alias: 'to',
            childRows: leftOuterJoin({
              left: leftOuterJoin({
                left: fixtures.cache.message,
                right: fixtures.cache.message_to_user,
                leftKey: 'id',
                rightKey: 'message_id'
              }),
              leftKey: '.user_id',
              rightKey: 'id',
              right: fixtures.cache.user,
              childNamespace: '..'
            }),
            parentPK: 'id',
            fkToChild: '.user_id',
            childPK: '..id'
          });
        });
      });

      it('output should be an array', function() {
        assert(_.isArray(results));
      });

      it('output should match the expected results', function() {
        assert.equal(results.length, expected.length);

        _.each(results, function(row) {
          _.each(expected.properties, function(prop) {
            assert(_.has(row, prop));
          });
        });

        assert.deepEqual(results, expected.results);
      });
    });
  });
});
