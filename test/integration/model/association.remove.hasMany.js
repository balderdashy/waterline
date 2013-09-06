var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Model', function() {
  describe('associations hasMany', function() {
    describe('.remove()', function() {

      /////////////////////////////////////////////////////
      // TEST SETUP
      ////////////////////////////////////////////////////

      var collections = {};
      var prefValues = [];

      before(function(done) {
        var waterline = new Waterline();

        var User = Waterline.Collection.extend({
          adapter: 'foo',
          tableName: 'person',
          attributes: {
            preferences: {
              collection: 'preference'
            }
          }
        });

        var Preference = Waterline.Collection.extend({
          adapter: 'foo',
          tableName: 'preference',
          attributes: {
            foo: 'string',
            user: {
              model: 'person'
            }
          }
        });

        waterline.loadCollection(User);
        waterline.loadCollection(Preference);

        var _values = [
          { id: 1, preference: [{ foo: 'bar' }, { foo: 'foobar' }] },
          { id: 2, preference: [{ foo: 'a' }, { foo: 'b' }] },
        ];

        var adapterDef = {
          find: function(col, criteria, cb) { return cb(null, _values); },
          update: function(col, criteria, values, cb) {
            if(col === 'preference') {
              prefValues.push({ id: criteria.where.id, values: values });
            }

            return cb(null, values);
          }
        };

        waterline.initialize({ adapters: { foo: adapterDef }}, function(err, colls) {
          if(err) done(err);
          collections = colls;
          done();
        });
      });


      /////////////////////////////////////////////////////
      // TEST METHODS
      ////////////////////////////////////////////////////

      it('should pass foreign key values to update method for each relationship', function(done) {
        collections.person.find().exec(function(err, models) {
          if(err) return done(err);

          var person = models[0];

          person.preferences.remove(1);
          person.preferences.remove(2);

          person.save(function(err) {
            if(err) return done(err);

            assert(prefValues.length === 2);
            assert(prefValues[0].id === 1);
            assert(prefValues[0].values.person_id === null);
            assert(prefValues[1].id === 2);
            assert(prefValues[1].values.person_id === null);

            done();
          });
        });
      });

      it('should error with a failed transaction when an object is used', function(done) {
        collections.person.find().exec(function(err, models) {
          if(err) return done(err);

          var person = models[0];

          person.preferences.remove({ foo: 'foo' });
          person.preferences.remove({ foo: 'bar' });

          person.save(function(err) {
            assert(err);
            assert(Array.isArray(err));
            assert(err.length === 2);
            assert(err[0].type === 'remove');
            assert(err[1].type === 'remove');

            done();
          });
        });
      });

    });
  });
});
