var Validator = require('../../../lib/waterline/core/validations'),
    assert = require('assert');

describe('validations', function() {

  describe('types', function() {
    var validator;

    before(function() {

      var validations = {
        name: { type: 'string' },
        age: { type: 'integer' }
      };

      validator = new Validator();
      validator.initialize(validations);
    });

    it('should validate string type', function(done) {
      validator.validate({ name: 'foo bar' }, function(errors) {
        assert(!errors);
        done();
      });
    });

    it('should validate integer type', function(done) {
      validator.validate({ age: 27 }, function(errors) {
        assert(!errors);
        done();
      });
    });

    it('should error if string passed to integer type', function(done) {
      validator.validate({ age: 'foo bar' }, function(errors) {
        assert(errors.ValidationError);
        assert(errors.ValidationError.age);
        done();
      });
    });

  });

});
