var Transformer = require('../../../../lib/waterline/core/transformations'),
    assert = require('assert');

describe('Core Transformations', function() {

  describe('group', function() {
    var transformer;

    before(function() {
      var attributes = {
        cars: {
          collection: 'Car'
        },

        houses: {
          collection: 'House'
        }
      };

      var associations = {
        models: {},
        collections: {
          cars: { collection: 'Car' },
          houses: { collection: 'House' }
        }
      };

      transformer = new Transformer(attributes, associations);
    });

    it('should group records together for collection attributes', function() {

      var results = [
        { id: 1, car: { id: 1, color: 'blue' }},
        { id: 1, car: { id: 2, color: 'black' }},
        { id: 1, house: { id: 1, stories: 1 }},
        { id: 1, house: { id: 2, stories: 2 }},
      ];

      var values = transformer.group(results);

      assert(Array.isArray(values.cars));
      assert(Array.isArray(values.houses));

      assert(values.cars.length === 2);
      assert(values.houses.length === 2);

      assert(values.cars[0].color === 'blue');
      assert(values.cars[1].color === 'black');
      assert(values.houses[0].stories === 1);
      assert(values.houses[1].stories === 2);
    });

  });
});
