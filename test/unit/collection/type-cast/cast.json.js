var assert = require('assert');
var _ = require('@sailshq/lodash');
var Waterline = require('../../../../lib/waterline');

describe.skip('Type Casting ::', function() {
  describe('with `type: \'json\'` ::', function() {

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


    it('should leave the null literal as-is', function() {
      assert.equal(Person.validate('organization', null), null);
    });

    it('should leave numbers as-is', function() {
      assert.equal(Person.validate('organization', 4), 4);
      assert.equal(Person.validate('organization', 0), 0);
      assert.equal(Person.validate('organization', -10000.32852), -10000.32852);
    });

    it('should leave booleans as-is', function() {
      assert.equal(Person.validate('organization', true), true);
      assert.equal(Person.validate('organization', false), false);
    });

    describe('given a string imposter (i.e. looks like another type)', function() {

      it('should leave "null" imposter string as-is', function (){
        assert.equal(Person.validate('organization', 'null'), 'null');
      });
      it('should leave number imposter strings as-is', function (){
        assert.equal(Person.validate('organization', '4'), '4');
        assert.equal(Person.validate('organization', '0'), '0');
        assert.equal(Person.validate('organization', '-10000.32852'), '-10000.32852');
      });
      it('should leave boolean imposter strings as-is', function (){
        assert.equal(Person.validate('organization', 'true'), 'true');
        assert.equal(Person.validate('organization', 'false'), 'false');
      });
      it('should leave dictionary imposter strings as-is', function (){
        var DICTIONARY_IMPOSTER_STR = '{ name: \'Foo Bar\', location: [-31.0123, 31.0123] }';
        var result = Person.validate('organization', '{ name: \'Foo Bar\', location: [-31.0123, 31.0123] }');
        assert(_.isString(result));
        assert.equal(DICTIONARY_IMPOSTER_STR, result);
      });

    });

    it('should decycle circular nonsense', function(){
      var cersei = {};
      var jaime = {};
      cersei.brother = jaime;
      cersei.lover = jaime;
      jaime.sister = cersei;
      jaime.lover = cersei;

      var dryJaime = Person.validate('organization', jaime);
      assert.deepEqual(dryJaime, {
        sister: { brother: '[Circular ~]', lover: '[Circular ~]' },
        lover: { brother: '[Circular ~]', lover: '[Circular ~]' }
      });

      var dryCersei = Person.validate('organization', cersei);
      assert.deepEqual(dryCersei, {
        brother: { sister: '[Circular ~]', lover: '[Circular ~]' },
        lover: { sister: '[Circular ~]', lover: '[Circular ~]' }
      });

    });

    it('should reject Readable streams', function(){
      try {
        Person.validate('organization', new (require('stream').Readable)());
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


  });
});
