var assert = require('assert'),
    traverse = require('../../../lib/waterline/utils/acyclicTraversal');

describe('utils/acyclicTraversal', function() {

  describe('schema', function() {

    var schema = {
      user: {
        attributes: {
          name: 'string',
          age: 'integer',
          pets: {
            collection: 'pet',
            via: 'owner'
          },
          formerPets: {
            collection: 'user',
            via: 'formerOwners'
          }
        }
      },
      pet: {
        attributes: {
          name: 'string',
          breed: 'string',
          owner: {
            model: 'user'
          },
          formerOwners: {
            collection: 'user',
            via: 'formerPets'
          }
        }
      }
    };

    it('should return a .populate() plan', function() {
      var plan = traverse(schema, 'user', 'pets');
      assert(typeof plan === 'object');
    });

    it('should include distinct associations (i.e. `formerOwners`)', function () {
      var plan = traverse(schema, 'user', 'pets');
      assert(typeof plan.formerOwners === 'object');
    });
    it('should NOT include already-traversed back-references (i.e. `owner`)', function () {
      var plan = traverse(schema, 'user', 'pets');
      assert(typeof plan.owner === 'undefined');
    });
    it('should NOT include already-traversed associations (i.e. `pets`)', function () {
      var plan = traverse(schema, 'user', 'pets');
      assert(typeof plan.formerOwners.pets === 'undefined');
    });
  });

});
