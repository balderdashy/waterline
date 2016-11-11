var Waterline = require('../../../../lib/waterline'),
    assert = require('assert');

describe('Core Schema', function() {

  describe('with object attribute', function() {
    var person;

    before(function(done) {
      var waterline = new Waterline();

      var Person = Waterline.Collection.extend({
        identity: 'person',
        connection: 'foo',
        attributes: {
          first_name: { type: 'STRING' },
          last_name: { type: 'STRING' },
          phone: {
            type: 'STRING',
            defaultsTo: '555-555-5555'
          },
          address: {
            type: 'STRING',
            dbType: 'geoString'
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

    it('should set internal schema attributes', function() {
      assert(person._schema.schema.first_name);
      assert(person._schema.schema.last_name);
      assert(person._schema.schema.address);
    });

    it('should lowercase attribute types', function() {
      assert(person._schema.schema.first_name.type === 'string');
    });

    it('should set defaultsTo value', function() {
      assert(person._schema.schema.phone.defaultsTo === '555-555-5555');
    });
    
    it('should lowercase attribute dbType', function() {
      assert.equal(person._schema.schema.address.dbType, 'geostring');
    });
  });

  describe('with special key object attribute', function() {
    var person;

    before(function(done) {
      var waterline = new Waterline();

      var Person = Waterline.Collection.extend({
        identity: 'person',
        connection: 'foo',
        attributes: {
          first_name: { type: 'STRING' },
          last_name: { type: 'STRING' },
          type: { 
            type: 'STRING',
            columnName: 'person_type'
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

    it('should set type to attributes', function() {
      assert(person._schema.schema.first_name.type);
    });
  });

});
