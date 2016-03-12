var Validator = require('../../../lib/waterline/core/validations'),
    assert = require('assert');

describe('validations', function() {

  describe('lengths', function() {
    var validator;

    before(function() {

      var validations = {
        firstName: {
          type: 'string',
          minLength: 2
        },
        lastName: {
          type: 'string',
          maxLength: 5
        }
      };

      validator = new Validator();
      validator.initialize(validations);
    });

    describe('minLength', function() {

      it('should validate minLength', function (done) {
        validator.validate({ firstName: 'foo' }, function (err, validationErrors) {
          if (err) { return done(err); }
          try {
            assert(!validationErrors);
            return done();
          }
          catch (e) {return done(e);}
        });
      });

      it('should error if length is shorter', function(done) {
        validator.validate({ firstName: 'f' }, function (err, validationErrors) {
          if (err) { return done(err); }
          try {
            assert(validationErrors);
            assert(validationErrors.firstName);
            return done();
          }
          catch (e) {return done(e);}
        });
      });
    });

    describe('maxLength', function() {

      it('should validate maxLength', function(done) {
        validator.validate({ lastName: 'foo' }, function (err, validationErrors) {
          if (err) { return done(err); }
          try {
            assert(!validationErrors);
            return done();
          }
            catch (e) {return done(e);}
        });
      });

      it('should error if length is longer', function(done) {
        validator.validate({ lastName: 'foobar' }, function (err, validationErrors) {
          if (err) { return done(err); }
          try {
            assert(validationErrors);
            assert(validationErrors.lastName);
            return done();
          }
          catch (e) {return done(e);}
        });
      });
    });

  });
});
