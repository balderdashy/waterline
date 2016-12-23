var assert = require('assert');
var _ = require('@sailshq/lodash');
var Waterline = require('../../../../lib/waterline');

describe.skip('Collection Type Casting ::', function() {
  describe('with String type ::', function() {
    var person;

    before(function(done) {
      var waterline = new Waterline();
      var Person = Waterline.Model.extend({
        identity: 'person',
        datastore: 'foo',
        primaryKey: 'id',
        attributes: {
          id: {
            type: 'number'
          },
          name: {
            type: 'string'
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
        if(err) {
          return done(err);
        }
        person = orm.collections.person;
        done();
      });
    });

    it('should cast numbers to strings', function() {
      var values = { name: 27 };
      person._cast(values);

      assert(_.isString(values.name));
      assert.equal(values.name, '27');
    });

  });
});
