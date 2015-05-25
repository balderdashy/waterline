var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Core Validator', function() {

  describe('.build() with model attributes', function() {
    var person;

    before(function(done) {
      var waterline = new Waterline();

      var Person = Waterline.Collection.extend({
        identity: 'person',
        connection: 'foo',
        attributes: {
          first_name: {
            type: 'string',
            length: { min: 2, max: 5 }
          },
          last_name: {
            type: 'string',
            required: true,
            defaultsTo: 'Smith'
          }
        }
      });

      waterline.loadCollection(Person);

      var connections = {
        'foo': {
          adapter: 'foobar'
        }
      };

      waterline.initialize({ adapters: { foobar: {} }, connections: connections }, function(err, colls) {
        if(err) return done(err);
        person = colls.collections.person;
        done();
      });
    });


    it('should build a validation object', function() {
      var validations = person._validator.validations;

      assert(validations.first_name);
      assert(validations.first_name.type === 'string');
      assert(Object.keys(validations.first_name.length).length === 2);
      assert(validations.first_name.length.min === 2);
      assert(validations.first_name.length.max === 5);

      assert(validations.last_name);
      assert(validations.last_name.type === 'string');
      assert(validations.last_name.required === true);
    });

    it('should ignore schema properties', function() {
      assert(!person._validator.validations.last_name.defaultsTo);
    });

  });


  describe('.validate()', function() {
    var person;

    before(function(done) {
      var waterline = new Waterline();

      var Person = Waterline.Collection.extend({
        identity: 'person',
        connection: 'foo',
        attributes: {
          first_name: {
            type: 'string',
            min: 2,
            max: 5
          },
          last_name: {
            type: 'string',
            required: true,
            defaultsTo: 'Smith'
          },
          city: {
            type: 'string',
            maxLength: 7
          }
        }
      });

      waterline.loadCollection(Person);

      var connections = {
        'foo': {
          adapter: 'foobar'
        }
      };

      waterline.initialize({ adapters: { foobar: {} }, connections: connections }, function(err, colls) {
        if(err) return done(err);
        person = colls.collections.person;
        done();
      });
    });


    it('should validate types', function(done) {
      person._validator.validate({ first_name: 27, last_name: 32 }, function(err) {
        assert(err);
        assert(err.first_name);
        assert(err.last_name);
        assert(err.first_name[0].rule === 'string');
        assert(err.last_name[0].rule === 'string');
        done();
      });
    });

    it('should validate required status', function(done) {
      person._validator.validate({ first_name: 'foo' }, function(err) {
        assert(err);
        assert(err);
        assert(err.last_name);
        assert(err.last_name[1].rule === 'required');
        done();
      });
    });

    it('should validate all fields with presentOnly omitted or set to false', function(done) {
      person._validator.validate({ city: 'Washington' }, function(err) {
        assert(err);
        assert(!err.first_name);
        assert(err.last_name);
        assert(err.last_name[0].rule === 'string');
        assert(err.city);
        assert(err.city[0].rule === 'maxLength');

        person._validator.validate({ city: 'Washington' }, false, function(err) {
          assert(err);
          assert(!err.first_name);
          assert(err.last_name);
          assert(err.last_name[0].rule === 'string');
          assert(err.city);
          assert(err.city[0].rule === 'maxLength');
          done();
        });
      });
    });

    it('should, for presentOnly === true, validate present values only, thus not need the required last_name', function(done) {
      person._validator.validate({ first_name: 'foo' }, true, function(err) {
        assert(!err);
        done();
      });
    });

    it('should validate only the specified value', function(done) {
      person._validator.validate({ first_name: 'foo', last_name: 32, city: 'Washington' },
        'first_name', function(err) {
          assert(!err);

          person._validator.validate({ first_name: 'foo', last_name: 32, city: 'Washington' },
            'last_name', function(err) {
              assert(err);
              assert(err.last_name);
              assert(err.last_name[0].rule === 'string');
              assert(!err.city);
              done();
            });
        });
    });

    it('should validate only the specified values', function(done) {
      person._validator.validate({ first_name: 'foo', last_name: 32, city: 'Atlanta' },
        ['first_name', 'city'], function(err) {
          assert(!err);

          person._validator.validate({ first_name: 'foo', last_name: 32, city: 'Washington' },
            ['first_name', 'city'], function(err) {
              assert(err);
              assert(!err.first_name);
              assert(!err.last_name);
              assert(err.city);
              assert(err.city[0].rule === 'maxLength');
              done();
            });
        });
    });

  });
});
