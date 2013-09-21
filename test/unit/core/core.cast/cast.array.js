var Waterline = require('../../../../lib/waterline'),
    assert = require('assert');

describe('Core Type Casting', function() {
  describe('.run() with Array type', function() {
    var person;

    before(function(done) {
      var waterline = new Waterline();
      var Person = Waterline.Collection.extend({
        identity: 'person',
        attributes: {
          name: {
            type: 'array'
          }
        }
      });

      waterline.loadCollection(Person);
      waterline.initialize({ adapters: { }}, function(err, colls) {
        if(err) return done(err);
        person = colls.person;
        done();
      });
    });

    it('should cast values to an array', function() {
      var values = person._cast.run({ name: 'foo' });
      assert(Array.isArray(values.name));
      assert(values.name.length === 1);
    });

  });
});
