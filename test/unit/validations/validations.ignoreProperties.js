var Validator = require('../../../lib/waterline/core/validations'),
  assert = require('assert');

describe('validations', function() {

  describe('special types', function() {
    var validator;

    before(function() {

      var validations = {
        name: {
          type: 'string'
        },
        email: {
          type: 'email',
          special: true
        },
        cousins: {
          collection: 'related',
          via: 'property',
          async: true
        }
      };

      var defaults = {
        ignoreProperties: ['async', 'special']
      };

      validator = new Validator();
      validator.initialize(validations);

      customValidator = new Validator();
      customValidator.initialize(validations, {}, defaults);
    });

    it('custom validator should validate email type', function(done) {
      customValidator.validate({
        email: 'foobar@gmail.com'
      }, function(err, errors) {
        if (err) {
          return done(err);
        }
        assert(!errors);
        done();
      });
    });

    it('custom validator should validate collection type', function(done) {
      customValidator.validate({
        cousins: []
      }, function(err, errors) {
        if (err) {
          return done(err);
        }
        assert(!errors);
        done();
      });
    });

    it('standard validator should error with unrecognized properties', function(done) {
      validator.validate({
        email: 'foobar@gmail.com'
      }, function(err, errors) {
        if (err) {
          if ((err instanceof Error) && /Unknown rule: special/im.test(err)) {
            return done();
          }
          else {
            return done(err);
          }
        }
        return done(new Error('Expected fatal error due to unknown "special" validation rule.'));
      });
    });//</it>

    it('standard validator should error with unrecognized properties in an association', function(done) {
      validator.validate({
        cousins: []
      }, function(err, errors) {
        if (err) {
          if ((err instanceof Error) && /Unknown rule: async/im.test(err)) {
            return done();
          }
          else {
            return done(err);
          }
        }
        return done(new Error('Expected fatal error due to unknown "async" validation rule.'));
      });
    });//</it>

  });
});
