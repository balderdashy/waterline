var Waterline = require('../../../../lib/waterline'),
    assert = require('assert');

describe('Core Type Casting', function() {
  describe('.run() with Date type', function() {
    var person;

    before(function(done) {
      var waterline = new Waterline();
      var Person = Waterline.Collection.extend({
        identity: 'person',
        attributes: {
          name: {
            type: 'date'
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

    it('should cast strings to a date', function() {
      var values = person._cast.run({ name: '2013-09-18' });
      assert(values.name.constructor.name === 'Date');
      assert(values.name.toUTCString() === 'Wed, 18 Sep 2013 00:00:00 GMT');
    });

  });
});
