var Waterline = require('../../../../lib/waterline'),
    assert = require('assert');

describe('Core Type Casting', function() {
  describe('.run() with Integer type', function() {
    var person;

    before(function(done) {
      var waterline = new Waterline();
      var Person = Waterline.Collection.extend({
        identity: 'person',
        connection: 'foo',
        attributes: {
          id: {
            type: 'integer'
          },
          name: {
            type: 'integer'
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

    it('should cast strings to numbers', function() {
      var values = person._cast.run({ name: '27' });
      assert(typeof values.name === 'number');
      assert(values.name === 27);
    });

    it('should not try and cast mongo ID\'s when an id property is used', function() {
      var values = person._cast.run({ id: '51f88ddc5d7967808b000002' });
      assert(typeof values.id === 'string');
      assert(values.id === '51f88ddc5d7967808b000002');
    });

    it('should not try and cast mongo ID\'s when value matches a mongo string', function() {
      var values = person._cast.run({ name: '51f88ddc5d7967808b000002' });
      assert(typeof values.name === 'string');
      assert(values.name === '51f88ddc5d7967808b000002');
    });

  });
});
