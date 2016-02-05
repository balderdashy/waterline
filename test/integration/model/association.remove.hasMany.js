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
          connection: 'my_foo',
          tableName: 'person',
          attributes: {
            preferences: {
              collection: 'preference',
              via: 'user'
            }
          }
        });

        var Preference = Waterline.Collection.extend({
          connection: 'my_foo',
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
          find: function(con, col, criteria, cb) { return cb(null, _values); },
          update: function(con, col, criteria, values, cb) {
            if(col === 'preference') {
              prefValues.push({ id: criteria.where.id, values: values });
            }

            return cb(null, values);
          }
        };

        var connections = {
          'my_foo': {
            adapter: 'foobar'
          }
        };

        waterline.initialize({ adapters: { foobar: adapterDef }, connections: connections }, function(err, colls) {
          if(err) done(err);
          collections = colls.collections;
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
            assert(prefValues[0].values.user === null);
            assert(prefValues[1].id === 2);
            assert(prefValues[1].values.user === null);

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
            assert(err.failedTransactions);
            assert(Array.isArray(err.failedTransactions));
            assert(err.failedTransactions.length === 2);
            assert(err.failedTransactions[0].type === 'remove');
            assert(err.failedTransactions[1].type === 'remove');

            done();
          });
        });
      });

    });
  });
});
