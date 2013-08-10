var assert = require('assert'),
    CustomerFixture = require('../../support/fixtures/associations/customer.fixture'),
    PaymentFixture = require('../../support/fixtures/associations/payment.fixture');

describe('Associations', function() {

  describe('one-to-many', function() {
    var models = {};

    before(function(done) {

      // Stub out a find method
      var adapterDef = {
        find: function(col, criteria, cb) {
          return cb(null, [{ foo: 'bar', payment_id: 1 }]);
        }
      };

      new PaymentFixture({ adapters: { test: adapterDef }}, function(err, coll) {
        if(err) return done(err);
        models.Payment = coll;

        new CustomerFixture({ adapters: { test: adapterDef }}, function(err, coll) {
          if(err) return done(err);
          models.Customer = coll;
          done();
        });
      });
    });


    it('should add association methods to a customer payments attribute', function(done) {
      models.Customer.findOne(1).exec(function(err, customer) {
        assert(!err);
        assert(typeof customer.payments === 'object');
        assert(typeof customer.payments.add === 'function');
        assert(typeof customer.payments.remove === 'function');
        done();
      });
    });

  });
});
