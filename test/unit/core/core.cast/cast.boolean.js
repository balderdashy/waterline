var Waterline = require('../../../../lib/waterline'),
    assert = require('assert');

describe('Core Type Casting', function() {
  describe('.run() with Boolean type', function() {
    var person;

    before(function(done) {
      var waterline = new Waterline();
      var Person = Waterline.Collection.extend({
        identity: 'person',
        connection: 'foo',
        attributes: {
          name: {
            type: 'boolean'
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

    it('should cast string "true" to a boolean', function() {
      var values = person._cast.run({ name: 'true' });
      assert(values.name === true);
    });

    it('should cast string "false" to a boolean', function() {
      var values = person._cast.run({ name: 'false' });
      assert(values.name === false);
    });

    it('should not cast bad values', function() {
      var values = person._cast.run({ name: 'foo' });
      assert(values.name === 'foo');
    });

    it('should cast integer 0 to a boolean', function() {
      var values = person._cast.run({ name: 0 });
      assert(values.name === false);
    });

    it('should cast integer 1 to a boolean', function() {
      var values = person._cast.run({ name: 1 });
      assert(values.name === true);
    });

  });
});
