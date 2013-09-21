var Waterline = require('../../../../lib/waterline'),
    assert = require('assert');

describe('Core Type Casting', function() {
  describe('.run() with JSON type', function() {
    var person;

    before(function(done) {
      var waterline = new Waterline();
      var Person = Waterline.Collection.extend({
        identity: 'person',
        attributes: {
          name: {
            type: 'json'
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

    it('should cast values to a stringified JSON version', function() {
      var values = person._cast.run({ name: { foo: 'foo', bar: 'bar' } });
      assert(values.name === '{"foo":"foo","bar":"bar"}');
    });

  });
});
