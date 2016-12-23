var assert = require('assert');
var _ = require('@sailshq/lodash');
var Waterline = require('../../../../lib/waterline');

describe('Collection Type Casting ::', function() {
  describe('with Boolean type ::', function() {
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
        Person = orm.collections.person;
        return done();
      });
    });


    it('should act as no-op when given a boolean', function() {
      assert.equal(Person.validate('activated', true), true);
      assert.equal(Person.validate('activated', false), false);
    });

    it('should cast string "true" to a boolean', function() {
      assert.equal(Person.validate('activated', 'true'), true);
    });

    it('should cast string "false" to a boolean', function() {
      // FUTURE: this may change in a future major version release of RTTC
      // (this test is here to help catch that when/if it happens)
      assert.equal(Person.validate('activated', 'false'), false);
    });

    it('should cast number 0 to a boolean', function() {
      // FUTURE: this may change in a future major version release of RTTC
      // (this test is here to help catch that when/if it happens)
      assert.equal(Person.validate('activated', 0), false);
    });

    it('should cast number 1 to a boolean', function() {
      assert.equal(Person.validate('activated', 1), true);
    });

    it('should throw when a value can\'t be cast', function() {
      try {
        Person.validate('activated', 'not yet');
      } catch (e) {
        switch (e.code) {
          case 'E_VALIDATION': return;
          default: throw e;
        }
      }
    });

  });
});
