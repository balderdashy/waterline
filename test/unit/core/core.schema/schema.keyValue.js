var Waterline = require('../../../../lib/waterline'),
    assert = require('assert');

describe('Core Schema', function() {

  describe('with simple key/value attributes', function() {
    var person;

    before(function(done) {
      var waterline = new Waterline();

      var Person = Waterline.Collection.extend({
        identity: 'person',
        connection: 'foo',
        attributes: {
          first_name: 'STRING',
          last_name: 'STRING'
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
    });

    it('should lowercase attribute types', function() {
      assert(person._schema.schema.first_name.type === 'string');
    });
  });

});
