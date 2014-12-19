var Waterline = require('../../../../lib/waterline'),
    assert = require('assert');

describe('Core Type Casting', function() {
  describe('.run() with Date type', function() {
    var person;

    before(function(done) {
      var waterline = new Waterline();
      var Person = Waterline.Collection.extend({
        identity: 'person',
        connection: 'foo',
        attributes: {
          name: {
            type: 'date'
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

    it('should cast strings to a date', function() {
      var values = person._cast.run({ name: '2013-09-18' });
      assert(values.name.constructor.name === 'Date');
      assert(values.name.toUTCString() === 'Wed, 18 Sep 2013 00:00:00 GMT');
    });

    it('should objects that implement toDate()', function() {
      function Foo() {}
      Foo.prototype.toDate = function () { return new Date(1379462400000); };
      var values = person._cast.run({
        name: new Foo()
      });
      assert(values.name.constructor.name === 'Date');
      assert(values.name.toUTCString() === 'Wed, 18 Sep 2013 00:00:00 GMT');
    });

  });
});
