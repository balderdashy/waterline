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
      validator.validate({ email: 'foobar@gmail.com' }, function(errors) {
        assert(!errors);
        done();
      });
    });

    it('should error if incorrect email is passed', function(done) {
      validator.validate({ email: 'foobar' }, function(errors) {
        assert(errors.ValidationError);
        assert(errors.ValidationError.email);
        done();
      });
    });

  });

});
