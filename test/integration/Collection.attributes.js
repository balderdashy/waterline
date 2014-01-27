var Waterline = require('../../lib/waterline'),
    assert = require('assert');

describe('Waterline Collection', function() {

  describe('basic fixture', function() {
    var waterline = new Waterline(),
        Model = require('./fixtures/model.fixture'),
        User;

    before(function(done) {
      waterline.loadCollection(Model);

      var connections = {
        'my_foo': {
          adapter: 'foobar'
        }
      };

      waterline.initialize({ adapters: { foobar: {} }, connections: connections }, function(err, colls) {
        if(err) return done(err);
        User = colls.collections.test;
        done();
      });
    });

    describe('schema', function() {

      it('should create an internal schema from the attributes', function() {
        assert(typeof User._schema.schema === 'object');
        assert(Object.keys(User._schema.schema).length === 8); // account for auto created keys (pk, timestamps)
      });

      // TO-DO
      // Check all schema properties from Sails work

    });

    describe('validations', function() {

      it('should create an internal validation object from the attributes', function() {
        assert(typeof User._validator.validations === 'object');
        assert(Object.keys(User._validator.validations).length === 5);
      });

      // TO-DO
      // Validate properties using Anchor with the Validator in waterline

    });

  });

  describe('custom fixtures', function() {

    describe('lowercase type', function() {
      var waterline = new Waterline(),
          User;

      before(function(done) {
        var Model = Waterline.Collection.extend({
          tableName: 'lowercaseType',
          connection: 'my_foo',
          attributes: {
            name: 'string'
          }
        });

        waterline.loadCollection(Model);

        var connections = {
          'my_foo': {
            adapter: 'foobar'
          }
        };

        waterline.initialize({ adapters: { foobar: {} }, connections: connections }, function(err, colls) {
          if(err) return done(err);
          User = colls.collections.lowercasetype;
          done();
        });
      });

      it('should set the proper schema type', function() {
        assert(User._schema.schema.name.type === 'string');
      });

      it('should set the proper validation type', function() {
        assert(User._validator.validations.name.type === 'string');
      });
    });

    describe('uppercase type', function() {
      var waterline = new Waterline(),
          User;

      before(function(done) {
        var Model = Waterline.Collection.extend({
          tableName: 'uppercaseType',
          connection: 'my_foo',
          attributes: {
            name: 'STRING'
          }
        });

        waterline.loadCollection(Model);

        var connections = {
          'my_foo': {
            adapter: 'foobar'
          }
        };

        waterline.initialize({ adapters: { foobar: {} }, connections: connections }, function(err, colls) {
          if(err) return done(err);
          User = colls.collections.uppercasetype;
          done();
        });
      });

      it('should set the proper schema', function() {
        assert(User._schema.schema.name.type === 'string');
      });

      it('should set the proper validation type', function() {
        assert(User._validator.validations.name.type === 'string');
      });
    });

  });

});
