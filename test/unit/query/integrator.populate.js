/**
 * Test dependencies
 */
var leftOuterJoin = require('../../../lib/waterline/query/integrator/leftOuterJoin');
var populate = require('../../../lib/waterline/query/integrator/populate');
var fixtures = {
  cache: require('../../support/fixtures/integrator/cache'),
  populateResults: require('../../support/fixtures/integrator/populateResults')
};
var assert = require('assert');
var should = require('should');
var _ = require('lodash');



var CHILD_ATTR_PREFIX = '.';

describe('populate', function() {



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
          childPK: 'user_id',
          fkToChild: CHILD_ATTR_PREFIX + 'user_id'
        });
      });
    });

    it('output should be an array', function() {
      results.should.be.Array;
    });

    it('output should match the expected results', function() {
      results.should.have.lengthOf(expected.length);
      _.all(results, function (row) {
        row.should.have.properties(expected.properties);
      });
      results.should.eql(expected.results);
      // console.log(require('util').inspect(results, {depth: 3}));
    });
  });



  describe('N..M ::', function() {

    var results = _.cloneDeep(fixtures.cache.message);
    var expected = {
      length: 3,
      properties: ['to', 'id', 'subject', 'body', 'from'],
      results: fixtures.populateResults.message___message_to_user___user
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
            leftKey: 'user_id',
            rightKey: 'id',
            right: fixtures.cache.user
          }),
          parentPK: 'id',
          fkToChild: CHILD_ATTR_PREFIX + 'user_id',
          childPK: CHILD_ATTR_PREFIX + 'id'
        });
      });
    });

    it('output should be an array', function() {
      results.should.be.Array;
    });

    it('output should match the expected results', function() {
      results.should.have.lengthOf(expected.length);
      _.all(results, function (row) {
        row.should.have.properties(expected.properties);
      });
      results.should.eql(expected.results);
      // console.log(require('util').inspect(results, {depth: 3}));
    });
  });


});
