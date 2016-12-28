var assert = require('assert');
var _ = require('@sailshq/lodash');
var Waterline = require('../../../../lib/waterline');

describe.skip('Type Casting ::', function() {
  describe('with `type: \'boolean\'` ::', function() {

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

    it('should throw E_VALIDATION error when a value can\'t be cast', function() {
      try {
        Person.validate('activated', 'not yet');
      } catch (e) {
        switch (e.code) {
          case 'E_VALIDATION':
            // FUTURE: maybe expand test to check more things
            return;

          // As of Thu Dec 22, 2016, this test is failing because
          // validation is not being completely rolled up yet.
          default: throw new Error('The actual error code was "'+e.code+'" - but it should have been "E_VALIDATION": the rolled-up validation error.  This is so that errors from the public `.validate()` are consistent with errors exposed when creating or updating records (i.e. when multiple values are being set at the same time.)  Here is the error that was actually received:\n```\n' +e.stack+'\n```');
        }
      }
    });

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // For further details on edge case handling, plus thousands more tests, see:
    // • http://npmjs.com/package/rttc
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  });//</describe>
});//</describe>
