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
        age: { type: 'integer' }
      };

      validator = new Validator();
      validator.initialize(validations);
    });

    it('should error if no value is set', function(done) {
      validator.validate({ name: ' ', age: 27 }, function(errors) {
        assert(errors.ValidationError);
        assert(errors.ValidationError.name);
        assert(errors.ValidationError.name[0].rule === 'required');
        done();
      });
    });

    it('should NOT error if value is set', function(done) {
      validator.validate({ name: 'Foo Bar', age: 27 }, function(errors) {
        assert(!errors);
        done();
      });
    });

  });

});
