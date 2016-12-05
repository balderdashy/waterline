var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Model', function() {
  describe('associations Many To Many through', function() {
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
              via: 'person',
              through: 'person_preference'
            }
          }
        });

        var Preference = Waterline.Collection.extend({
          connection: 'my_foo',
          tableName: 'preference',
          attributes: {
            foo: 'string',
            people: {
              collection: 'person',
              via: 'preference',
              through: 'person_preference'
            }
          }
        });

        var UserPreference = Waterline.Collection.extend({
          connection: 'my_foo',
          tableName: 'person_preference',
          attributes: {
            person: {
              model: 'person',
            },
            preference: {
              model: 'preference',
            }
          }
        });


        waterline.loadCollection(User);
        waterline.loadCollection(Preference);
        waterline.loadCollection(UserPreference);

        var _values = [
          { id: 1, preference: [{ foo: 'bar' }, { foo: 'foobar' }] },
          { id: 2, preference: [{ foo: 'a' }, { foo: 'b' }] },
        ];

        var i = 1;

        var adapterDef = {
          find: function(con, col, criteria, cb) {
            if(col === 'person_preference') return cb(null, []);
            cb(null, _values);
          },
          destroy: function(con, col, criteria, cb) {
            if(col === 'person_preference') {
              prefValues.push(criteria.where);
            }
            return cb(null, criteria);
          },
          update: function(con, col, criteria, values, cb) {
            return cb(null, values);
          },
          create: function(con, col, values, cb) {
            prefValues.push(values);
            return cb(null, values);
          },
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

            assert(prefValues[0].person === 1);
            assert(prefValues[0].preference === 1);
            assert(prefValues[1].person === 1);
            assert(prefValues[1].preference === 2);

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
