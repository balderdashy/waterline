var assert = require('assert');
var _ = require('@sailshq/lodash');
var Waterline = require('../../../../lib/waterline');

describe.skip('Collection Type Casting ::', function() {
  describe('with Ref type ::', function() {
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
          file: {
            type: 'ref'
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
        person = orm.collections.person;
        return done();
      });
    });

    it('should not modify ref types', function() {
      var values = {
        file: {
          title: 'hello'
        }
      };

      person._cast(values);

      assert(_.isPlainObject(values.file));
      assert.equal(values.file.title, 'hello');
    });

  });
});
