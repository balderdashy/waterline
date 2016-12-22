var assert = require('assert');
var _ = require('@sailshq/lodash');
var Waterline = require('../../../../lib/waterline');

describe.skip('Collection Type Casting ::', function() {
  describe('with JSON type ::', function() {
    var person;

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

      waterline.loadCollection(Person);

      var datastores = {
        'foo': {
          adapter: 'foobar'
        }
      };

      waterline.initialize({ adapters: { foobar: {} }, datastores: datastores }, function(err, orm) {
        if (err) {
          return done(err);
        }

        person = orm.collections.person;
        return done();
      });
    });

    it('should ensure values are JSON stringified', function() {
      var values = {
        organization: "{ name: 'Foo Bar', location: [-31.0123, 31.0123] }"
      };

      person._cast(values);
      assert(_.isString(values.organization));
    });

  });
});
