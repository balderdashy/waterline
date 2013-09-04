var Validator = require('../../../lib/waterline/core/validations'),
    assert = require('assert');

describe('validations', function() {

  describe('enum', function() {
    var validator;

    before(function() {

      var validations = {
        sex: {
          type: 'string',
          in: ['male', 'female']
        }
      };

      validator = new Validator();
      validator.initialize(validations);
    });

    it('should error if invalid enum is set', function(done) {
      validator.validate({ sex: 'other' }, function(errors) {
        assert(errors.ValidationError);
        assert(errors.ValidationError.sex);
        assert(errors.ValidationError.sex[0].rule === 'in');
        done();
      });
    });

    it('should NOT error if valid enum is set', function(done) {
      validator.validate({ sex: 'male' }, function(errors) {
        assert(!errors);
        done();
      });
    });
  });

});
