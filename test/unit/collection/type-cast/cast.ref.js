var assert = require('assert');
var _ = require('@sailshq/lodash');
var Waterline = require('../../../../lib/waterline');

describe('Collection Type Casting', function() {
  describe('with Ref type', function() {
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
          file: {
            type: 'ref'
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
