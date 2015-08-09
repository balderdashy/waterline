var assert = require('assert'),
    normalize = require('../../../lib/waterline/utils/normalize'),
    units = normalize.NotExposed;

describe("Normalize utility", function() {

  describe(".criteria()", function() {

    describe("default checks", function() {
      it("should return false if given false", function() {
        var criteria = normalize.criteria(false);
        assert(criteria === false);
      });

      it("should return arrays to the calling method", function() {
        var criteria = [1,2,3];
        var result = normalize.criteria(criteria);
        assert.deepEqual(criteria, result);
      });

      it("should change undefined values to null", function() {
        var undefinedValue;
        var criteria = {id: undefinedValue};
        var result = normalize.criteria(criteria);
        assert.deepEqual({where: {id:null}}, result);
      });

      it("should wrap primitives with an id tag", function() {
        var primitives = [1,-17,"idtag"];
        for (var i = 0; i < primitives.length; i++) {
          var prop = primitives[i];
          var result = normalize.criteria(prop);
          assert.deepEqual({where: {id: prop}}, result);
        }
      });

      it("should not add a where clause if already present", function() {
        var criteria = {where: {id: 4}};
        var result = normalize.criteria(criteria);
        assert.deepEqual(criteria, result);
      });
    });

    // describe("Where Clause Attribute Transformation", function() {

    // })

    describe("sort", function() {
      it("should default to asc", function() {
        var criteria = normalize.criteria({ sort: "name" });
        console.log(criteria);

        assert(criteria.sort.name === 1);
      });

      it("should throw error on invalid order", function() {
        var error;

        try {
          normalize.criteria({ sort: "name up" });
        } catch(e) {
          error = e;
        }

        assert(typeof error !== 'undefined');
      });

      it("should properly normalize valid sort", function() {
        var criteria = normalize.criteria({ sort: "name desc" });
        console.log(criteria);

        assert(criteria.sort.name === -1);
      });

      it("should properly normalize valid sort with upper case", function() {
        var criteria = normalize.criteria({ sort: "name DESC" });
        console.log(criteria);
        assert(criteria.sort.name === -1);
      });
    });

    describe("sort object", function() {
      it("should throw error on invalid order", function() {
        var error;

        try {
          normalize.criteria({ sort: { name: "up" } });
        } catch(e) {
          error = e;
        }

        assert(typeof error !== 'undefined');
      });

      it("should properly normalize valid sort", function() {
        var criteria = normalize.criteria({ sort: { name: "asc" } });
        console.log(criteria);
        assert(criteria.sort.name === 1);
      });

      it("should properly normalize valid sort with upper case", function() {
        var criteria = normalize.criteria({ sort: { name: "DESC" } });
        assert(criteria.sort.name === -1);
      });
    });

  });

});
