var assert = require('assert'),
    normalize = require('../../../lib/waterline/utils/normalize');

describe("Normalize utility", function() {

  describe(".criteria()", function() {

    describe("sort", function() {
      it("should default to asc", function() {
        var criteria = normalize.criteria({ sort: "name" });

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

        assert(criteria.sort.name === -1);
      });
    });

  });

});