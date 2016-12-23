var assert = require('assert');
var _ = require('@sailshq/lodash');
var Waterline = require('../../../../lib/waterline');

describe.skip('Collection Type Casting ::', function() {
  describe('with Number type ::', function() {
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
          age: {
            type: 'number'
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

    it('should cast strings to numbers when integers', function() {
      var values = { age: '27' };
      person._cast(values);
      assert(_.isNumber(values.age));
      assert.equal(values.age, 27);
    });

    it('should cast strings to numbers when floats', function() {
      var values = { age: '27.01' };
      person._cast(values);
      assert(_.isNumber(values.age));
      assert.equal(values.age, 27.01);
    });

    it('should throw when a number can\'t be cast', function() {
      var values = { age: 'steve' };
      assert.throws(function() {
        person._cast(values);
      });
    });

    it.skip('should not try and cast mongo ID\'s when an id property is used', function() {
      var values = { age: '51f88ddc5d7967808b000002' };
      person._cast(values);
      assert(_.isString(values.age));
      assert.equal(values.age, '51f88ddc5d7967808b000002');
    });

    it.skip('should not try and cast mongo ID\'s when value matches a mongo string', function() {
      var values = { age: '51f88ddc5d7967808b000002' };
      person._cast(values);
      assert(_.isString(values.age));
      assert.equal(values.age, '51f88ddc5d7967808b000002');
    });

  });
});
