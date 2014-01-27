var Waterline = require('../../../../lib/waterline'),
    assert = require('assert');

describe('Core Type Casting', function() {
  describe('.run() with Float type', function() {
    var person;

    before(function(done) {
      var waterline = new Waterline();
      var Person = Waterline.Collection.extend({
        identity: 'person',
        connection: 'foo',
        attributes: {
          name: {
            type: 'float'
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
      var values = person._cast.run({ name: '27.01' });
      assert(typeof values.name === 'number');
      assert(values.name === 27.01);
    });

  });
});
