var assert = require('assert');
var _ = require('@sailshq/lodash');
var Waterline = require('../../../../lib/waterline');

describe.skip('Type Casting ::', function() {
  describe('with `type: \'ref\'` ::', function() {
    var orm;
    var Person;
    before(function(done) {
      orm = new Waterline();

      orm.registerModel(Waterline.Model.extend({
        identity: 'person',
        datastore: 'foo',
        primaryKey: 'id',
        attributes: {
          id: {
            type: 'number'
          },
          activated: {
            type: 'boolean'
          },
          age: {
            type: 'number'
          },
          name: {
            type: 'string'
          },
          organization: {
            type: 'json'
          },
          avatarBlob: {
            type: 'ref'
          }
        }
      }));

      orm.initialize({
        adapters: {
          foobar: {}
        },
        datastores: {
          foo: { adapter: 'foobar' }
        }
      }, function(err, orm) {
        if (err) { return done(err); }

        Person = orm.collections.person;
        return done();
      });//</.initialize()>

    });//</before>

    it('should not modify ref types (and should return the original reference)', function() {

      var pretendIncomingBlobStream = new (require('stream').Readable)();
      // Note that Waterline also ensures strict equality:
      assert(Person.validate('avatarBlob', pretendIncomingBlobStream) === pretendIncomingBlobStream);
    });

    it('should accept EVEN the wildest nonsense, just like it is, and not change it, not even one little bit', function() {

      var wildNonsense = [ Waterline, assert, _ ];
      wildNonsense.__proto__ = Waterline.prototype;
      wildNonsense.constructor = assert;
      wildNonsense.toJSON = _;
      wildNonsense.toString = Waterline;
      Object.defineProperty(wildNonsense, 'surprise', {
        enumerable: false,
        configurable: false,
        writable: false,
        value: wildNonsense
      });
      Object.freeze(wildNonsense);
      wildNonsense.temperature = -Infinity;
      Object.seal(wildNonsense);
      wildNonsense.numSeals = NaN;
      wildNonsense.numSeaLions = Infinity;

      assert(Person.validate('avatarBlob', wildNonsense) === wildNonsense);
    });

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // For further details on edge case handling, plus thousands more tests, see:
    // • http://npmjs.com/package/rttc
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  });
});
