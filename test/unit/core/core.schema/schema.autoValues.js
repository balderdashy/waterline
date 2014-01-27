var Waterline = require('../../../../lib/waterline'),
    assert = require('assert');

describe('Core Schema', function() {

  describe('with custom primary key', function() {
    var person;

    before(function(done) {
      var waterline = new Waterline();

      var Person = Waterline.Collection.extend({
        identity: 'person',
        connection: 'foo',
        attributes: {
          first_name: {
            type: 'string',
            primaryKey: true
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

    it('should pass the primary key down to the adapter', function() {
      assert(person._schema.schema.first_name.primaryKey);
      assert(person._schema.schema.first_name.unique);
      assert(!person._schema.schema.id);
    });
  });

  describe('with autoIncrement key', function() {
    var person;

    before(function(done) {
      var waterline = new Waterline();

      var Person = Waterline.Collection.extend({
        identity: 'person',
        connection: 'foo',
        attributes: {
          count: {
            autoIncrement: true
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

    it('should pass the autoIncrement down to the adapter', function() {
      assert(person._schema.schema.count.autoIncrement);
    });

    it('should set the type to integer', function() {
      assert(person._schema.schema.count.type === 'integer');
    });
  });

  describe('with uniqueness key', function() {
    var person;

    before(function(done) {
      var waterline = new Waterline();

      var Person = Waterline.Collection.extend({
        identity: 'person',
        connection: 'foo',
        attributes: {
          name: {
            type: 'string',
            unique: true
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

    it('should pass the unique key down to the adapter', function() {
      assert(person._schema.schema.name.unique);
    });
  });

  describe('with index key', function() {
    var person;

    before(function(done) {
      var waterline = new Waterline();

      var Person = Waterline.Collection.extend({
        identity: 'person',
        connection: 'foo',
        attributes: {
          name: {
            type: 'string',
            index: true
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

    it('should pass the index key down to the adapter', function() {
      assert(person._schema.schema.name.index);
    });
  });

  describe('with enum key', function() {
    var person;

    before(function(done) {
      var waterline = new Waterline();

      var Person = Waterline.Collection.extend({
        identity: 'person',
        connection: 'foo',
        attributes: {
          sex: {
            type: 'string',
            enum: ['male', 'female']
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

    it('should pass the enum options down to the adapter', function() {
      assert(Array.isArray(person._schema.schema.sex.enum));
      assert(person._schema.schema.sex.enum.length === 2);
    });
  });

});
