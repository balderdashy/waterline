var Waterline = require('../../lib/waterline'),
    assert = require('assert');

describe('Waterline Collection', function() {

  describe('validations', function() {
    var waterline = new Waterline(),
        User;

    before(function(done) {

      // Extend for testing purposes
      var Model = Waterline.Collection.extend({
        identity: 'user',
        connection: 'my_foo',
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
          },
          
          age: {
            type: 'integer',
            dbType: 'customDbType'
          },
          
          address: {
            type: 'string',
            dbType: 'geoString'
          }
        }
      });

      waterline.loadCollection(Model);

      var connections = {
        'my_foo': {
          adapter: 'foobar'
        }
      };

      // Fixture Adapter Def
      var adapterDef = { 
        create: function(con, col, values, cb) { return cb(null, values); },
        types: { customdbtype: function(val){ return !isNaN(val) && val > 0; } }
      };
      waterline.initialize({ adapters: { foobar: adapterDef }, connections: connections }, function(err, colls) {
        if(err) done(err);
        User = colls.collections.user;
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
    
    it('should support adapter custom type with valid age', function(done) {
      User.create({ name: 'foo', sex: 'male', age: 10 }, function(err, user) {
        assert(!err, err);
        done();
      });
    });

    it('should error with invalid input for adapter custom type', function(done) {
      User.create({ name: 'foo', sex: 'male', age: -5 }, function(err, user) {
        assert(!user);
        assert(err.ValidationError);
        assert.equal(err.ValidationError.age[0].rule, 'customdbtype');
        done();
      });
    });
    
    it('should support dbType even if adapter doesn\'t have a validation rule for it', function(done) {
      User.create({ name: 'foo', sex: 'male', address: 'N 30° 19\' 7.14"' }, function(err, user) {
        assert(!err, err);
        done();
      });
    });

  });
});
