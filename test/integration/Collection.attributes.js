var Waterline = require('../../lib/waterline'),
    assert = require('assert');

describe('Waterline Collection', function() {

  describe('basic fixture', function() {
    var Model = require('./fixtures/model.fixture'),
        User;

    before(function(done) {
      new Model(function(err, collection) {
        if(err) return done(err);
        User = collection;
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
      var User;

      before(function(done) {
        var Model = Waterline.Collection.extend({
          tableName: 'lowercaseType',
          attributes: {
            name: 'string'
          }
        });

        new Model(function(err, collection) {
          if(err) return done(err);
          User = collection;
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
      var User;

      before(function(done) {
        var Model = Waterline.Collection.extend({
          tableName: 'uppercaseType',
          attributes: {
            name: 'STRING'
          }
        });

        new Model(function(err, collection) {
          if(err) return done(err);
          User = collection;
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
