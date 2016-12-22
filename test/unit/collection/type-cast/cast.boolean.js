var assert = require('assert');
var _ = require('@sailshq/lodash');
var Waterline = require('../../../../lib/waterline');

describe.skip('Collection Type Casting ::', function() {
  describe('with Boolean type ::', function() {
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
          activated: {
            type: 'boolean'
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

    it('should cast string "true" to a boolean', function() {
      var values = { activated: 'true' };
      person._cast(values);
      assert.equal(values.activated, true);
    });

    it('should cast string "false" to a boolean', function() {
      var values = { activated: 'false' };
      person._cast(values);
      assert.equal(values.activated, false);
    });

    it('should cast number 0 to a boolean', function() {
      var values = { activated: 0 };
      person._cast(values);
      assert.equal(values.activated, false);
    });

    it('should cast number 1 to a boolean', function() {
      var values = { activated: 1 };
      person._cast(values);
      assert.equal(values.activated, true);
    });

    it('should throw when a value can\'t be cast', function() {
      var values = { activated: 'not yet' };
      assert.throws(function() {
        person._cast(values);
      });
    });

  });
});
