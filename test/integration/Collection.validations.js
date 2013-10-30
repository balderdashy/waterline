var Waterline = require('../../lib/waterline'),
    assert = require('assert');

describe('Waterline Collection', function() {

  describe('validations', function() {
    var User;

    before(function(done) {

      // Extend for testing purposes
      var Model = Waterline.Collection.extend({
        identity: 'user',
        adapter: 'foo',
        types: {
          password: function(val) {
            return val === this.passwordConfirmation;
          }
        },
        attributes: {
          name: {
            type: 'string',
            required: true
          },

          email: {
            type: 'email'
          },

          sex: {
            type: 'string',
            enum: ['male', 'female']
          },

          username: {
            type: 'string',
            contains: function() {
              return this.name;
            }
          },

          password: {
            type: 'password'
          }
        }
      });

      // Fixture Adapter Def
      var adapterDef = { create: function(col, values, cb) { return cb(null, values); }};
      new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
        if(err) done(err);
        User = coll;
        done();
      });
    });

    it('should work with valid data', function(done) {
      User.create({ name: 'foo bar', email: 'foobar@gmail.com'}, function(err, user) {
        assert(!err);
        done();
      });
    });

    it('should error with invalid data', function(done) {
      User.create({ name: '', email: 'foobar@gmail.com'}, function(err, user) {
        assert(!user);
        assert(err.ValidationError);
        assert(err.ValidationError.name[0].rule === 'required');
        done();
      });
    });

    it('should support valid enums on strings', function(done) {
      User.create({ name: 'foo', sex: 'male' }, function(err, user) {
        assert(!err);
        assert(user.sex === 'male');
        done();
      });
    });

    it('should error with invalid enums on strings', function(done) {
      User.create({ name: 'foo', sex: 'other' }, function(err, user) {
        assert(!user);
        assert(err.ValidationError);
        assert(err.ValidationError.sex[0].rule === 'in');
        done();
      });
    });

    it('should work with valid username', function(done) {
      User.create({ name: 'foo', username: 'foozball_dude' }, function(err, user) {
        assert(!err);
        done();
      });
    });

    it('should error with invalid username', function(done) {
      User.create({ name: 'foo', username: 'baseball_dude' }, function(err, user) {
        assert(!user);
        assert(err.ValidationError);
        assert(err.ValidationError.username[0].rule === 'contains');
        done();
      });
    });

    it('should support custom type functions with the model\'s context', function(done) {
      User.create({ name: 'foo', sex: 'male', password: 'passW0rd', passwordConfirmation: 'passW0rd' }, function(err, user) {
        assert(!err);
        done();
      });
    });

    it('should error with invalid input for custom type', function(done) {
      User.create({ name: 'foo', sex: 'male', password: 'passW0rd' }, function(err, user) {
        assert(!user);
        assert(err.ValidationError);
        assert(err.ValidationError.password[0].rule === 'password');
        done();
      });
    });

  });
});
