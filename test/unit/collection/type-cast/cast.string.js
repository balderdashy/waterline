var assert = require('assert');
var _ = require('@sailshq/lodash');
var Waterline = require('../../../../lib/waterline');

describe('Collection Type Casting ::', function() {
  describe('with String type ::', function() {

    var Person;
    var orm;
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
          name: {
            type: 'string'
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


    it('should cast numbers to strings', function() {
      assert.equal(Person.validate('name', 27), '27');
    });


    it('should throw E_VALIDATION error when a value can\'t be cast', function() {
      try {
        Person.validate('name', null);
      } catch (e) {
        switch (e.code) {
          case 'E_VALIDATION':
            // TODO: check more things
            return;

          // As of Thu Dec 22, 2016, this test is failing because
          // validation is not being completely rolled up yet.
          default: throw new Error('The actual error code was "'+e.code+'" - but it should have been "E_VALIDATION": the rolled-up validation error.  This is so that errors from the public `.validate()` are consistent with errors exposed when creating or updating records (i.e. when multiple values are being set at the same time.)  Here is the error that was actually received:\n```\n' +e.stack+'\n```');
        }
      }
    });

  });
});
