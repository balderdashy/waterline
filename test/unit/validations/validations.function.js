var Validator = require('../../../lib/waterline/core/validations'),
    assert = require('assert');

describe('validations', function() {

  describe('with a function as the rule value', function() {
    var validator;

    before(function() {

      var validations = {
        name: {
          type: 'string',
        },
        username: {
          type: 'string',
          equals: function() {
            return this.name.toLowerCase();
          }
        },
        website: {
          type: 'string',
          contains: function(cb) {
            setTimeout(function() {
              return cb('http://')
            },1);
          }
        }
      };

      validator = new Validator();
      validator.initialize(validations);
    });

    it('should error if invalid username is set', function(done) {
      validator.validate({ name: 'Bob', username: 'bobby' }, function(errors) {
        assert(errors.ValidationError);
        assert(errors.ValidationError.username);
        assert(errors.ValidationError.username[0].rule === 'equals');
        done();
      });
    });

    it('should NOT error if valid username is set', function(done) {
      validator.validate({ name: 'Bob', username: 'bob' }, function(errors) {
        assert(!errors);
        done();
      });
    });

    it('should error if invalid website is set', function(done) {
      validator.validate({ website: 'www.google.com' }, function(errors) {
        assert(errors.ValidationError);
        assert(errors.ValidationError.website);
        assert(errors.ValidationError.website[0].rule === 'contains');
        done();
      });
    });

    it('should NOT error if valid website is set', function(done) {
      validator.validate({ website: 'http://www.google.com' }, function(errors) {
        assert(!errors);
        done();
      });
    });
  });

});
