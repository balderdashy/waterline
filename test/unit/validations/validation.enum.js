var Validator = require('../../../lib/waterline/core/validations'),
    assert = require('assert');

describe('validations', function() {

  describe('enum string', function() {
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
        assert(errors);
        assert(errors.sex);
        assert(errors.sex[0].rule === 'in');
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

  describe('enum integer', function() {
    var validator;

    before(function() {

      var validations = {
        sex: {
          type: 'integer',
          in: {'male':0, 'female':1}
        }
      };

      validator = new Validator();
      validator.initialize(validations);
    });

    it('should error if invalid enum is set', function(done) {
      validator.validate({ sex: 'other' }, function(errors) {
        assert(errors);
        assert(errors.sex);
        assert(errors.sex[0].rule === 'in');
        done();
      });
    });

    it.only('should NOT error if valid enum is set', function(done) {
      validator.validate({ sex: 'male' }, function(errors) {
        assert(!errors);
        done();
      });
    });
  });

});
