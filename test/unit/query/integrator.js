/**
 * Module dependencies
 */
var assert = require('assert');
var _ = require('@sailshq/lodash');
var integrate = require('../../../lib/waterline/utils/integrator');

describe('Integrator ::', function() {

  describe('with no callback', function() {
    it('should throw', function() {
      assert.throws(function() {
        integrate({}, []);
      });
    });
  });

  describe('with otherwise-invalid input', function() {
    it('should return an error', function() {
      assert.throws(function() {
        integrate('foo', 'bar', 'id');
      });
    });
  });

  describe('with valid input', function() {
    describe(':: N..M :: ', function() {
      var fixtures = {
        joins: _.cloneDeep(require('../../support/fixtures/integrator/n..m.joins.js')),
        cache: _.cloneDeep(require('../../support/fixtures/integrator/cache'))
      };

      var results;

      before(function(){
        results = integrate(fixtures.cache, fixtures.joins, 'id');
      });

      it('should be an array', function() {
        assert(_.isArray(results));
      });

      describe(':: populated aliases', function() {
        var aliases = _.keys(_.groupBy(fixtures.joins, 'alias'));

        it('should exist for every alias specified in `joins` (i.e. every `populate()`)', function() {
          // Each result is an object and contains a valid alias
          _.each(results, function(result) {
            assert(_.isObject(result));

            var alias = _.some(aliases, function(alias) {
              return result[alias];
            });

            assert.equal(alias, true);
          });
        });

        it('should contain all aliases in the results', function() {
          var accountedFor = _.all(aliases, function(alias) {
            return results.length === _.pluck(results, alias).length;
          });

          assert.equal(accountedFor, true);
        });

        describe('with no matching child records', function() {
          // Empty the child table in the cache
          before(function() {
            fixtures.cache.message_to_user = [];
          });

          it('should still work in a predictable way (populate an empty array)', function() {
            assert.doesNotThrow(function() {
              integrate(fixtures.cache, fixtures.joins, 'id');
            });
          });
        });
      });
    });

    describe(':: 1..N ::', function() {
      var results;
      var fixtures = {
        joins: _.cloneDeep(require('../../support/fixtures/integrator/n..1.joins.js')),
        cache: _.cloneDeep(require('../../support/fixtures/integrator/cache'))
      };

      before(function(){
        results = integrate(fixtures.cache, fixtures.joins, 'id');
      });

      it('should be an array', function() {
        assert(_.isArray(results));
      });

      describe(':: populated aliases', function() {
        var aliases = _.keys(_.groupBy(fixtures.joins, 'alias'));

        it('should exist for every alias specified in `joins` (i.e. every `populate()`)', function() {
          // Each result is an object and contains a valid alias
          _.each(results, function(result) {
            assert(_.isPlainObject(result));

            var alias = _.some(aliases, function(alias) {
              return result[alias];
            });

            assert.equal(alias, true);
          });

          // All aliases are accounted for in results
          var accountedFor = _.all(aliases, function(alias) {
            return results.length === _.pluck(results, alias).length;
          });

          assert.equal(accountedFor, true);
        });

        it('should have proper number of users in "from"', function() {
          assert.equal(results[0].from.length, 1);
          assert.equal(results[1].from.length, 1);
          assert.equal(results[2].from.length, 0);
        });
      });
    });
  });

  describe(':: multiple populates ::', function() {
    var results;
    var fixtures = {
      joins: _.cloneDeep(require('../../support/fixtures/integrator/multiple.joins.js')),
      cache: _.cloneDeep(require('../../support/fixtures/integrator/cache'))
    };

    before(function(){
      results = integrate(fixtures.cache, fixtures.joins, 'id');
    });

    it('should be an array', function() {
      assert(_.isArray(results));
    });

    describe(':: populated aliases', function() {
      var aliases = _.keys(_.groupBy(fixtures.joins, 'alias'));

      it('should exist for every alias specified in `joins` (i.e. every `populate()`)', function() {
        // Each result is an object and contains a valid alias
        _.each(results, function(result) {
          assert(_.isPlainObject(result));
          var alias = _.some(aliases, function(alias) {
            return result[alias];
          });

          assert.equal(alias, true);
        });

        // All aliases are accounted for in results
        var accountedFor = _.all(aliases, function(alias) {
          return results.length === _.pluck(results, alias).length;
        });

        assert.equal(accountedFor, true);
      });

      it('should contain expected results', function() {
        assert.equal(results[0].from.length, 1);
        assert.equal(results[1].from.length, 1);
        assert.equal(results[2].from.length, 0);
      });
    });
  });
});
