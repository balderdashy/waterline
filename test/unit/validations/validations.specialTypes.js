var Validator = require('../../../lib/waterline/core/validations'),
    assert = require('assert');

describe('validations', function() {

  describe('special types', function() {
    var validator;

    before(function() {

      var validations = {
        name: { type: 'string' },
        age: { type: 'integer' },
        email: { type: 'email' }
      };

      validator = new Validator();
      validator.initialize(validations);
    });

    it('should validate email type', function(done) {
      validator.validate({ email: 'foobar@gmail.com' }, function (err, validationErrors) {
        if (err) { return done(err); }
        assert(!validationErrors);
        done();
      });
    });

    it('should error if incorrect email is passed', function(done) {
      validator.validate({ email: 'foobar' }, function (err, validationErrors) {
        if (err) { return done(err); }
        assert(validationErrors);
        assert(validationErrors.email);
        done();
      });
    });

  });

});
