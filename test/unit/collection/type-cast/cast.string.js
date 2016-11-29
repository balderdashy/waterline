var assert = require('assert');
var _ = require('@sailshq/lodash');
var Waterline = require('../../../../lib/waterline');

describe('Collection Type Casting ::', function() {
  describe('with String type ::', function() {
    var person;

    before(function(done) {
      var waterline = new Waterline();
      var Person = Waterline.Collection.extend({
        identity: 'person',
        connection: 'foo',
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

      waterline.loadCollection(Person);

      var connections = {
        'foo': {
          adapter: 'foobar'
        }
      };

      waterline.initialize({ adapters: { foobar: {} }, connections: connections }, function(err, orm) {
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
