var assert = require('assert'),
    normalize = require('../../../lib/waterline/utils/normalize'),
    units = normalize.NotExposed;
var stform = require('../../../lib/waterline/utils/normalize').NotExposed;

describe('Normalize utility', function() {

  describe('.criteria()', function() {

    describe('default checks', function() {
      it('should return false if given false', function() {
        var criteria = normalize.criteria(false);
        assert(criteria === false);
      });

      it('should return arrays to the calling method', function() {
        var criteria = [1,2,3];
        var result = normalize.criteria(criteria);
        assert.deepEqual(criteria, result);
      });

      it('should change undefined values to null', function() {
        var undefinedValue;
        var criteria = {id: undefinedValue};
        var result = normalize.criteria(criteria);
        assert.deepEqual({where: {id:null}}, result);
      });

      it('should wrap primitives with an id tag', function() {
        var primitives = [1,-17,'idtag'];
        for (var i = 0; i < primitives.length; i++) {
          var prop = primitives[i];
          var result = normalize.criteria(prop);
          assert.deepEqual({where: {id: prop}}, result);
        }
      });

      it('should not add a where clause if already present', function() {
        var criteria = {where: {id: 4}};
        var result = normalize.criteria(criteria);
        assert.deepEqual(criteria, result);
      });
    });

    describe('Where Clause Attribute Transformation', function() {
      var process = units.ProcessWhereClauseAttributes;

      it('should recognize a sort clause', function() {
        var criteria = {where: {id: 3, sort: 'ASC'}};
        var expected = {where: {id: 3}, sort: 'ASC'};
        process(criteria);
        assert.deepEqual(expected, criteria);
      });

      it('should handle multiple clauses in the where clause', function() {
        var criteria = {where: {skip: 5, sort: 'ASC', limit: 7, id:4}};
        var expected = {where: {id: 4}, skip: 5, sort: 'ASC', limit: 7};
        process(criteria);
        assert.deepEqual(expected, criteria);
      });

      it('should make empty where clauses null', function() {
        var criteria = {where: {skip: 5, sort: 'ASC'}};
        var expected = {where: null, skip: 5, sort: 'ASC'};
        process(criteria);
        assert.deepEqual(expected, criteria);
      });
    });

    describe('Skip and Limit Attribute Validator', function() {
      var validate = units.ValidateLimitAndSkipParameters;

      it('skip should turn negative numbers to zero', function() {
        var criteria = {skip: -4};
        var expected = {skip: 0};
        validate(criteria);
        assert.deepEqual(expected, criteria);
      });

      it('limit should turn negative numbers to zero', function() {
        var criteria = {limit: -63823};
        var expected = {limit: 0};
        validate(criteria);
        assert.deepEqual(expected, criteria);
      });

      it('skip should parse strings', function() {
        var criteria = {skip: '4'};
        var expected = {skip: 4};
        validate(criteria);
        assert.deepEqual(expected, criteria);
      });

      it('limit should parse strings', function() {
        var criteria = {limit: '42'};
        var expected = {limit: 42};
        validate(criteria);
        assert.deepEqual(expected, criteria);
      });
    });

    describe('sort', function() {
      it('should default to asc', function() {
        var criteria = normalize.criteria({ sort: 'name' });

        assert(criteria.sort.name === 1);
      });

      it('should throw error on invalid order', function() {
        var error;

        try {
          normalize.criteria({ sort: 'name up' });
        } catch(e) {
          error = e;
        }

        assert(typeof error !== 'undefined');
      });

      it('should properly normalize valid sort', function() {
        var criteria = normalize.criteria({ sort: 'name desc' });

        assert(criteria.sort.name === -1);
      });

      it('should properly normalize valid sort with upper case', function() {
        var criteria = normalize.criteria({ sort: 'name DESC' });

        assert(criteria.sort.name === -1);
      });
    });

    describe('sort object', function() {
      it('should throw error on invalid order', function() {
        var error;

        try {
          normalize.criteria({ sort: { name: 'up' } });
        } catch(e) {
          error = e;
        }

        assert(typeof error !== 'undefined');
      });

      it('should properly normalize valid sort', function() {
        var criteria = normalize.criteria({ sort: { name: 'asc' } });

        assert(criteria.sort.name === 1);
      });

      it('should properly normalize valid sort with upper case', function() {
        var criteria = normalize.criteria({ sort: { name: 'DESC' } });
        assert(criteria.sort.name === -1);
      });
    });

  });

});
