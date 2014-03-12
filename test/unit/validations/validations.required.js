var Validator = require('../../../lib/waterline/core/validations'),
    assert = require('assert');

describe('validations', function() {

  describe('required', function() {
    var validator;

    before(function() {

      var validations = {
        name: {
          type: 'string',
          required: true
        },
        employed: {
          type: 'boolean',
          required: true
        },
        age: { type: 'integer' }
      };

      validator = new Validator();
      validator.initialize(validations);
    });

    it('should error if no value is set for required string field', function(done) {
      validator.validate({ name: '', employed: true, age: 27 }, function(errors) {
        assert(errors.ValidationError);
        assert(errors.ValidationError.name);
        assert(errors.ValidationError.name[0].rule === 'required');
        done();
      });
    });

    it('should error if no value is set for required boolean field', function(done) {
      validator.validate({ name: 'Frederick P. Frederickson', age: 27 }, function(errors) {
        assert(errors.ValidationError);
        assert(errors.ValidationError.employed);
        assert(errors.ValidationError.employed[0].rule === 'boolean');
        assert(errors.ValidationError.employed[1].rule === 'required');
        done();
      });
    });

    it('should NOT error if all required values are set', function(done) {
      validator.validate({ name: 'Foo Bar', employed: true, age: 27 }, function(errors) {
        assert(!errors);
        done();
      });
    });

  });

});
