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
        age: { type: 'integer' },
        email: {
          type: 'email',
          required: false
        }
      };

      validator = new Validator();
      validator.initialize(validations);
    });

    it('should error if no value is set for required string field', function(done) {
      validator.validate({ name: '', employed: true, age: 27 }, function(errors) {
        assert(errors);
        assert(errors.name);
        assert(errors.name[0].rule === 'required');
        done();
      });
    });

    it('should error if no value is set for required boolean field', function(done) {
      validator.validate({ name: 'Frederick P. Frederickson', age: 27 }, function(errors) {
        assert(errors);
        assert(errors.employed);
        assert(errors.employed[0].rule === 'boolean');
        assert(errors.employed[1].rule === 'required');
        done();
      });
    });

    it('should error if no value is set for required boolean field', function(done) {
      validator.validate({ name: 'Frederick P. Frederickson', age: 27 }, function(errors) {
        assert(errors);
        assert(errors.employed);
        assert(errors.employed[0].rule === 'boolean');
        assert(errors.employed[1].rule === 'required');
        done();
      });
    });

    it('should NOT error if all required values are set', function(done) {
      validator.validate({ name: 'Foo Bar', employed: true, age: 27 }, function(errors) {
        assert(!errors);
        done();
      });
    });

    it('should NOT error if required is false and values are valid', function(done) {
      validator.validate({ name: 'Foo Bar', employed: true, email: 'email@example.com' }, function(errors) {
        assert(!errors);
        done();
      });
    });
    
    it('should NOT error if required is false and value is not present', function(done) {
      validator.validate({ name: 'Foo Bar', employed: true }, function(errors) {
        assert(!errors);
        done();
      });
    });
    
    it('should error if required is false and value is invalid', function(done) {
      validator.validate({ name: 'Frederick P. Frederickson', employed: true, email: 'not email' }, function(errors) {
        assert(errors);
        assert(errors.email);
        assert.equal(errors.email[0].rule, 'email');
        done();
      });
    });

  });

});
