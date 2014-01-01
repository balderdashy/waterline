var Waterline = require('../../../../../lib/waterline'),
    assert = require('assert');

describe('Core Transformations', function() {

  describe('associations', function() {

    describe('belongs to key', function() {
      var fooCollection;

      before(function(done) {
        var collections = {},
            waterline = new Waterline();

        collections.customer = Waterline.Collection.extend({
          tableName: 'customer',
          attributes: {
            uuid: {
              type: 'string',
              primaryKey: true
            }
          }
        });

        collections.foo = Waterline.Collection.extend({
          tableName: 'foo',
          attributes: {
            customer: {
              model: 'customer'
            }
          }
        });

        waterline.loadCollection(collections.customer);
        waterline.loadCollection(collections.foo);

        waterline.initialize({ adapters: { foo: {}}}, function(err, collections) {
          if(err) return done(err);
          fooCollection = collections.foo;
          done();
        });
      });


      /**
       * Ensure you can access foo.customer and have it transformed to foo.customer_uuid before
       * being sent to an adapter.
       */

      it('should have a core transformation for the customer model key on the foo table', function() {
        var transformations = fooCollection._transformer._transformations;
        assert(transformations.customer);
        assert(transformations.customer === 'customer_customer_uuid');
      });

    });
  });
});
