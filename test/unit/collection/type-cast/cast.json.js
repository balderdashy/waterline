var assert = require('assert');
var _ = require('@sailshq/lodash');
var Waterline = require('../../../../lib/waterline');

describe.skip('Collection Type Casting ::', function() {

  describe('with JSON type ::', function() {
    var Person;

    before(function(done) {
      var waterline = new Waterline();
      var Person = Waterline.Collection.extend({
        identity: 'person',
        datastore: 'foo',
        primaryKey: 'id',
        attributes: {
          id: {
            type: 'number'
          },
          organization: {
            type: 'json'
          }
        }
      });

      waterline.registerModel(Person);

      var datastores = {
        'foo': {
          adapter: 'foobar'
        }
      };

      waterline.initialize({ adapters: { foobar: {} }, datastores: datastores }, function(err, orm) {
        if (err) {
          return done(err);
        }

        Person = orm.collections.person;
        return done();
      });
    });

    it('should ensure values are JSON stringified', function() {
      var ORIGINAL = '{ name: \'Foo Bar\', location: [-31.0123, 31.0123] }';
      var result = Person.validate('organization', ORIGINAL);
      assert(_.isString(result));
      assert.equal(ORIGINAL, result);
    });

  });
});
