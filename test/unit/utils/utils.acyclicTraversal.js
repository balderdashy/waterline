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
      console.log('User.populateDeep("pets") ::\n', 'User.pets :', plan);
      assert(typeof plan === 'object');
    });
  });

});