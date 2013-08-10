var Core = require('../../../../../lib/waterline/core'),
    assert = require('assert');

describe('Core Schema', function() {

  describe('with model attribute', function() {
    var model;

    before(function() {
      var Collection = Core.extend({
        attributes: {
          customer: {
            model: 'Customer'
          }
        }
      });

      model = new Collection();
    });


    it('should add customer_id attribute to the schema', function() {
      assert(model._schema.schema.customer_id);
      assert(model._schema.schema.customer_id.type === 'integer');
      assert(model._schema.schema.customer_id.foreignKey === true);
    });

  });
});
